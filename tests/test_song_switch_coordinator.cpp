// #187 and #220: how setlist selection drives song audio, tested through
// SongSwitchCoordinator (the wiring that used to live in main.cpp).
//
// #187: the song after the current one is decoded on the engine's worker thread as soon
//       as the current song is up, and advancing only switches. Nothing decodes on the
//       UI thread, and only the newest request wins.
// #220: opening a service order always cues its first song stopped at 0 (#202), even
//       while a song from the previous order is playing.
#include "AudioMixerViewModel.hpp"
#include "SetlistViewModel.hpp"
#include "SongSwitchCoordinator.hpp"

#include <QCoreApplication>
#include <QElapsedTimer>

#include <condition_variable>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <mutex>
#include <stdexcept>
#include <string>
#include <thread>
#include <utility>
#include <vector>

using namespace HarmonySync::ViewModels;
namespace fs = std::filesystem;

namespace {

void check(bool ok, const std::string& what) {
    if (!ok) throw std::runtime_error(what);
}

// A service order folder: root/0N_Song_<name>/<name>_Drums.wav for each song.
fs::path makeServiceOrder(const std::string& tag, const std::vector<std::string>& songs) {
    fs::path root = fs::temp_directory_path() / ("hs_song_switch_" + tag);
    fs::remove_all(root);
    for (std::size_t i = 0; i < songs.size(); ++i) {
        fs::path song = root / ("0" + std::to_string(i + 1) + "_Song_" + songs[i]);
        fs::create_directories(song);
        std::ofstream(song / (songs[i] + "_Drums.wav")) << "RIFF....WAVEfmt ";
    }
    return root;
}

bool openOrder(SetlistViewModel& setlist, const fs::path& root) {
    return setlist.openServiceOrderRootFolder(QString::fromStdString(root.string()));
}

std::string currentStem(AudioMixerViewModel& mixer) {
    return mixer.loadedStemCount() > 0 ? mixer.stemName(0).toStdString() : std::string("<none>");
}

std::string stemOfSong(SetlistViewModel& setlist, int index) {
    auto stems = setlist.stemsAt(index);
    return stems.empty() ? std::string("<none>") : stems.front().name();
}

void runEvents(int ms) {
    QElapsedTimer timer;
    timer.start();
    while (timer.elapsed() < ms) {
        QCoreApplication::processEvents(QEventLoop::AllEvents, 10);
    }
}

bool waitFor(const std::function<bool()>& done, int ms) {
    QElapsedTimer timer;
    timer.start();
    while (timer.elapsed() < ms) {
        if (done()) return true;
        QCoreApplication::processEvents(QEventLoop::AllEvents, 10);
    }
    return done();
}

// Records which thread each async decode runs on, and can hold decodes on a gate.
struct DecodeProbe {
    std::mutex mutex;
    std::condition_variable cv;
    std::vector<std::thread::id> threads;
    bool gateOpen = true;

