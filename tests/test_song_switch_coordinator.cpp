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
#include <QSignalSpy>
#include <QTimer>

#include <algorithm>
#include <cmath>
#include <cstdint>

#include <condition_variable>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <iterator>
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

// ---------- #185: clearing, removing and reopening free song buffers ----------

// A valid 16-bit PCM WAV (44.1kHz stereo, 0.25s) so the engine really maps and holds buffers.
void writeWav(const fs::path& path) {
    const std::uint32_t rate = 44100, frames = rate / 4;
    const std::uint16_t channels = 2, bits = 16;
    const std::uint32_t dataBytes = frames * channels * bits / 8;
    std::ofstream f(path, std::ios::binary);
    auto u32 = [&](std::uint32_t v) { f.write(reinterpret_cast<const char*>(&v), 4); };
    auto u16 = [&](std::uint16_t v) { f.write(reinterpret_cast<const char*>(&v), 2); };
    f << "RIFF"; u32(36 + dataBytes); f << "WAVEfmt "; u32(16); u16(1); u16(channels); u32(rate);
    u32(rate * channels * bits / 8); u16(channels * bits / 8); u16(bits); f << "data"; u32(dataBytes);
    for (std::uint32_t i = 0; i < frames; ++i) {
        auto v = static_cast<std::int16_t>(2000 * std::sin(2 * 3.14159265 * 330 * i / rate));
        u16(static_cast<std::uint16_t>(v)); u16(static_cast<std::uint16_t>(v));
    }
}

fs::path makeRealServiceOrder(const std::string& tag, const std::vector<std::string>& songs) {
    fs::path root = fs::temp_directory_path()
                 / ("hs_song_switch_real_" + std::to_string(QCoreApplication::applicationPid()) + "_" + tag);
    fs::remove_all(root);
    for (std::size_t i = 0; i < songs.size(); ++i) {
        fs::path song = root / ("0" + std::to_string(i + 1) + "_Song_" + songs[i]);
        fs::create_directories(song);
        writeWav(song / (songs[i] + "_Drums.wav"));
    }
    return root;
}

// Samples the mixer's live song-set count on the UI thread every millisecond.
struct LiveSetSampler {
    explicit LiveSetSampler(AudioMixerViewModel& mixer) : m_mixer(mixer) {
        m_timer.setInterval(1);
        QObject::connect(&m_timer, &QTimer::timeout, [this] { sample(); });
        m_timer.start();
    }
    std::size_t sample() {
        std::size_t n = m_mixer.liveSongSetCountForTesting();
        m_max = std::max(m_max, n);
        return n;
    }
    std::size_t max() const { return m_max; }
private:
    AudioMixerViewModel& m_mixer;
    QTimer m_timer;
    std::size_t m_max{0};
};

// Opens an order and waits until song 0 is current and song 1's preload has finished (2 sets held).
void openAndSettle(SetlistViewModel& setlist, AudioMixerViewModel& mixer, const fs::path& root) {
    check(openOrder(setlist, root), "open failed: " + root.string());
    check(waitFor([&] { return currentStem(mixer) == stemOfSong(setlist, 0); }, 3000),
          "first song never became current (got " + currentStem(mixer) + ")");
    check(waitFor([&] { return mixer.isPreloadedSong(setlist.stemsAt(1)) && mixer.isPreloadReadyForTesting()
                                && mixer.liveSongSetCountForTesting() == 2; }, 3000),
          "second song never preloaded (live sets " + std::to_string(mixer.liveSongSetCountForTesting()) + ")");
}

void testClearSetlistFreesCurrentAndNextSong() {
    std::cout << "[TEST] Running testClearSetlistFreesCurrentAndNextSong..." << std::endl;
    DecodeProbe probe; // declared before the mixer: it must outlive the engine's decode workers
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());
    int lastStemCount = -1;
    QObject::connect(&mixer, &AudioMixerViewModel::stemCountChanged, [&](int n) { lastStemCount = n; });

    openAndSettle(setlist, mixer, makeRealServiceOrder("clear", {"Alpha", "Bravo", "Charlie"}));
    const auto next = setlist.stemsAt(1);
    mixer.play();
    setlist.clearSetlist();
    runEvents(50);
    check(mixer.loadedStemCount() == 0, "clear: mixer still shows " + std::to_string(mixer.loadedStemCount()) + " stems");
    check(lastStemCount == 0, "clear: stemCountChanged(0) not emitted");
    check(!mixer.isPlaying(), "clear: still playing");
    check(!mixer.isPreloadedSong(next), "clear: next song still marked preloaded");
    check(mixer.liveSongSetCountForTesting() == 0,
          "clear: engine still holds " + std::to_string(mixer.liveSongSetCountForTesting()) + " song sets");
    std::cout << "[PASS] testClearSetlistFreesCurrentAndNextSong passed." << std::endl;
}

