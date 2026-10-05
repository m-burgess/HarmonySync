#include "AudioEngine.hpp"
#include "RealtimeHandoff.hpp"
#include "StemMixer.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>
#include <chrono>
#include <memory>
#include <string>
#include <utility>

using namespace HarmonySync::Core;
using namespace HarmonySync::Media;

void testAudioEngineStates() {
    std::cout << "[TEST] Running testAudioEngineStates..." << std::endl;
    AudioEngine engine;

    assert(engine.playbackState() == PlaybackState::Stopped);
    assert(!engine.isPlaying());

    MediaStem s1("1", "Drums", "drums.wav");
    MediaStem s2("2", "Bass", "bass.wav");
    std::vector<MediaStem> stems = {s1, s2};

    bool loaded = engine.loadStems(stems);
    assert(loaded == true);
    assert(engine.loadedStems().size() == 2);

    engine.play();
    assert(engine.playbackState() == PlaybackState::Playing);
    assert(engine.isPlaying() == true);

    engine.pause();
    assert(engine.playbackState() == PlaybackState::Paused);
    assert(!engine.isPlaying());

    engine.stop();
    assert(engine.playbackState() == PlaybackState::Stopped);
    assert(engine.positionSeconds() == 0.0);

    engine.setPitchShiftSemitones(-3);
    assert(engine.pitchShiftSemitones() == -3);

    std::cout << "[PASS] testAudioEngineStates passed." << std::endl;
}

void testStemMixerCalculation() {
    std::cout << "[TEST] Running testStemMixerCalculation..." << std::endl;
    StemMixer mixer;

    MediaStem drums("1", "Drums", "drums.wav");
    MediaStem bass("2", "Bass", "bass.wav");
    MediaStem keys("3", "Keys", "keys.wav");

    drums.setVolume(0.8f);
    bass.setVolume(1.0f);
    keys.setVolume(0.5f);

    std::vector<MediaStem> stems = {drums, bass, keys};

    // Normal mix calculation with master volume 1.0
    float gainDrums = mixer.calculateEffectiveGain(drums, stems, 1.0f);
    assert(gainDrums == 0.8f);

    // Muted track test
    drums.setMuted(true);
    gainDrums = mixer.calculateEffectiveGain(drums, stems, 1.0f);
    assert(gainDrums == 0.0f);

    // Solo precedence test
    bass.setSolo(true);
    stems = {drums, bass, keys}; // update solo on bass
    float gainKeys = mixer.calculateEffectiveGain(keys, stems, 1.0f);
    assert(gainKeys == 0.0f); // keys should be muted due to solo precedence on bass

    float gainBass = mixer.calculateEffectiveGain(bass, stems, 1.0f);
    assert(gainBass == 1.0f); // bass is soloed and should play at full volume

    std::cout << "[PASS] testStemMixerCalculation passed." << std::endl;
}

// #177 — load B while A plays, switch under 100ms, drop A
void testPreloadNextSongWhilePlaying() {
    std::cout << "[TEST] Running testPreloadNextSongWhilePlaying..." << std::endl;
    AudioEngine engine;

    MediaStem songA("a1", "DrumsA", "song_a_drums.wav");
    MediaStem songB("b1", "DrumsB", "song_b_drums.wav");

    assert(engine.loadStems({songA}));
    engine.play();
    assert(engine.isPlaying());
    assert(engine.loadedStems().size() == 1);
    assert(engine.loadedStems()[0].id() == "a1");

    assert(engine.preloadStems({songB}));
    assert(engine.hasPreloadedStems());
    // A must still be the loaded/playing set
    assert(engine.isPlaying());
    assert(engine.loadedStems().size() == 1);
    assert(engine.loadedStems()[0].id() == "a1");

    const auto t0 = std::chrono::steady_clock::now();
    assert(engine.switchToPreloaded());
    const auto elapsedMs = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - t0).count();

    assert(elapsedMs < 100);
    assert(engine.isPlaying());
    assert(!engine.hasPreloadedStems());
    assert(engine.loadedStems().size() == 1);
    assert(engine.loadedStems()[0].id() == "b1"); // A dropped, B current

    std::cout << "[PASS] testPreloadNextSongWhilePlaying passed (switch " << elapsedMs << "ms)." << std::endl;
}

// #177 — switching starts B at 0, consumes the staged set, and restaging replaces it.
void testSwitchToPreloadedStartsNextSongAtZero() {
    std::cout << "[TEST] Running testSwitchToPreloadedStartsNextSongAtZero..." << std::endl;
    AudioEngine engine;

    assert(!engine.switchToPreloaded()); // nothing staged

    MediaStem songA("a1", "DrumsA", "song_a_drums.wav");
    MediaStem songB("b1", "DrumsB", "song_b_drums.wav");
    MediaStem songC("c1", "KeysC", "song_c_keys.wav");

    assert(engine.loadStems({songA}));
    engine.play();
    if (engine.durationSeconds() > 0.0) {
        engine.seek(42.0); // A is partway in
        assert(engine.positionSeconds() > 0.0);
    }

    assert(engine.preloadStems({songB}));
    assert(engine.preloadStems({songC})); // restaging replaces B
    assert(engine.hasPreloadedStems());
    assert(engine.loadedStems()[0].id() == "a1");

    assert(engine.switchToPreloaded());
    assert(engine.positionSeconds() == 0.0); // B starts at the top, not at A's position
    assert(engine.isPlaying());
    assert(!engine.hasPreloadedStems());
    assert(engine.loadedStems().size() == 1);
    assert(engine.loadedStems()[0].id() == "c1");

    assert(!engine.switchToPreloaded()); // staged set was consumed
    assert(engine.loadedStems()[0].id() == "c1");

    std::cout << "[PASS] testSwitchToPreloadedStartsNextSongAtZero passed." << std::endl;
}

