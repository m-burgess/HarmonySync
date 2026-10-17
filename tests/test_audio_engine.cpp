#include "AudioEngine.hpp"
#include "RealtimeHandoff.hpp"
#include "StemMixer.hpp"
#include "fake_audio_sink.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"
#include "test_wav.hpp"
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <utility>
#include <vector>

using namespace HarmonySync::Core;
using namespace HarmonySync::Media;

namespace {

using namespace std::chrono_literals;

// Engine that plays through a FakeAudioSink the test keeps a pointer to.
AudioEngine makeEngine(FakeAudioSink*& sinkOut) {
    auto sink = std::make_unique<FakeAudioSink>();
    sinkOut = sink.get();
    return AudioEngine(std::move(sink));
}

// Writes a short stereo WAV once and returns its path.
std::string makeWav(const TempDir& dir, const std::string& name, double seconds = 1.0) {
    const std::filesystem::path path = dir.path() / name;
    if (!std::filesystem::exists(path)) {
        const auto frames = static_cast<std::size_t>(seconds * 44100.0);
        writeFile(path, wav::pcm16(2, 44100, wav::constant(frames, 2, 1000)));
    }
    return path.string();
}

// Holds the async decode worker until the test releases it, so "still decoding" is deterministic.
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
            const std::lock_guard<std::mutex> lock(mutex);
            open = true;
        }
        cv.notify_all();
    }
    bool waitEntered(int count) {
        std::unique_lock<std::mutex> lock(mutex);
        return cv.wait_for(lock, 2s, [&] { return entered >= count; });
    }
};

// Records preload-ready callbacks, which arrive on the decode worker thread.
struct ReadyLog {
    std::mutex mutex;
    std::condition_variable cv;
    std::vector<std::pair<AudioEngine::PreloadTicket, bool>> calls;

    AudioEngine::PreloadReadyCallback callback(const std::shared_ptr<ReadyLog>& self) {
        return [self](AudioEngine::PreloadTicket ticket, bool hasStems) {
            {
                const std::lock_guard<std::mutex> lock(self->mutex);
                self->calls.emplace_back(ticket, hasStems);
            }
            self->cv.notify_all();
        };
    }
    // Waits for the callback of `ticket`; returns false on timeout, otherwise sets hasStems.
    bool waitFor(AudioEngine::PreloadTicket ticket, bool& hasStems) {
        std::unique_lock<std::mutex> lock(mutex);
        const bool found = cv.wait_for(lock, 2s, [&] {
            for (const auto& call : calls) {
                if (call.first == ticket)
                    return true;
            }
            return false;
        });
        if (found) {
            for (const auto& call : calls) {
                if (call.first == ticket)
                    hasStems = call.second;
            }
        }
        return found;
    }
    int countFor(AudioEngine::PreloadTicket ticket) {
        const std::lock_guard<std::mutex> lock(mutex);
        int n = 0;
        for (const auto& call : calls) {
            if (call.first == ticket)
                ++n;
        }
        return n;
    }
};

// Stand-in for a song's mapped buffers that counts when it is actually freed.
struct TrackedSongSet {
    std::string song;
    std::shared_ptr<int> destroyed;

    TrackedSongSet(std::string name, std::shared_ptr<int> counter)
        : song(std::move(name))
        , destroyed(std::move(counter)) {}
    TrackedSongSet(TrackedSongSet&& other) noexcept
        : song(std::move(other.song))
        , destroyed(std::move(other.destroyed)) {}
    TrackedSongSet& operator=(TrackedSongSet&&) = delete;
    TrackedSongSet(const TrackedSongSet&) = delete;
    TrackedSongSet& operator=(const TrackedSongSet&) = delete;
    ~TrackedSongSet() {
        if (destroyed) {
            ++*destroyed;
        }
    }
};

} // namespace