void testRemovingPreloadedSongPreloadsNewNext() {
    std::cout << "[TEST] Running testRemovingPreloadedSongPreloadsNewNext..." << std::endl;
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    openAndSettle(setlist, mixer, makeRealServiceOrder("remove", {"Alpha", "Bravo", "Charlie"}));
    const auto bravo = setlist.stemsAt(1);
    const std::string songC = stemOfSong(setlist, 2);
    const std::size_t decodesAtRemove = probe.count();
    setlist.removeSongAt(1); // Bravo was the preloaded next song
    check(!mixer.isPreloadedSong(bravo), "remove: the removed song is still the preloaded one");
    check(waitFor([&] { return mixer.isPreloadedSong(setlist.stemsAt(1)) && probe.count() == decodesAtRemove + 1
                               && mixer.liveSongSetCountForTesting() == 2; }, 3000),
          "remove: the new next song (Charlie) was not preloaded (live sets "
          + std::to_string(mixer.liveSongSetCountForTesting()) + ")");
    runEvents(50);
    const std::size_t decodesBefore = probe.count();
    setlist.setCurrentSongIndex(1);
    check(waitFor([&] { return currentStem(mixer) == songC; }, 3000), "remove: advancing never switched to Charlie (got " + currentStem(mixer) + ")");
    runEvents(50);
    std::cout << "  decodes before/after advance: " << decodesBefore << "/" << probe.count() << std::endl;
    check(probe.count() == decodesBefore,
          "remove: advancing to Charlie decoded it again instead of using the preload");
    check(probe.noneOn(std::this_thread::get_id()), "a decode ran on the UI thread");
    std::cout << "[PASS] testRemovingPreloadedSongPreloadsNewNext passed." << std::endl;
}

void testOpeningOrderDropsOldPreloadFirst() {
    std::cout << "[TEST] Running testOpeningOrderDropsOldPreloadFirst..." << std::endl;
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    openAndSettle(setlist, mixer, makeRealServiceOrder("reopen1", {"Alpha", "Bravo"}));
    const auto oldNext = setlist.stemsAt(1);
    mixer.play();
    // Connected after the coordinator, so this runs after its serviceOrderOpened handling
    // and before the new order's first song is selected.
    bool oldNextStillPreloaded = true;
    std::size_t liveAtOpen = 99;
    bool playingAtOpen = true;
    QObject::connect(&setlist, &SetlistViewModel::serviceOrderOpened, [&] {
        oldNextStillPreloaded = mixer.isPreloadedSong(oldNext);
        liveAtOpen = mixer.liveSongSetCountForTesting();
        playingAtOpen = mixer.isPlaying();
    });
    check(openOrder(setlist, makeRealServiceOrder("reopen2", {"Echo", "Foxtrot"})), "open second failed");
    check(!oldNextStillPreloaded, "open: the old order's next song was still preloaded when the new order opened");
    check(liveAtOpen <= 1, "open: " + std::to_string(liveAtOpen) + " song sets held when the new order opened");
    check(!playingAtOpen, "#220: still playing when the new order opened");
    check(waitFor([&] { return currentStem(mixer) == stemOfSong(setlist, 0); }, 3000), "new first song never current");
    runEvents(50);
    check(!mixer.isPlaying() && mixer.positionSeconds() == 0.0, "#220: new first song not cued stopped at 0");
    std::cout << "[PASS] testOpeningOrderDropsOldPreloadFirst passed." << std::endl;
}

