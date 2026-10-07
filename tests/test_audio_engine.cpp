#include "AudioEngine.hpp"
#include "RealtimeHandoff.hpp"
#include "StemMixer.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>
#include <chrono>
#include <condition_variable>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <utility>
#include <vector>

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

namespace {

using namespace std::chrono_literals;

/// Holds the async decode worker until the test releases it, so "still decoding" is deterministic.
struct DecodeGate {
    std::mutex mutex;
    std::condition_variable cv;
    bool open = false;
    int entered = 0;

    void wait() {
        std::unique_lock<std::mutex> lock(mutex);
        ++entered;
        cv.notify_all();
        cv.wait(lock, [this] { return open; });
    }
    void release() {
        {
            std::lock_guard<std::mutex> lock(mutex);
            open = true;
        }
        cv.notify_all();
    }
    bool waitEntered(int count) {
        std::unique_lock<std::mutex> lock(mutex);
        return cv.wait_for(lock, 2s, [&] { return entered >= count; });
    }
};

/// Records preload-ready callbacks, which arrive on the decode worker thread.
struct ReadyLog {
    std::mutex mutex;
    std::condition_variable cv;
    std::vector<std::pair<AudioEngine::PreloadTicket, bool>> calls;

    AudioEngine::PreloadReadyCallback callback(const std::shared_ptr<ReadyLog>& self) {
        return [self](AudioEngine::PreloadTicket ticket, bool hasStems) {
            {
                std::lock_guard<std::mutex> lock(self->mutex);
                self->calls.emplace_back(ticket, hasStems);
            }
            self->cv.notify_all();
        };
    }
    /// Waits for the callback of `ticket`; returns its hasStems, or nullopt-ish via found=false.
    bool waitFor(AudioEngine::PreloadTicket ticket, bool& hasStems) {
        std::unique_lock<std::mutex> lock(mutex);
        bool found = cv.wait_for(lock, 2s, [&] {
            for (const auto& call : calls) {
                if (call.first == ticket) return true;
            }
            return false;
        });
        if (found) {
            for (const auto& call : calls) {
                if (call.first == ticket) hasStems = call.second;
            }
        }
        return found;
    }
    int countFor(AudioEngine::PreloadTicket ticket) {
        std::lock_guard<std::mutex> lock(mutex);
        int n = 0;
        for (const auto& call : calls) {
            if (call.first == ticket) ++n;
        }
        return n;
    }
};

} // namespace

void testAsyncPreloadDoesNotBlockAndSwitchWaitsUntilReady() {
    std::cout << "[TEST] Running testAsyncPreloadDoesNotBlockAndSwitchWaitsUntilReady..." << std::endl;
    AudioEngine engine;
    assert(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav"), MediaStem("a2", "Bass", "a_bass.wav")}));
    engine.play();

    auto gate = std::make_shared<DecodeGate>();
    auto ready = std::make_shared<ReadyLog>();
    engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

    // Song B is still "decoding" for as long as the gate is shut; the call must not wait for it.
    const auto t0 = std::chrono::steady_clock::now();
    const auto ticket = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
    const auto callMs = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - t0).count();
    assert(ticket != 0);
    assert(callMs < 50);
    assert(gate->waitEntered(1));

    assert(engine.isPreloadPending());
    assert(!engine.hasPreloadedStems());
    // Not ready: no swap, no blocking, A keeps playing.
    assert(!engine.switchToPreloaded());
    assert(engine.loadedStems().size() == 2);
    assert(engine.loadedStems().front().id() == "a1");
    assert(engine.isPlaying());

    gate->release();
    bool hasStems = false;
    assert(ready->waitFor(ticket, hasStems));
    assert(hasStems);
    assert(!engine.isPreloadPending());
    assert(engine.hasPreloadedStems());

    assert(engine.switchToPreloaded());
    assert(engine.loadedStems().size() == 1);
    assert(engine.loadedStems().front().id() == "b1");
    assert(engine.isPlaying());
    assert(engine.positionSeconds() == 0.0);
    assert(!engine.hasPreloadedStems());
    assert(ready->countFor(ticket) == 1);

    std::cout << "[PASS] testAsyncPreloadDoesNotBlockAndSwitchWaitsUntilReady passed." << std::endl;
}