void testAudioEngineStates() {
    std::cout << "[TEST] Running testAudioEngineStates..." << std::endl;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);

    HS_CHECK(engine.playbackState() == PlaybackState::Stopped);
    HS_CHECK(!engine.isPlaying());
    engine.pause(); // not playing: stays stopped
    HS_CHECK(engine.playbackState() == PlaybackState::Stopped);
    engine.play(); // nothing loaded
    HS_CHECK(engine.playbackState() == PlaybackState::Stopped);

    MediaStem s1("1", "Drums", "drums.wav");
    MediaStem s2("2", "Bass", "bass.wav");
    MediaStem reference("3", "Reference Mix", "ref.wav");
    const std::vector<MediaStem> stems = {s1, s2, reference};

    HS_CHECK(engine.loadStems(stems));
    HS_CHECK(engine.loadedStems().size() == 2); // reference stems are not played

    engine.play();
    HS_CHECK(engine.playbackState() == PlaybackState::Playing);
    HS_CHECK(engine.isPlaying());

    engine.pause();
    HS_CHECK(engine.playbackState() == PlaybackState::Paused);
    HS_CHECK(!engine.isPlaying());

    engine.stop();
    HS_CHECK(engine.playbackState() == PlaybackState::Stopped);
    HS_CHECK(engine.positionSeconds() == 0.0);

    engine.setPitchShiftSemitones(-3);
    HS_CHECK(engine.pitchShiftSemitones() == -3);
    engine.setPitchShiftSemitones(40);
    HS_CHECK(engine.pitchShiftSemitones() == 12);
    engine.setPitchShiftSemitones(-40);
    HS_CHECK(engine.pitchShiftSemitones() == -12);

    HS_CHECK(!engine.loadStems({}));
    HS_CHECK(engine.loadedStems().empty());
    HS_CHECK(engine.durationSeconds() == 0.0);

    std::cout << "[PASS] testAudioEngineStates passed." << std::endl;
}

void testStemMixerCalculation() {
    std::cout << "[TEST] Running testStemMixerCalculation..." << std::endl;
    const StemMixer mixer;

    MediaStem drums("1", "Drums", "drums.wav");
    MediaStem bass("2", "Bass", "bass.wav");
    MediaStem keys("3", "Keys", "keys.wav");

    drums.setVolume(0.8f);
    bass.setVolume(1.0f);
    keys.setVolume(0.5f);

    std::vector<MediaStem> stems = {drums, bass, keys};

    // Normal mix calculation with master volume 1.0
    float gainDrums = mixer.calculateEffectiveGain(drums, stems, 1.0f);
    HS_CHECK(gainDrums == 0.8f);

    // Muted track test
    drums.setMuted(true);
    gainDrums = mixer.calculateEffectiveGain(drums, stems, 1.0f);
    HS_CHECK(gainDrums == 0.0f);

    // Solo precedence test
    bass.setSolo(true);
    stems = {drums, bass, keys}; // update solo on bass
    const float gainKeys = mixer.calculateEffectiveGain(keys, stems, 1.0f);
    HS_CHECK(gainKeys == 0.0f); // keys should be muted due to solo precedence on bass

    const float gainBass = mixer.calculateEffectiveGain(bass, stems, 1.0f);
    HS_CHECK(gainBass == 1.0f); // bass is soloed and should play at full volume

    std::cout << "[PASS] testStemMixerCalculation passed." << std::endl;
}

// #177 — load B while A plays, switch, drop A. B is already mapped when the switch happens.
void testPreloadNextSongWhilePlaying() {
    std::cout << "[TEST] Running testPreloadNextSongWhilePlaying..." << std::endl;
    const TempDir dir;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);

    const MediaStem songA("a1", "DrumsA", makeWav(dir, "song_a_drums.wav"));
    const MediaStem songB("b1", "DrumsB", makeWav(dir, "song_b_drums.wav"));

    HS_CHECK(engine.loadStems({songA}));
    engine.play();
    HS_CHECK(engine.isPlaying());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems()[0].id() == "a1");

    HS_CHECK(engine.preloadStems({songB}));
    HS_CHECK(engine.hasPreloadedStems());
    HS_CHECK(engine.liveSongSetCountForTesting() == 2); // all mapping happened before the switch
    // A must still be the loaded/playing set
    HS_CHECK(engine.isPlaying());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems()[0].id() == "a1");

    HS_CHECK(engine.switchToPreloaded());

    HS_CHECK(engine.isPlaying());
    HS_CHECK(!engine.hasPreloadedStems());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems()[0].id() == "b1"); // A dropped, B current

    std::cout << "[PASS] testPreloadNextSongWhilePlaying passed." << std::endl;
}