void testClearAndReopenFiftyTimesHoldsAtMostTwoSongs() {
    std::cout << "[TEST] Running testClearAndReopenFiftyTimesHoldsAtMostTwoSongs..." << std::endl;
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());
    LiveSetSampler sampler(mixer);
    const fs::path orders[2] = {makeRealServiceOrder("cycle_a", {"Alpha", "Bravo", "Charlie"}),
                                makeRealServiceOrder("cycle_b", {"Delta", "Echo", "Foxtrot"})};

    for (int i = 0; i < 50; ++i) {
        const std::string at = " (cycle " + std::to_string(i) + ")";
        openAndSettle(setlist, mixer, orders[i % 2]);
        mixer.play();
        setlist.setCurrentSongIndex(1);
        check(waitFor([&] { return currentStem(mixer) == stemOfSong(setlist, 1); }, 3000), "advance did not switch" + at);
        check(waitFor([&] { return mixer.isPreloadedSong(setlist.stemsAt(2)); }, 3000), "song 3 never preloaded" + at);
        setlist.clearSetlist();
        runEvents(20);
        check(sampler.sample() == 0,
              "clear left " + std::to_string(mixer.liveSongSetCountForTesting()) + " song sets" + at);
        check(mixer.loadedStemCount() == 0, "clear left stems in the mixer" + at);
    }
    std::cout << "  max live song sets over 50 cycles: " << sampler.max() << std::endl;
    check(sampler.max() <= 2, "held " + std::to_string(sampler.max()) + " song sets at once (want <= 2)");
    std::cout << "[PASS] testClearAndReopenFiftyTimesHoldsAtMostTwoSongs passed." << std::endl;
}

void testRemovingEarlierSongKeepsSameSongSelected() {
    std::cout << "[TEST] Running testRemovingEarlierSongKeepsSameSongSelected..." << std::endl;
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    openAndSettle(setlist, mixer, makeRealServiceOrder("remove_earlier", {"Alpha", "Bravo", "Charlie", "Delta"}));
    setlist.setCurrentSongIndex(2);
    const std::string songC = stemOfSong(setlist, 2);
    check(waitFor([&] { return currentStem(mixer) == songC && mixer.isPreloadedSong(setlist.stemsAt(3)); }, 3000),
          "remove earlier: setup never reached Charlie current, Delta preloaded");
    runEvents(50);
    std::vector<int> indexSignals;
    QObject::connect(&setlist, &SetlistViewModel::currentSongIndexChanged, [&](int i) { indexSignals.push_back(i); });
    const std::size_t decodesAtRemove = probe.count();

    setlist.removeSongAt(0); // Alpha, before the current song
    runEvents(100);
    check(setlist.currentSongIndex() == 1,
          "remove earlier: index is " + std::to_string(setlist.currentSongIndex()) + ", want 1 (shifted down)");
    check(stemOfSong(setlist, setlist.currentSongIndex()) == songC,
          "remove earlier: selection moved to " + stemOfSong(setlist, setlist.currentSongIndex()) + ", want Charlie");
    check(indexSignals.size() == 1 && indexSignals.front() == 1, "remove earlier: currentSongIndexChanged(1) not emitted once");
    check(currentStem(mixer) == songC, "remove earlier: audio is " + currentStem(mixer) + ", want Charlie");
    check(waitFor([&] { return mixer.isPreloadedSong(setlist.stemsAt(setlist.currentSongIndex() + 1)); }, 3000),
          "remove earlier: the new next song (Delta) is not preloaded");
    check(probe.count() == decodesAtRemove, "remove earlier: the current or next song was decoded again");
    check(mixer.liveSongSetCountForTesting() == 2,
          "remove earlier: holds " + std::to_string(mixer.liveSongSetCountForTesting()) + " song sets, want 2");
    std::cout << "[PASS] testRemovingEarlierSongKeepsSameSongSelected passed." << std::endl;
}

