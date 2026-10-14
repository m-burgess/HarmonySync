// #177: the sink must keep pulling audio while the GUI/main thread is blocked.
//
// Needs a real audio output (e.g. a PulseAudio null sink:
//   pactl load-module module-null-sink sink_name=qa_sink && pactl set-default-sink qa_sink).
// With no audio device it prints SKIP and exits 0, so CI without sound stays green.
#include "AudioEngine.hpp"
#include "FolderService.hpp"
#ifdef HARMONYSYNC_HAS_QT
#include <QCoreApplication>
#endif
#include <algorithm>
#include <cassert>
#include <cmath>
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <future>
#include <mutex>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

using namespace HarmonySync::Core;
using namespace HarmonySync::Media;
using namespace std::chrono_literals;

namespace {

/// Writes a 16-bit stereo 44.1kHz WAV of `seconds` and returns its path.
std::string writeWav(const std::filesystem::path& path, std::uint32_t seconds) {
    const std::uint16_t channels = 2, bits = 16, pcm = 1, blockAlign = 4;
    const std::uint32_t rate = 44100, frames = seconds * rate, dataSize = frames * blockAlign;
    const std::uint32_t byteRate = rate * blockAlign, riffSize = 36 + dataSize, fmtSize = 16;
    std::ofstream out(path, std::ios::binary);
    auto put = [&out](const auto& v) { out.write(reinterpret_cast<const char*>(&v), sizeof(v)); };
    out.write("RIFF", 4); put(riffSize); out.write("WAVE", 4);
    out.write("fmt ", 4); put(fmtSize); put(pcm); put(channels); put(rate);
    put(byteRate); put(blockAlign); put(bits);
    out.write("data", 4); put(dataSize);
    std::vector<std::int16_t> samples(static_cast<std::size_t>(frames) * channels);
    for (std::size_t i = 0; i < samples.size(); ++i) {
        samples[i] = static_cast<std::int16_t>((i % 100) * 50); // quiet click-like ramp
    }
    out.write(reinterpret_cast<const char*>(samples.data()),
              static_cast<std::streamsize>(samples.size() * sizeof(std::int16_t)));
    return path.string();
}


/// Compares the fields readData() mixes with.
bool sameMix(const MediaStem& a, const MediaStem& b) {
    return a.filePath() == b.filePath() && a.isMuted() == b.isMuted() && a.isSolo() == b.isSolo()
           && std::abs(a.volume() - b.volume()) < 1e-6f;
}

bool check(bool ok, const char* what) {
    if (!ok) {
        std::cerr << "FAIL: " << what << std::endl;
    }
    return ok;
}

/// #177 stale setter: a mute queued for song A must not land on song B when the switch to B
/// reaches the audio thread first. Needs the audio thread (an application object), not a device.
bool testQueuedMuteForOutgoingSongIsNotAppliedToNextSong(const std::filesystem::path& root) {
    std::cout << "[TEST] Running testQueuedMuteForOutgoingSongIsNotAppliedToNextSong..." << std::endl;
    const auto dirA = root / "songA";
    const auto dirB = root / "songB";
    std::filesystem::create_directories(dirA);
    std::filesystem::create_directories(dirB);
    const std::vector<MediaStem> songA = {MediaStem("a1", "Drums", writeWav(dirA / "drums.wav", 20)),
                                          MediaStem("a2", "Keys", writeWav(dirA / "keys.wav", 20))};
    std::vector<MediaStem> songB = {MediaStem("b1", "Drums", writeWav(dirB / "drums.wav", 20)),
                                    MediaStem("b2", "Keys", writeWav(dirB / "keys.wav", 20))};
    {
        // B's saved mix: drums open, keys at 0.4.
        std::vector<MediaStem> saved = songB;
        saved[1].setVolume(0.4f);
        FolderService::saveMixState(dirB.string(), saved);
    }
    FolderService::applyMixState(dirB.string(), songB);

    AudioEngine engine;
    std::mutex droppedMutex;
    std::vector<std::pair<std::vector<std::string>, int>> dropped;
    engine.setStaleStemChangeCallback([&](const std::vector<std::string>& key, int stemIndex) {
        std::lock_guard lock(droppedMutex);
        dropped.emplace_back(key, stemIndex);
    });

    bool ok = true;
    ok &= check(engine.loadStems(songA), "song A loads");
    engine.play();
    ok &= check(engine.preloadStems(songB), "song B preloads");

    // Hold the audio thread so the mute is still queued when the switch is published.
    std::promise<void> release;
    std::shared_future<void> released = release.get_future().share();
    engine.runOnAudioThreadForTesting([released] { released.wait(); });

    engine.setStemMuted(0, true); // musician mutes A's drums just before the switch
    const std::vector<MediaStem> aControl = engine.loadedStems();
    ok &= check(aControl.size() == 2 && aControl[0].isMuted(), "A's control-side drums hold the mute");

    std::thread releaser([&release] {
        std::this_thread::sleep_for(std::chrono::milliseconds(300));
        release.set_value();
    });
    ok &= check(engine.switchToPreloaded(), "switch to B");
    releaser.join();

    const std::vector<MediaStem> playing = engine.audioThreadStemsForTesting();
    const std::vector<MediaStem>& bControl = engine.loadedStems();
    ok &= check(playing.size() == 2 && bControl.size() == 2, "B has two stems on both sides");
    if (playing.size() == 2 && bControl.size() == 2) {
        ok &= check(!playing[0].isMuted(), "B's drums play unmuted, as in B's mix.json (A's mute leaked onto B)");
        ok &= check(std::abs(playing[1].volume() - 0.4f) < 1e-6f, "B's keys play at B's mix.json volume 0.4");
        ok &= check(sameMix(playing[0], bControl[0]) && sameMix(playing[1], bControl[1]),
                    "B's control-side stems match what the audio thread plays");
    }
    {
        std::lock_guard lock(droppedMutex);
        ok &= check(dropped.size() == 1 && dropped[0].first == AudioEngine::songKey(songA)
                        && dropped[0].second == 0,
                    "the dropped mute is reported once, with A's songKey and stem 0");
    }

    // Saving is the viewmodel's job (it saves A's control stems before the switch, #230);
    // here we check those stems carry the mute into A's mix.json and B's file is untouched.
    FolderService::saveMixState(dirA.string(), aControl);
    std::vector<MediaStem> reloadA = songA;
    FolderService::applyMixState(dirA.string(), reloadA);
    std::vector<MediaStem> reloadB = songB;
    reloadB[0].setMuted(true); // would be overwritten back to false if B's file is intact
    FolderService::applyMixState(dirB.string(), reloadB);
    ok &= check(reloadA[0].isMuted(), "A's mix.json has the drums muted");
    ok &= check(!reloadB[0].isMuted(), "B's mix.json still has the drums open");

    engine.stop();
    if (ok) {
        std::cout << "[PASS] testQueuedMuteForOutgoingSongIsNotAppliedToNextSong passed." << std::endl;
    }
    return ok;
}

/// #177 rapid setters: 1000 volume and mute changes on one stem while the sink pulls.
/// The audio thread must end on the last values and keep pulling throughout.
bool testRapidStemSettersDuringPlayback(AudioEngine& engine) {
    std::cout << "[TEST] Running testRapidStemSettersDuringPlayback..." << std::endl;
    const auto start = std::chrono::steady_clock::now();
    const std::uint64_t before = engine.audioCallbackCountForTesting();
    float lastVolume = 0.0f;
    bool lastMuted = false;
    for (int i = 0; i < 1000; ++i) {
        lastVolume = static_cast<float>(i % 97) / 100.0f;
        lastMuted = (i % 3) == 0;
        engine.setStemVolume(0, lastVolume);
        engine.setStemMuted(0, lastMuted);
    }
    const auto queuedIn = std::chrono::steady_clock::now() - start;
    std::this_thread::sleep_for(std::chrono::milliseconds(600));
    const std::uint64_t pulls = engine.audioCallbackCountForTesting() - before;
    const std::vector<MediaStem> playing = engine.audioThreadStemsForTesting();
    std::cout << "  2000 changes queued in "
              << std::chrono::duration_cast<std::chrono::microseconds>(queuedIn).count()
              << "us; readData() calls in the next 600ms: " << pulls << std::endl;
    bool ok = check(!playing.empty(), "the audio thread has a song");
    ok &= check(engine.isPlaying(), "still playing");
    if (!playing.empty()) {
        ok &= check(std::abs(playing[0].volume() - lastVolume) < 1e-6f, "audio thread ends on the last volume");
        ok &= check(playing[0].isMuted() == lastMuted, "audio thread ends on the last mute");
        ok &= check(sameMix(playing[0], engine.loadedStems()[0]), "control and audio stems agree");
    }
    ok &= check(pulls >= 4, "the sink kept pulling while the changes were applied");
    if (ok) {
        std::cout << "[PASS] testRapidStemSettersDuringPlayback passed." << std::endl;
    }
    return ok;
}

} // namespace