// #177 — switching starts B at 0, consumes the staged set, and restaging replaces it.
void testSwitchToPreloadedStartsNextSongAtZero() {
    std::cout << "[TEST] Running testSwitchToPreloadedStartsNextSongAtZero..." << std::endl;
    const TempDir dir;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);

    HS_CHECK(!engine.switchToPreloaded()); // nothing staged

    const MediaStem songA("a1", "DrumsA", makeWav(dir, "song_a_drums.wav", 4.0));
    const MediaStem songB("b1", "DrumsB", makeWav(dir, "song_b_drums.wav"));
    const MediaStem songC("c1", "KeysC", makeWav(dir, "song_c_keys.wav"));

    HS_CHECK(engine.loadStems({songA}));
    engine.play();
    HS_CHECK(engine.durationSeconds() == 4.0);
    engine.seek(2.0); // A is partway in
    HS_CHECK(engine.positionSeconds() == 2.0);

    HS_CHECK(engine.preloadStems({songB}));
    HS_CHECK(engine.preloadStems({songC})); // restaging replaces B
    HS_CHECK(engine.hasPreloadedStems());
    HS_CHECK(engine.loadedStems()[0].id() == "a1");

    HS_CHECK(engine.switchToPreloaded());
    HS_CHECK(engine.positionSeconds() == 0.0); // B starts at the top, not at A's position
    HS_CHECK(engine.isPlaying());
    HS_CHECK(!engine.hasPreloadedStems());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems()[0].id() == "c1");
    HS_CHECK(engine.durationSeconds() == 1.0);

    HS_CHECK(!engine.switchToPreloaded()); // staged set was consumed
    HS_CHECK(engine.loadedStems()[0].id() == "c1");

    std::cout << "[PASS] testSwitchToPreloadedStartsNextSongAtZero passed." << std::endl;
}

// #177 — the audio-side handoff, without a real audio device.
// Control thread: publish()/reclaimRetired(). Audio thread: acquirePending()/current().
void testRealtimeHandoffKeepsSongAliveUntilAudioThreadLetsGo() {
    std::cout << "[TEST] Running testRealtimeHandoffKeepsSongAliveUntilAudioThreadLetsGo..." << std::endl;
    auto aFreed = std::make_shared<int>(0);
    auto bFreed = std::make_shared<int>(0);

    {
        RealtimeHandoff<TrackedSongSet> handoff;
        HS_CHECK(handoff.current() == nullptr);
        HS_CHECK(handoff.latest() == nullptr);
        HS_CHECK(!handoff.acquirePending());
        handoff.resetCurrent(TrackedSongSet("A", aFreed));
        HS_CHECK(handoff.current() != nullptr);
        HS_CHECK(handoff.current()->song == "A");
        HS_CHECK(!handoff.hasPending());

        // Audio thread is mid-read of A when the control thread switches.
        const TrackedSongSet* beingRead = handoff.current();
        handoff.publish(TrackedSongSet("B", bFreed));
        HS_CHECK(handoff.hasPending());
        HS_CHECK(handoff.current() == beingRead); // switch did not touch the buffers being read
        HS_CHECK(beingRead->song == "A");
        HS_CHECK(handoff.reclaimRetired() == 0); // A is still in use, nothing to free
        HS_CHECK(*aFreed == 0);

        // Next audio callback takes B at the top.
        HS_CHECK(handoff.acquirePending());
        HS_CHECK(handoff.current()->song == "B");
        HS_CHECK(!handoff.hasPending());
        HS_CHECK(*aFreed == 0);              // not freed on the audio thread
        HS_CHECK(!handoff.acquirePending()); // nothing new staged

        // Control thread frees A after the handoff.
        HS_CHECK(handoff.reclaimRetired() == 1);
        HS_CHECK(*aFreed == 1);
        HS_CHECK(*bFreed == 0);
        HS_CHECK(handoff.current()->song == "B");

        handoff.clear();
        HS_CHECK(handoff.current() == nullptr);
        HS_CHECK(*bFreed == 1);
    }

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
        HS_CHECK(*bFreed == 1);
        HS_CHECK(handoff.latest() != nullptr && handoff.latest()->song == "C");
        HS_CHECK(handoff.current()->song == "A");

        HS_CHECK(handoff.acquirePending());
        HS_CHECK(handoff.current()->song == "C");

        // Another switch is taken before the control thread reclaims: A and C both wait.
        handoff.publish(TrackedSongSet("D", dFreed));
        HS_CHECK(handoff.acquirePending());
        HS_CHECK(handoff.current()->song == "D");
        HS_CHECK(*aFreed == 0);
        HS_CHECK(*cFreed == 0);

        HS_CHECK(handoff.reclaimRetired() == 2);
        HS_CHECK(*aFreed == 1);
        HS_CHECK(*cFreed == 1);
        HS_CHECK(*dFreed == 0);
    }
    HS_CHECK(*dFreed == 1);
    HS_CHECK(*bFreed == 1); // never double-freed

    std::cout << "[PASS] testRealtimeHandoffLatestPublishWinsAndRetiresStack passed." << std::endl;
}