void testNewerAsyncPreloadReplacesOlder() {
    std::cout << "[TEST] Running testNewerAsyncPreloadReplacesOlder..." << std::endl;
    AudioEngine engine;
    assert(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav")}));
    engine.play();

    auto gate = std::make_shared<DecodeGate>();
    auto ready = std::make_shared<ReadyLog>();
    engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

    const auto ticketB = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
    assert(gate->waitEntered(1));
    // The user picks a different next song while B is still decoding.
    const auto ticketC = engine.preloadStemsAsync({MediaStem("c1", "Piano", "c_piano.wav")}, ready->callback(ready));
    assert(ticketC != 0 && ticketC != ticketB);
    assert(engine.isPreloadPending());

    gate->release();
    bool bHasStems = true;
    bool cHasStems = false;
    assert(ready->waitFor(ticketB, bHasStems));
    assert(!bHasStems); // B was replaced before it finished
    assert(ready->waitFor(ticketC, cHasStems));
    assert(cHasStems);

    assert(engine.switchToPreloaded());
    assert(engine.loadedStems().size() == 1);
    assert(engine.loadedStems().front().id() == "c1");

    std::cout << "[PASS] testNewerAsyncPreloadReplacesOlder passed." << std::endl;
}

void testSyncPreloadAndLoadCancelPendingAsync() {
    std::cout << "[TEST] Running testSyncPreloadAndLoadCancelPendingAsync..." << std::endl;
    {
        AudioEngine engine;
        assert(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav")}));
        auto gate = std::make_shared<DecodeGate>();
        auto ready = std::make_shared<ReadyLog>();
        engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

        const auto ticketB = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
        assert(gate->waitEntered(1));
        assert(engine.preloadStems({MediaStem("c1", "Piano", "c_piano.wav")}));
        assert(!engine.isPreloadPending());

        gate->release();
        bool bHasStems = true;
        assert(ready->waitFor(ticketB, bHasStems));
        assert(!bHasStems);
        // A late B must not overwrite the C that was preloaded after it.
        assert(engine.hasPreloadedStems());
        assert(engine.switchToPreloaded());
        assert(engine.loadedStems().front().id() == "c1");
    }
    {
        AudioEngine engine;
        assert(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav")}));
        auto gate = std::make_shared<DecodeGate>();
        auto ready = std::make_shared<ReadyLog>();
        engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

        const auto ticketB = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
        assert(gate->waitEntered(1));
        // Opening a different service order replaces everything, including the pending preload.
        assert(engine.loadStems({MediaStem("d1", "Bass", "d_bass.wav")}));
        assert(!engine.isPreloadPending());

        gate->release();
        bool bHasStems = true;
        assert(ready->waitFor(ticketB, bHasStems));
        assert(!bHasStems);
        assert(!engine.hasPreloadedStems());
        assert(!engine.switchToPreloaded());
        assert(engine.loadedStems().front().id() == "d1");
    }
    std::cout << "[PASS] testSyncPreloadAndLoadCancelPendingAsync passed." << std::endl;
}

void testEngineDestroyedWhilePreloadDecoding() {
    std::cout << "[TEST] Running testEngineDestroyedWhilePreloadDecoding..." << std::endl;
    auto gate = std::make_shared<DecodeGate>();
    auto ready = std::make_shared<ReadyLog>();
    AudioEngine::PreloadTicket ticket = 0;
    std::thread releaser;
    {
        AudioEngine engine;
        assert(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav")}));
        engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });
        ticket = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
        assert(gate->waitEntered(1));
        releaser = std::thread([gate] {
            std::this_thread::sleep_for(20ms);
            gate->release();
        });
        // Leaving scope must wait for the worker, not crash or leak a running thread.
    }
    releaser.join();
    bool hasStems = true;
    assert(ready->waitFor(ticket, hasStems));
    assert(!hasStems);
    std::cout << "[PASS] testEngineDestroyedWhilePreloadDecoding passed." << std::endl;
}

int main() {
    try {
        testAudioEngineStates();
        testStemMixerCalculation();
        testPreloadNextSongWhilePlaying();
        testSwitchToPreloadedStartsNextSongAtZero();
        testRealtimeHandoffKeepsSongAliveUntilAudioThreadLetsGo();
        testRealtimeHandoffLatestPublishWinsAndRetiresStack();
        testAsyncPreloadDoesNotBlockAndSwitchWaitsUntilReady();
        testNewerAsyncPreloadReplacesOlder();
        testSyncPreloadAndLoadCancelPendingAsync();
        testEngineDestroyedWhilePreloadDecoding();
        std::cout << "\nALL AUDIO ENGINE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in audio engine unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