namespace {

// Stand-in for a song's mapped buffers that counts when it is actually freed.
struct TrackedSongSet {
    std::string song;
    std::shared_ptr<int> destroyed;

    TrackedSongSet(std::string name, std::shared_ptr<int> counter)
        : song(std::move(name)), destroyed(std::move(counter)) {}
    TrackedSongSet(TrackedSongSet&& other) noexcept
        : song(std::move(other.song)), destroyed(std::move(other.destroyed)) {}
    TrackedSongSet& operator=(TrackedSongSet&&) = delete;
    ~TrackedSongSet() {
        if (destroyed) {
            ++*destroyed;
        }
    }
};

} // namespace

// #177 — the audio-side handoff, without a real audio device.
// Control thread: publish()/reclaimRetired(). Audio thread: acquirePending()/current().
void testRealtimeHandoffKeepsSongAliveUntilAudioThreadLetsGo() {
    std::cout << "[TEST] Running testRealtimeHandoffKeepsSongAliveUntilAudioThreadLetsGo..." << std::endl;
    auto aFreed = std::make_shared<int>(0);
    auto bFreed = std::make_shared<int>(0);

    {
        RealtimeHandoff<TrackedSongSet> handoff;
        handoff.resetCurrent(TrackedSongSet("A", aFreed));
        assert(handoff.current() != nullptr);
        assert(handoff.current()->song == "A");
        assert(!handoff.hasPending());

        // Audio thread is mid-read of A when the control thread switches.
        const TrackedSongSet* beingRead = handoff.current();
        handoff.publish(TrackedSongSet("B", bFreed));
        assert(handoff.hasPending());
        assert(handoff.current() == beingRead); // switch did not touch the buffers being read
        assert(beingRead->song == "A");
        assert(handoff.reclaimRetired() == 0);  // A is still in use, nothing to free
        assert(*aFreed == 0);

        // Next audio callback takes B at the top.
        assert(handoff.acquirePending());
        assert(handoff.current()->song == "B");
        assert(!handoff.hasPending());
        assert(*aFreed == 0);                   // not freed on the audio thread
        assert(!handoff.acquirePending());      // nothing new staged

        // Control thread frees A after the handoff.
        assert(handoff.reclaimRetired() == 1);
        assert(*aFreed == 1);
        assert(*bFreed == 0);
        assert(handoff.current()->song == "B");
    }
    assert(*bFreed == 1); // current set freed with the handoff

    std::cout << "[PASS] testRealtimeHandoffKeepsSongAliveUntilAudioThreadLetsGo passed." << std::endl;
}

void testRealtimeHandoffLatestPublishWinsAndRetiresStack() {
    std::cout << "[TEST] Running testRealtimeHandoffLatestPublishWinsAndRetiresStack..." << std::endl;
    auto aFreed = std::make_shared<int>(0);
    auto bFreed = std::make_shared<int>(0);
    auto cFreed = std::make_shared<int>(0);
    auto dFreed = std::make_shared<int>(0);

    {
        RealtimeHandoff<TrackedSongSet> handoff;
        handoff.resetCurrent(TrackedSongSet("A", aFreed));

        // Two switches before the audio thread runs: B was never seen, so it is freed right away.
        handoff.publish(TrackedSongSet("B", bFreed));
        handoff.publish(TrackedSongSet("C", cFreed));
        assert(*bFreed == 1);
        assert(handoff.latest() != nullptr && handoff.latest()->song == "C");
        assert(handoff.current()->song == "A");

        assert(handoff.acquirePending());
        assert(handoff.current()->song == "C");

        // Another switch is taken before the control thread reclaims: A and C both wait.
        handoff.publish(TrackedSongSet("D", dFreed));
        assert(handoff.acquirePending());
        assert(handoff.current()->song == "D");
        assert(*aFreed == 0);
        assert(*cFreed == 0);

        assert(handoff.reclaimRetired() == 2);
        assert(*aFreed == 1);
        assert(*cFreed == 1);
        assert(*dFreed == 0);
    }
    assert(*dFreed == 1);
    assert(*bFreed == 1); // never double-freed

    std::cout << "[PASS] testRealtimeHandoffLatestPublishWinsAndRetiresStack passed." << std::endl;
}

int main() {
    try {
        testAudioEngineStates();
        testStemMixerCalculation();
        testPreloadNextSongWhilePlaying();
        testSwitchToPreloadedStartsNextSongAtZero();
        testRealtimeHandoffKeepsSongAliveUntilAudioThreadLetsGo();
        testRealtimeHandoffLatestPublishWinsAndRetiresStack();
        std::cout << "\nALL AUDIO ENGINE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in audio engine unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