void testPendingAdvanceSurvivesRemovingNextSong() {
    std::cout << "[TEST] Running testPendingAdvanceSurvivesRemovingNextSong..." << std::endl;
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    openAndSettle(setlist, mixer, makeRealServiceOrder("pending_advance", {"Alpha", "Bravo", "Charlie", "Delta", "Echo"}));
    runEvents(50);
    const std::string songA = stemOfSong(setlist, 0);
    const std::string songC = stemOfSong(setlist, 2);
    probe.setGate(false); // hold Charlie's decode so the advance stays pending
    struct ReopenGate { DecodeProbe& p; ~ReopenGate() { p.setGate(true); } } reopen{probe}; // never leave a worker blocked
    setlist.setCurrentSongIndex(2);
    check(waitFor([&] { return probe.count() > 0 && mixer.isPreloadedSong(setlist.stemsAt(2)); }, 3000),
          "pending: Charlie's decode never started");
    setlist.removeSongAt(3); // Delta, the song after the pending one
    setlist.removeSongAt(0); // Alpha, before it
    runEvents(50);
    check(currentStem(mixer) == songA, "pending: switched before the decode finished");
    check(stemOfSong(setlist, setlist.currentSongIndex()) == songC,
          "pending: selection moved to " + stemOfSong(setlist, setlist.currentSongIndex()) + ", want Charlie");
    probe.setGate(true);
    check(waitFor([&] { return currentStem(mixer) == songC; }, 3000),
          "pending: the advance to Charlie was dropped (audio is " + currentStem(mixer) + ")");
    std::cout << "[PASS] testPendingAdvanceSurvivesRemovingNextSong passed." << std::endl;
}

void testRepriseOfSameSongStillSwitches() {
    std::cout << "[TEST] Running testRepriseOfSameSongStillSwitches..." << std::endl;
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    const fs::path root = makeRealServiceOrder("reprise", {"Alpha", "Bravo"});
    openAndSettle(setlist, mixer, root);
    // A reprise: the same song folder appears again later in the setlist.
    check(setlist.addSongFolder(QString::fromStdString((root / "01_Song_Alpha").string())), "reprise: add failed");
    check(setlist.itemCount() == 3, "reprise: setlist has " + std::to_string(setlist.itemCount()) + " rows, want 3");
    runEvents(50);
    int switches = 0;
    QObject::connect(&mixer, &AudioMixerViewModel::songSwitched, [&] { ++switches; });
    const std::size_t decodesBefore = probe.count();

    setlist.setCurrentSongIndex(2); // the reprise of Alpha, while Alpha (row 0) is shown
    check(waitFor([&] { return switches > 0; }, 3000),
          "reprise: selecting the second copy did not switch (decodes " +
          std::to_string(probe.count() - decodesBefore) + ")");
    check(currentStem(mixer) == stemOfSong(setlist, 2), "reprise: audio is " + currentStem(mixer));
    std::cout << "[PASS] testRepriseOfSameSongStillSwitches passed." << std::endl;
}