// #185 (QA line-721 failure): an unacknowledged handoff keeps the outgoing song as current, and
// nothing is retired; once the audio thread takes it, a control-thread reclaim frees the old song
// without another publish. Device-free: this thread plays the audio thread's part.
void testRetiredSongFreedAfterAcknowledgeWithoutAnotherSwitch() {
    std::cout << "[TEST] Running testRetiredSongFreedAfterAcknowledgeWithoutAnotherSwitch..." << std::endl;
    auto aFreed = std::make_shared<int>(0);
    auto bFreed = std::make_shared<int>(0);
    {
        RealtimeHandoff<TrackedSongSet> handoff;
        handoff.resetCurrent(TrackedSongSet("A", aFreed));
        handoff.publish(TrackedSongSet("B", bFreed));

        // The sink has not pulled yet: A is still current, B pending, nothing to reclaim.
        HS_CHECK(handoff.hasPending());
        HS_CHECK(handoff.reclaimRetired() == 0);
        HS_CHECK(*aFreed == 0);

        HS_CHECK(handoff.acquirePending()); // the audio callback runs once
        HS_CHECK(handoff.current()->song == "B");
        HS_CHECK(*aFreed == 0); // retired, never freed on the audio thread

        HS_CHECK(handoff.reclaimRetired() == 1); // next control-thread call, no new publish
        HS_CHECK(*aFreed == 1);
        HS_CHECK(*bFreed == 0);
    }
    HS_CHECK(*bFreed == 1);
    std::cout << "[PASS] testRetiredSongFreedAfterAcknowledgeWithoutAnotherSwitch passed." << std::endl;
}

void testAsyncPreloadDoesNotBlockAndSwitchWaitsUntilReady() {
    std::cout << "[TEST] Running testAsyncPreloadDoesNotBlockAndSwitchWaitsUntilReady..." << std::endl;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);
    HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav"), MediaStem("a2", "Bass", "a_bass.wav")}));
    engine.play();

    auto gate = std::make_shared<DecodeGate>();
    auto ready = std::make_shared<ReadyLog>();
    engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

    // Song B is still "decoding" for as long as the gate is shut. The call returning while the
    // gate is shut is the proof it does not wait for the decode; no wall-clock limit (#185:
    // a 50ms limit flaked at 39-41ms under ThreadSanitizer).
    const auto ticket = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
    HS_CHECK(ticket != 0);
    HS_CHECK(gate->waitEntered(1));

    // The decode is held, so it cannot have finished or reported yet.
    HS_CHECK(ready->countFor(ticket) == 0);
    HS_CHECK(engine.isPreloadPending());
    HS_CHECK(!engine.hasPreloadedStems());
    // Not ready: no swap, no blocking, A keeps playing.
    HS_CHECK(!engine.switchToPreloaded());
    HS_CHECK(engine.loadedStems().size() == 2);
    HS_CHECK(engine.loadedStems().front().id() == "a1");
    HS_CHECK(engine.isPlaying());

    gate->release();
    bool hasStems = false;
    HS_CHECK(ready->waitFor(ticket, hasStems));
    HS_CHECK(hasStems);
    HS_CHECK(!engine.isPreloadPending());
    HS_CHECK(engine.hasPreloadedStems());

    HS_CHECK(engine.switchToPreloaded());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems().front().id() == "b1");
    HS_CHECK(engine.isPlaying());
    HS_CHECK(engine.positionSeconds() == 0.0);
    HS_CHECK(!engine.hasPreloadedStems());
    HS_CHECK(ready->countFor(ticket) == 1);

    std::cout << "[PASS] testAsyncPreloadDoesNotBlockAndSwitchWaitsUntilReady passed." << std::endl;
}