int main(int argc, char** argv) {
#ifdef HARMONYSYNC_HAS_QT
    // Like the app: an application object on the main thread, whose event loop we then block.
    QCoreApplication app(argc, argv);
#else
    (void)argc;
    (void)argv;
    std::cout << "SKIP test_audio_thread: built without Qt." << std::endl;
    return EXIT_SUCCESS;
#endif

    const auto dir = std::filesystem::temp_directory_path() / "harmonysync_test_audio_thread";
    std::filesystem::create_directories(dir);
    int result = EXIT_SUCCESS;
    if (!testQueuedMuteForOutgoingSongIsNotAppliedToNextSong(dir)) {
        result = EXIT_FAILURE;
    }
    {
        AudioEngine engine;
        if (!engine.hasAudioOutputForTesting()) {
            std::cout << "SKIP test_audio_thread: no audio output device available." << std::endl;
            std::filesystem::remove_all(dir);
            return result;
        }

        std::cout << "[TEST] Running testAudioKeepsFlowingWhileMainThreadIsBlocked..." << std::endl;
        assert(engine.loadStems({MediaStem("c1", "Click", writeWav(dir / "click.wav", 30))}));
        engine.play();
        assert(engine.isPlaying());

        // Wait for steady pulling first: a PulseAudio stream can take ~2s to start asking for
        // data. Events are processed here so a sink owned by the main thread gets a fair start.
        const auto settleDeadline = std::chrono::steady_clock::now() + 6s;
        while (engine.audioCallbackCountForTesting() < 8
               && std::chrono::steady_clock::now() < settleDeadline) {
            QCoreApplication::processEvents();
            std::this_thread::sleep_for(5ms);
        }
        std::cout << "  readData() calls before the block: " << engine.audioCallbackCountForTesting()
                  << std::endl;

        // Now block the main thread for 2s without processing events, as a slow folder scan
        // or autosave on the GUI thread would.
        // HARMONYSYNC_TEST_BLOCK_MS lengthens the block for a manual recording check
        // (e.g. 9000 to match QA's slow folder scan); the default 2s is what CI runs.
        std::chrono::milliseconds blockFor = 2s;
        if (const char* env = std::getenv("HARMONYSYNC_TEST_BLOCK_MS")) {
            blockFor = std::chrono::milliseconds(std::max(2000L, std::atol(env)));
        }
        const std::uint64_t before = engine.audioCallbackCountForTesting();
        std::this_thread::sleep_for(blockFor);
        const std::uint64_t after = engine.audioCallbackCountForTesting();
        const std::thread::id callbackThread = engine.audioCallbackThreadForTesting();

        std::cout << "  readData() calls during the " << blockFor.count() << "ms block: " << (after - before)
                  << " (total " << after << "), on main thread: "
                  << (callbackThread == std::this_thread::get_id() ? "yes" : "no") << std::endl;

        // Steady state is ~12 pulls/s of ~93ms each; 2s of audio needs well over 10.
        if (after - before < 10) {
            std::cerr << "FAIL: the sink stopped pulling audio while the main thread was blocked."
                      << std::endl;
            result = EXIT_FAILURE;
        } else if (callbackThread == std::this_thread::get_id()) {
            std::cerr << "FAIL: readData() ran on the main thread." << std::endl;
            result = EXIT_FAILURE;
        } else {
            assert(engine.isPlaying());
            std::cout << "[PASS] testAudioKeepsFlowingWhileMainThreadIsBlocked passed." << std::endl;
        }
        if (!testRapidStemSettersDuringPlayback(engine)) {
            result = EXIT_FAILURE;
        }
        engine.stop();
    }
    std::filesystem::remove_all(dir);
    return result;
}