// QA (232): a short order opened after a long one. If a count drop lands after
// serviceOrderOpened (not from removeSongAt), it must not arm the "shifted by removal"
// skip, so picking the reprise row just above the current one still switches.
// The real open emits itemCountChanged before serviceOrderOpened, so the late
// delivery is simulated by re-emitting the stale long count and then the drop.
void testShortOrderAfterLongOrderRepriseAboveStillSwitches() {
    std::cout << "[TEST] Running testShortOrderAfterLongOrderRepriseAboveStillSwitches..." << std::endl;
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    openAndSettle(setlist, mixer, makeRealServiceOrder("long", {"Alpha", "Bravo", "Charlie", "Delta", "Echo"}));
    setlist.setCurrentSongIndex(4);
    check(waitFor([&] { return currentStem(mixer) == stemOfSong(setlist, 4); }, 3000), "long: Echo never current");
    runEvents(50);

    // Late count delivery right after the short order's serviceOrderOpened.
    bool injectOnOpen = true;
    auto openHook = QObject::connect(&setlist, &SetlistViewModel::serviceOrderOpened, [&] {
        if (!injectOnOpen) return;
        injectOnOpen = false;
        emit setlist.itemCountChanged(5);
        emit setlist.itemCountChanged(setlist.itemCount());
    });
    const fs::path shortRoot = makeRealServiceOrder("short", {"Bravo", "Alpha"});
    openAndSettle(setlist, mixer, shortRoot);
    QObject::disconnect(openHook);
    check(!injectOnOpen, "short: serviceOrderOpened hook never ran");
    // Rows: Bravo, Alpha, Alpha (the reprise is the same folder in the adjacent row).
    check(setlist.addSongFolder(QString::fromStdString((shortRoot / "02_Song_Alpha").string())), "short: add reprise failed");
    check(setlist.itemCount() == 3, "short: " + std::to_string(setlist.itemCount()) + " rows, want 3");
    setlist.setCurrentSongIndex(2);
    check(waitFor([&] { return currentStem(mixer) == stemOfSong(setlist, 2); }, 3000), "short: reprise row never current");
    runEvents(50);

    // A stale drop (5 -> 3) arrives now, with no removal in progress.
    emit setlist.itemCountChanged(5);
    emit setlist.itemCountChanged(3);

    int switches = 0;
    QObject::connect(&mixer, &AudioMixerViewModel::songSwitched, [&] { ++switches; });
    const std::size_t decodesBefore = probe.count();
    setlist.setCurrentSongIndex(1); // the first Alpha, just above the shown reprise
    check(waitFor([&] { return switches > 0; }, 3000),
          "short after long: picking the reprise row above did not switch (decodes " +
          std::to_string(probe.count() - decodesBefore) + ") - removal flag armed without removeSongAt");
    check(currentStem(mixer) == stemOfSong(setlist, 1), "short after long: audio is " + currentStem(mixer));

    // The flag must not survive an order open: arm it by a stale drop, reopen, then
    // the first in-order move must still switch.
    emit setlist.itemCountChanged(5);
    emit setlist.itemCountChanged(3);
    openAndSettle(setlist, mixer, shortRoot);
    check(setlist.addSongFolder(QString::fromStdString((shortRoot / "02_Song_Alpha").string())), "reopen: add reprise failed");
    setlist.setCurrentSongIndex(2);
    check(waitFor([&] { return currentStem(mixer) == stemOfSong(setlist, 2); }, 3000), "reopen: reprise row never current");
    runEvents(50);
    switches = 0;
    setlist.setCurrentSongIndex(1);
    check(waitFor([&] { return switches > 0; }, 3000), "reopen: removal flag survived the open; pick above was skipped");
    std::cout << "[PASS] testShortOrderAfterLongOrderRepriseAboveStillSwitches passed." << std::endl;
}

// QA (232): the coordinator's skip depends on removeSongAt emitting itemCountChanged,
// then currentSongIndexChanged, then songRemoved. Pin that order, and the skip.
void testRemoveSongAtSignalOrderAndSkip() {
    std::cout << "[TEST] Running testRemoveSongAtSignalOrderAndSkip..." << std::endl;
    DecodeProbe probe;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    mixer.setPreloadDecodeHookForTesting(probe.hook());

    openAndSettle(setlist, mixer, makeRealServiceOrder("signal_order", {"Alpha", "Bravo", "Charlie", "Delta"}));
    setlist.setCurrentSongIndex(2);
    const std::string songC = stemOfSong(setlist, 2);
    check(waitFor([&] { return currentStem(mixer) == songC && mixer.isPreloadedSong(setlist.stemsAt(3)); }, 3000),
          "signal order: setup never reached Charlie current, Delta preloaded");
    runEvents(50);

    std::vector<std::string> sequence;
    QSignalSpy countSpy(&setlist, &SetlistViewModel::itemCountChanged);
    QSignalSpy indexSpy(&setlist, &SetlistViewModel::currentSongIndexChanged);
    QSignalSpy removedSpy(&setlist, &SetlistViewModel::songRemoved);
    QObject::connect(&setlist, &SetlistViewModel::itemCountChanged, [&](int) { sequence.push_back("itemCountChanged"); });
    QObject::connect(&setlist, &SetlistViewModel::currentSongIndexChanged, [&](int) { sequence.push_back("currentSongIndexChanged"); });
    QObject::connect(&setlist, &SetlistViewModel::songRemoved, [&](int) { sequence.push_back("songRemoved"); });
    int switches = 0;
    QObject::connect(&mixer, &AudioMixerViewModel::songSwitched, [&] { ++switches; });
    const std::size_t decodesAtRemove = probe.count();

    setlist.removeSongAt(0);
    runEvents(100);
    std::string got;
    for (const auto& s : sequence) got += s + " ";
    check(sequence == std::vector<std::string>{"itemCountChanged", "currentSongIndexChanged", "songRemoved"},
          "signal order: got [" + got + "]");
    check(countSpy.count() == 1 && countSpy.at(0).at(0).toInt() == 3, "signal order: itemCountChanged(3) not emitted once");
    check(indexSpy.count() == 1 && indexSpy.at(0).at(0).toInt() == 1, "signal order: currentSongIndexChanged(1) not emitted once");
    check(removedSpy.count() == 1 && removedSpy.at(0).at(0).toInt() == 0, "signal order: songRemoved(0) not emitted once");
    // The skip: same song, one row up, no switch and no new decode.
    check(switches == 0, "signal order: removal switched the song " + std::to_string(switches) + " time(s)");
    check(currentStem(mixer) == songC, "signal order: audio is " + currentStem(mixer) + ", want Charlie");
    check(probe.count() == decodesAtRemove, "signal order: removal decoded again");
    std::cout << "[PASS] testRemoveSongAtSignalOrderAndSkip passed." << std::endl;
}

} // namespace