void testNewerAsyncPreloadReplacesOlder() {
    std::cout << "[TEST] Running testNewerAsyncPreloadReplacesOlder..." << std::endl;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);
    HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav")}));
    engine.play();

    auto gate = std::make_shared<DecodeGate>();
    auto ready = std::make_shared<ReadyLog>();
    engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

    const auto ticketB = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
    HS_CHECK(gate->waitEntered(1));
    // The user picks a different next song while B is still decoding.
    const auto ticketC = engine.preloadStemsAsync({MediaStem("c1", "Piano", "c_piano.wav")}, ready->callback(ready));
    HS_CHECK(ticketC != 0 && ticketC != ticketB);
    HS_CHECK(engine.isPreloadPending());

    gate->release();
    bool bHasStems = true;
    bool cHasStems = false;
    HS_CHECK(ready->waitFor(ticketB, bHasStems));
    HS_CHECK(!bHasStems); // B was replaced before it finished
    HS_CHECK(ready->waitFor(ticketC, cHasStems));
    HS_CHECK(cHasStems);

    HS_CHECK(engine.switchToPreloaded());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems().front().id() == "c1");

    std::cout << "[PASS] testNewerAsyncPreloadReplacesOlder passed." << std::endl;
}

void testSyncPreloadAndLoadCancelPendingAsync() {
    std::cout << "[TEST] Running testSyncPreloadAndLoadCancelPendingAsync..." << std::endl;
    {
        FakeAudioSink* sink = nullptr;
        AudioEngine engine = makeEngine(sink);
        HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav")}));
        auto gate = std::make_shared<DecodeGate>();
        auto ready = std::make_shared<ReadyLog>();
        engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

        const auto ticketB = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
        HS_CHECK(gate->waitEntered(1));
        HS_CHECK(engine.preloadStems({MediaStem("c1", "Piano", "c_piano.wav")}));
        HS_CHECK(!engine.isPreloadPending());

        gate->release();
        bool bHasStems = true;
        HS_CHECK(ready->waitFor(ticketB, bHasStems));
        HS_CHECK(!bHasStems);
        // A late B must not overwrite the C that was preloaded after it.
        HS_CHECK(engine.hasPreloadedStems());
        HS_CHECK(engine.switchToPreloaded());
        HS_CHECK(engine.loadedStems().front().id() == "c1");
    }
    {
        FakeAudioSink* sink = nullptr;
        AudioEngine engine = makeEngine(sink);
        HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav")}));
        auto gate = std::make_shared<DecodeGate>();
        auto ready = std::make_shared<ReadyLog>();
        engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

        const auto ticketB = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
        HS_CHECK(gate->waitEntered(1));
        // Opening a different service order replaces everything, including the pending preload.
        HS_CHECK(engine.loadStems({MediaStem("d1", "Bass", "d_bass.wav")}));
        HS_CHECK(!engine.isPreloadPending());

        gate->release();
        bool bHasStems = true;
        HS_CHECK(ready->waitFor(ticketB, bHasStems));
        HS_CHECK(!bHasStems);
        HS_CHECK(!engine.hasPreloadedStems());
        HS_CHECK(!engine.switchToPreloaded());
        HS_CHECK(engine.loadedStems().front().id() == "d1");
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
        FakeAudioSink* sink = nullptr;
        AudioEngine engine = makeEngine(sink);
        HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", "a_drums.wav")}));
        engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });
        ticket = engine.preloadStemsAsync({MediaStem("b1", "Keys", "b_keys.wav")}, ready->callback(ready));
        HS_CHECK(gate->waitEntered(1));
        releaser = std::thread([gate] { gate->release(); });
        // Leaving scope must wait for the worker, not crash or leak a running thread. Whether the
        // release lands before or after the engine cancels the job does not matter here.
    }
    releaser.join();
    HS_CHECK(ready->countFor(ticket) == 1); // the worker had finished by the time the engine was gone
    std::cout << "[PASS] testEngineDestroyedWhilePreloadDecoding passed." << std::endl;
}