    std::function<void()> hook() {
        return [this]() {
            std::unique_lock lock(mutex);
            threads.push_back(std::this_thread::get_id());
            cv.wait(lock, [this] { return gateOpen; });
        };
    }
    std::size_t count() {
        std::lock_guard lock(mutex);
        return threads.size();
    }
    bool noneOn(std::thread::id id) {
        std::lock_guard lock(mutex);
        for (auto t : threads) if (t == id) return false;
        return true;
    }
    void setGate(bool open) {
        {
            std::lock_guard lock(mutex);
            gateOpen = open;
        }
        cv.notify_all();
    }
};

void testNextSongDecodesOffTheUiThreadBeforeAdvance() {
    std::cout << "[TEST] Running testNextSongDecodesOffTheUiThreadBeforeAdvance..." << std::endl;
    // The probe must outlive the mixer: its engine joins decode workers that call the hook.
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    check(openOrder(setlist, makeServiceOrder("ahead", {"Alpha", "Bravo", "Charlie"})), "open failed");
    const std::string songA = stemOfSong(setlist, 0);
    const std::string songB = stemOfSong(setlist, 1);
    check(waitFor([&] { return currentStem(mixer) == songA; }, 2000),
          "open: first song never became current (got " + currentStem(mixer) + ")");

    // #187: once Song A is up, Song B is decoded on the worker before anyone advances.
    check(waitFor([&] { return probe.count() >= 2; }, 2000),
          "Song B was not preloaded on a worker after Song A became current (async decodes: "
          + std::to_string(probe.count()) + ")");
    runEvents(50);

    // Advancing only switches: Song B is current as soon as the index changes.
    setlist.setCurrentSongIndex(1);
    check(currentStem(mixer) == songB,
          "advance did not switch straight to the preloaded Song B (got " + currentStem(mixer) + ")");
    check(probe.noneOn(std::this_thread::get_id()), "a decode ran on the UI thread");
    std::cout << "[PASS] testNextSongDecodesOffTheUiThreadBeforeAdvance passed." << std::endl;
}

void testJumpToUnloadedSongWaitsForNewestDecode() {
    std::cout << "[TEST] Running testJumpToUnloadedSongWaitsForNewestDecode..." << std::endl;
    // The probe must outlive the mixer: its engine joins decode workers that call the hook.
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    check(openOrder(setlist, makeServiceOrder("jump", {"Alpha", "Bravo", "Charlie", "Delta"})),
          "open failed");
    const std::string songA = stemOfSong(setlist, 0);
    const std::string songB = stemOfSong(setlist, 1);
    const std::string songD = stemOfSong(setlist, 3);
    check(waitFor([&] { return currentStem(mixer) == songA; }, 2000), "open: first song never became current");
    check(waitFor([&] { return probe.count() >= 2; }, 2000), "Song B was not preloaded");
    runEvents(50);
    mixer.play();

    // Hold every decode, then jump to Song D (not preloaded) and change our mind to Song B.
    probe.setGate(false);
    setlist.setCurrentSongIndex(3);
    check(currentStem(mixer) == songA, "jump: Song A was replaced before Song D finished decoding");
    check(mixer.isPlaying(), "jump: Song A stopped while Song D was still decoding");
    setlist.setCurrentSongIndex(1);
    probe.setGate(true);

    // Only the newest request (Song B) may become current, and Song D must never show up late.
    check(waitFor([&] { return currentStem(mixer) == songB; }, 2000),
          "jump: Song B (newest pick) never became current (got " + currentStem(mixer) + ")");
    runEvents(300);
    check(currentStem(mixer) == songB, "jump: a stale decode replaced Song B with " + currentStem(mixer));
    check(currentStem(mixer) != songD, "jump: Song D showed up after the user moved on");
    check(mixer.isPlaying(), "jump: the switch did not keep the play state");
    check(probe.noneOn(std::this_thread::get_id()), "a decode ran on the UI thread");
    mixer.stop();
    std::cout << "[PASS] testJumpToUnloadedSongWaitsForNewestDecode passed." << std::endl;
}

void testOpeningOrderWhilePlayingCuesFirstSong() {
    std::cout << "[TEST] Running testOpeningOrderWhilePlayingCuesFirstSong..." << std::endl;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);

    check(openOrder(setlist, makeServiceOrder("first", {"Alpha", "Bravo"})), "open first failed");
    check(waitFor([&] { return currentStem(mixer) == stemOfSong(setlist, 0); }, 2000),
          "first order never cued its first song");
    mixer.play();
    check(mixer.isPlaying(), "precondition: first order is playing");

    // #220: opening another order while one plays cues its first song stopped at 0.
    check(openOrder(setlist, makeServiceOrder("second", {"Echo", "Foxtrot"})), "open second failed");
    const std::string songE = stemOfSong(setlist, 0);
    check(waitFor([&] { return currentStem(mixer) == songE; }, 2000),
          "second order's first song never became current (got " + currentStem(mixer) + ")");
    runEvents(100);
    check(!mixer.isPlaying(), "#220: the new service order's first song started playing");
    check(mixer.positionSeconds() == 0.0, "#220: the new first song is not cued at 0");
    std::cout << "[PASS] testOpeningOrderWhilePlayingCuesFirstSong passed." << std::endl;
}

void testOpeningOrderWhileStoppedCuesFirstSong() {
    std::cout << "[TEST] Running testOpeningOrderWhileStoppedCuesFirstSong..." << std::endl;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);

    check(openOrder(setlist, makeServiceOrder("stopped", {"Golf", "Hotel"})), "open failed");
    check(waitFor([&] { return currentStem(mixer) == stemOfSong(setlist, 0); }, 2000),
          "first song never became current");
    runEvents(100);
    check(!mixer.isPlaying(), "#202: opening while stopped started playback");
    check(mixer.positionSeconds() == 0.0, "#202: first song is not cued at 0");
    std::cout << "[PASS] testOpeningOrderWhileStoppedCuesFirstSong passed." << std::endl;
}

} // namespace

int main(int argc, char** argv) {
    QCoreApplication app(argc, argv);
    // Optional: pass one test name to run only that test.
    const std::string only = argc > 1 ? argv[1] : "";
    const std::vector<std::pair<std::string, std::function<void()>>> tests = {
        {"testOpeningOrderWhileStoppedCuesFirstSong", testOpeningOrderWhileStoppedCuesFirstSong},
        {"testOpeningOrderWhilePlayingCuesFirstSong", testOpeningOrderWhilePlayingCuesFirstSong},
        {"testNextSongDecodesOffTheUiThreadBeforeAdvance", testNextSongDecodesOffTheUiThreadBeforeAdvance},
        {"testJumpToUnloadedSongWaitsForNewestDecode", testJumpToUnloadedSongWaitsForNewestDecode},
    };
    try {
        for (const auto& [name, run] : tests) {
            if (only.empty() || only == name) run();
        }
        std::cout << "\nALL SONG SWITCH COORDINATOR TESTS PASSED" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "FAIL in SongSwitchCoordinator tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