// #205/#185: a mute made just before the setlist is cleared still reaches the song's mix.json.
void testMuteThenClearSetlistSavesMix() {
    std::cout << "[TEST] Running testMuteThenClearSetlistSavesMix..." << std::endl;
    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);
    openAndSettle(setlist, mixer, makeRealServiceOrder("muteclear", {"Alpha", "Bravo"}));
    const auto song = setlist.stemsAt(0);
    check(!song.empty(), "song 0 has no stems");
    const fs::path mixPath = fs::path(song.front().filePath()).parent_path() / "mix.json";
    fs::remove(mixPath);
    const std::string stemName = mixer.stemName(0).toStdString();
    mixer.toggleStemMute(0);
    check(mixer.stemIsMuted(0), "mute did not apply");
    setlist.clearSetlist();            // immediately: the autosave is still debounced
    waitFor([&] { return fs::exists(mixPath); }, 3000);
    runEvents(200);
    check(fs::exists(mixPath), "clear: mix.json was never written for the cleared song");
    std::ifstream in(mixPath);
    const std::string json((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
    const auto key = json.find("\"" + stemName + "\"");
    check(key != std::string::npos, "clear: mix.json has no entry for " + stemName);
    const auto muted = json.find("\"muted\"", key);
    check(muted != std::string::npos && json.find("true", muted) < json.find_first_of(",}", muted + 8),
          "clear: mix.json does not have the mute: " + json);
    std::cout << "[PASS] testMuteThenClearSetlistSavesMix passed." << std::endl;
}

int main(int argc, char** argv) {
    QCoreApplication app(argc, argv);
    // Optional: pass one test name to run only that test.
    const std::string only = argc > 1 ? argv[1] : "";
    const std::vector<std::pair<std::string, std::function<void()>>> tests = {
        {"testOpeningOrderWhileStoppedCuesFirstSong", testOpeningOrderWhileStoppedCuesFirstSong},
        {"testOpeningOrderWhilePlayingCuesFirstSong", testOpeningOrderWhilePlayingCuesFirstSong},
        {"testNextSongDecodesOffTheUiThreadBeforeAdvance", testNextSongDecodesOffTheUiThreadBeforeAdvance},
        {"testJumpToUnloadedSongWaitsForNewestDecode", testJumpToUnloadedSongWaitsForNewestDecode},
        {"testClearSetlistFreesCurrentAndNextSong", testClearSetlistFreesCurrentAndNextSong},
        {"testRemovingPreloadedSongPreloadsNewNext", testRemovingPreloadedSongPreloadsNewNext},
        {"testRemovingEarlierSongKeepsSameSongSelected", testRemovingEarlierSongKeepsSameSongSelected},
        {"testRepriseOfSameSongStillSwitches", testRepriseOfSameSongStillSwitches},
        {"testShortOrderAfterLongOrderRepriseAboveStillSwitches", testShortOrderAfterLongOrderRepriseAboveStillSwitches},
        {"testRemoveSongAtSignalOrderAndSkip", testRemoveSongAtSignalOrderAndSkip},
        {"testPendingAdvanceSurvivesRemovingNextSong", testPendingAdvanceSurvivesRemovingNextSong},
        {"testOpeningOrderDropsOldPreloadFirst", testOpeningOrderDropsOldPreloadFirst},
        {"testClearAndReopenFiftyTimesHoldsAtMostTwoSongs", testClearAndReopenFiftyTimesHoldsAtMostTwoSongs},
        {"testMuteThenClearSetlistSavesMix", testMuteThenClearSetlistSavesMix},
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