// #185: clearing the next song frees it and leaves the current song playing.
void testClearPreloadedDropsNextSongAndKeepsCurrentPlaying() {
    std::cout << "[TEST] Running testClearPreloadedDropsNextSongAndKeepsCurrentPlaying..." << std::endl;
    const TempDir dir;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);
    HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", makeWav(dir, "a_drums.wav"))}));
    engine.play();
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);

    // Nothing preloaded yet: clearing is a no-op.
    engine.clearPreloaded();
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);
    HS_CHECK(engine.isPlaying());

    // A synchronously preloaded song is freed.
    HS_CHECK(engine.preloadStems({MediaStem("b1", "Keys", makeWav(dir, "b_keys.wav"))}));
    HS_CHECK(engine.liveSongSetCountForTesting() == 2);
    engine.clearPreloaded();
    HS_CHECK(!engine.hasPreloadedStems());
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);
    HS_CHECK(!engine.switchToPreloaded());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems().front().id() == "a1");
    HS_CHECK(engine.isPlaying());

    // A finished but not yet adopted async preload is freed too.
    auto ready = std::make_shared<ReadyLog>();
    const auto ticket =
        engine.preloadStemsAsync({MediaStem("c1", "Piano", makeWav(dir, "c_piano.wav"))}, ready->callback(ready));
    bool hasStems = false;
    HS_CHECK(ready->waitFor(ticket, hasStems));
    HS_CHECK(hasStems);
    HS_CHECK(engine.hasPreloadedStems());
    HS_CHECK(engine.liveSongSetCountForTesting() == 2);
    engine.clearPreloaded();
    HS_CHECK(!engine.hasPreloadedStems());
    HS_CHECK(!engine.isPreloadPending());
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);
    HS_CHECK(!engine.switchToPreloaded());
    HS_CHECK(engine.loadedStems().front().id() == "a1");
    HS_CHECK(engine.isPlaying());

    std::cout << "[PASS] testClearPreloadedDropsNextSongAndKeepsCurrentPlaying passed." << std::endl;
}

// #185: clearing while the next song is still decoding cancels it; its result is never adopted.
void testClearPreloadedCancelsPendingDecode() {
    std::cout << "[TEST] Running testClearPreloadedCancelsPendingDecode..." << std::endl;
    const TempDir dir;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);
    HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", makeWav(dir, "a_drums.wav"))}));
    engine.play();

    auto gate = std::make_shared<DecodeGate>();
    auto ready = std::make_shared<ReadyLog>();
    engine.setPreloadDecodeHookForTesting([gate] { gate->wait(); });

    const auto ticket =
        engine.preloadStemsAsync({MediaStem("b1", "Keys", makeWav(dir, "b_keys.wav"))}, ready->callback(ready));
    HS_CHECK(gate->waitEntered(1));
    HS_CHECK(engine.isPreloadPending());

    engine.clearPreloaded(); // must not wait for the held decode
    HS_CHECK(!engine.isPreloadPending());
    HS_CHECK(!engine.hasPreloadedStems());
    HS_CHECK(!engine.switchToPreloaded());
    HS_CHECK(engine.isPlaying());
    HS_CHECK(engine.loadedStems().front().id() == "a1");

    gate->release();
    bool hasStems = true;
    HS_CHECK(ready->waitFor(ticket, hasStems));
    HS_CHECK(!hasStems);
    HS_CHECK(ready->countFor(ticket) == 1);

    // The late result is not adopted, and nothing of B is left behind.
    HS_CHECK(!engine.hasPreloadedStems());
    HS_CHECK(!engine.switchToPreloaded());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems().front().id() == "a1");
    HS_CHECK(engine.isPlaying());
    engine.clearPreloaded(); // joins the finished worker
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);

    std::cout << "[PASS] testClearPreloadedCancelsPendingDecode passed." << std::endl;
}

// Cancelled after the worker's last cancel check: the finished result must still be freed
// without another engine call, so opening a new order releases the old song set.
void testClearPreloadedFreesWorkerPastCancelCheck() {
    std::cout << "[TEST] Running testClearPreloadedFreesWorkerPastCancelCheck..." << std::endl;
    const TempDir dir;
    AudioEngine engine;
    HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", makeWav(dir, "a_drums.wav"))}));
    engine.play();
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);

    auto gate = std::make_shared<DecodeGate>();
    auto ready = std::make_shared<ReadyLog>();
    engine.setPreloadFinishHookForTesting([gate] { gate->wait(); });
    const auto ticket =
        engine.preloadStemsAsync({MediaStem("b1", "Keys", makeWav(dir, "b_keys.wav"))}, ready->callback(ready));
    HS_CHECK(gate->waitEntered(1)); // decoded B, past its cancel checks, not yet done
    HS_CHECK(engine.liveSongSetCountForTesting() == 2);

    engine.clearPreloaded(); // worker is not done, so it cannot be joined here
    gate->release();
    bool hasStems = false;
    HS_CHECK(ready->waitFor(ticket, hasStems));

    // No further engine calls: B's set must be released on its own.
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(5);
    while (engine.liveSongSetCountForTesting() != 1 && std::chrono::steady_clock::now() < deadline) {
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);
    HS_CHECK(engine.isPlaying());

    std::cout << "[PASS] testClearPreloadedFreesWorkerPastCancelCheck passed." << std::endl;
}

// #185: unloading the current song stops it and frees it; the preloaded song survives.
void testUnloadCurrentWhilePlaying() {
    std::cout << "[TEST] Running testUnloadCurrentWhilePlaying..." << std::endl;
    const TempDir dir;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);

    engine.unloadCurrent(); // nothing loaded: no-op
    HS_CHECK(engine.liveSongSetCountForTesting() == 0);

    HS_CHECK(engine.loadStems({MediaStem("a1", "Drums", makeWav(dir, "a_drums.wav"))}));
    engine.play();
    HS_CHECK(engine.isPlaying());
    HS_CHECK(engine.preloadStems({MediaStem("b1", "Keys", makeWav(dir, "b_keys.wav"))}));
    HS_CHECK(engine.liveSongSetCountForTesting() == 2);

    engine.unloadCurrent();
    HS_CHECK(engine.playbackState() == PlaybackState::Stopped);
    HS_CHECK(!engine.isPlaying());
    HS_CHECK(engine.loadedStems().empty());
    HS_CHECK(engine.positionSeconds() == 0.0);
    HS_CHECK(engine.durationSeconds() == 0.0);
    HS_CHECK(engine.liveSongSetCountForTesting() == 1); // only the preloaded B is left
    HS_CHECK(!sink->isRunning());

    engine.play(); // nothing to play
    HS_CHECK(!engine.isPlaying());

    HS_CHECK(engine.hasPreloadedStems());
    HS_CHECK(engine.switchToPreloaded());
    HS_CHECK(engine.loadedStems().size() == 1);
    HS_CHECK(engine.loadedStems().front().id() == "b1");
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);
    engine.play();
    HS_CHECK(engine.isPlaying());

    engine.unloadCurrent();
    HS_CHECK(!engine.isPlaying());
    HS_CHECK(engine.loadedStems().empty());
    HS_CHECK(engine.liveSongSetCountForTesting() == 0);
    HS_CHECK(!engine.switchToPreloaded());

    std::cout << "[PASS] testUnloadCurrentWhilePlaying passed." << std::endl;
}

// #185: over 50 song switches the engine never holds more than one current and one next song.
// The fake sink plays the audio thread: it pulls once after each switch to take the handoff.
void testMemoryStaysBoundedOverFiftySwitches() {
    std::cout << "[TEST] Running testMemoryStaysBoundedOverFiftySwitches..." << std::endl;
    const TempDir dir;
    const std::vector<std::string> files = {makeWav(dir, "s0.wav"), makeWav(dir, "s1.wav"), makeWav(dir, "s2.wav")};
    auto songStems = [&files](int i) {
        const std::string id = "song" + std::to_string(i);
        return std::vector<MediaStem>{MediaStem(id + "-drums", "Drums", files[static_cast<std::size_t>(i % 3)]),
                                      MediaStem(id + "-bass", "Bass", files[static_cast<std::size_t>((i + 1) % 3)])};
    };

    FakeAudioSink* sink = nullptr;
    AudioEngine engine = makeEngine(sink);
    HS_CHECK(engine.loadStems(songStems(0)));
    engine.play();
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);

    auto ready = std::make_shared<ReadyLog>();
    for (int i = 1; i <= 50; ++i) {
        const auto ticket = engine.preloadStemsAsync(songStems(i), ready->callback(ready));
        bool hasStems = false;
        HS_CHECK(ready->waitFor(ticket, hasStems));
        HS_CHECK(hasStems);
        // Current + preloaded; the previous switch was acknowledged, so its outgoing song is freed.
        HS_CHECK(engine.liveSongSetCountForTesting() <= 2);

        HS_CHECK(engine.switchToPreloaded());
        HS_CHECK(engine.isPlaying());
        HS_CHECK(engine.loadedStems().front().id() == "song" + std::to_string(i) + "-drums");
        // Before the sink pulls, the outgoing and the incoming song are both held.
        HS_CHECK(engine.liveSongSetCountForTesting() <= 2);
        HS_CHECK(sink->pull(64).size() == 128); // the audio thread takes the handoff
    }

    // One more next song, then clear it: only the current song is left.
    const auto ticket = engine.preloadStemsAsync(songStems(51), ready->callback(ready));
    bool hasStems = false;
    HS_CHECK(ready->waitFor(ticket, hasStems));
    HS_CHECK(hasStems);
    engine.clearPreloaded();
    HS_CHECK(engine.liveSongSetCountForTesting() == 1);
    HS_CHECK(engine.isPlaying());

    engine.unloadCurrent();
    HS_CHECK(engine.liveSongSetCountForTesting() == 0);
    HS_CHECK(!engine.isPlaying());

    std::cout << "[PASS] testMemoryStaysBoundedOverFiftySwitches passed." << std::endl;
}

int main() {
    try {
        testAudioEngineStates();
        testStemMixerCalculation();
        testPreloadNextSongWhilePlaying();
        testSwitchToPreloadedStartsNextSongAtZero();
        testRealtimeHandoffKeepsSongAliveUntilAudioThreadLetsGo();
        testRealtimeHandoffLatestPublishWinsAndRetiresStack();
        testRetiredSongFreedAfterAcknowledgeWithoutAnotherSwitch();
        testAsyncPreloadDoesNotBlockAndSwitchWaitsUntilReady();
        testNewerAsyncPreloadReplacesOlder();
        testSyncPreloadAndLoadCancelPendingAsync();
        testEngineDestroyedWhilePreloadDecoding();
        testClearPreloadedDropsNextSongAndKeepsCurrentPlaying();
        testClearPreloadedCancelsPendingDecode();
        testClearPreloadedFreesWorkerPastCancelCheck();
        testUnloadCurrentWhilePlaying();
        testMemoryStaysBoundedOverFiftySwitches();
        std::cout << "\nALL AUDIO ENGINE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in audio engine unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
