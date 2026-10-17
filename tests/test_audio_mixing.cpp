#include "AudioEngine.hpp"
#include "fake_audio_sink.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"
#include "test_wav.hpp"
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <memory>
#include <numbers>
#include <string>
#include <utility>
#include <vector>

using namespace HarmonySync::Core;
using namespace HarmonySync::Media;

namespace {

constexpr std::int16_t kHalf = 16384; // 0.5 full scale

// Engine plus the scratch directory its WAVs live in, playing through a FakeAudioSink.
struct Rig {
    TempDir dir;
    FakeAudioSink* sink = nullptr;
    AudioEngine engine;

    Rig()
        : engine(makeEngine(sink)) {}

    static AudioEngine makeEngine(FakeAudioSink*& sinkOut) {
        auto fake = std::make_unique<FakeAudioSink>();
        sinkOut = fake.get();
        return AudioEngine(std::move(fake));
    }

    std::string writeWav(const std::string& name, std::uint16_t channels,
                         const std::vector<std::int16_t>& samples) const {
        const std::filesystem::path path = dir.path() / name;
        writeFile(path, wav::pcm16(channels, 44100, samples));
        return path.string();
    }

    // Stereo stem holding one constant level on both channels. Each call writes a new file, so a
    // song that is still mapped is never rewritten.
    MediaStem stem(const std::string& name, std::int16_t level, float pan, std::size_t frames = 4410) {
        MediaStem result(
            name, name,
            writeWav(name + "_" + std::to_string(m_fileCount++) + ".wav", 2, wav::constant(frames, 2, level)));
        result.setPan(pan);
        return result;
    }

private:
    int m_fileCount = 0;
};

bool near(int a, int b, int tolerance = 2) {
    return std::abs(a - b) <= tolerance;
}

// True if every sample of `channel` (0 = left, 1 = right) is within 2 of `expected`.
bool channelIs(const std::vector<std::int16_t>& pcm, std::size_t channel, int expected) {
    for (std::size_t i = channel; i < pcm.size(); i += 2) {
        if (!near(pcm[i], expected)) {
            return false;
        }
    }
    return !pcm.empty();
}

bool allZero(const std::vector<std::int16_t>& pcm) {
    for (const std::int16_t sample : pcm) {
        if (sample != 0) {
            return false;
        }
    }
    return true;
}

} // namespace

void testPanLawAndVolume() {
    std::cout << "[TEST] Running testPanLawAndVolume..." << std::endl;
    Rig rig;

    const auto levelAt = [&rig](float pan, float volume, float master) {
        MediaStem keys = rig.stem("Keys", kHalf, pan);
        keys.setVolume(volume);
        HS_CHECK(rig.engine.loadStems({keys}));
        rig.engine.setMasterVolume(master);
        rig.engine.play();
        return rig.sink->pull(64);
    };

    // Hard left: all signal on the left channel.
    auto pcm = levelAt(-1.0f, 1.0f, 1.0f);
    HS_CHECK(pcm.size() == 128);
    HS_CHECK(channelIs(pcm, 0, 16383));
    HS_CHECK(channelIs(pcm, 1, 0));

    // Hard right.
    pcm = levelAt(1.0f, 1.0f, 1.0f);
    HS_CHECK(channelIs(pcm, 0, 0));
    HS_CHECK(channelIs(pcm, 1, 16383));

    // Centre is equal power: -3 dB on each side.
    const int centre = static_cast<int>(0.5 * std::cos(std::numbers::pi / 4.0) * 32767.0);
    pcm = levelAt(0.0f, 1.0f, 1.0f);
    HS_CHECK(channelIs(pcm, 0, centre));
    HS_CHECK(channelIs(pcm, 1, centre));

    // Stem volume and master volume scale linearly.
    pcm = levelAt(-1.0f, 0.5f, 1.0f);
    HS_CHECK(channelIs(pcm, 0, 8191));
    pcm = levelAt(-1.0f, 1.0f, 0.5f);
    HS_CHECK(channelIs(pcm, 0, 8191));
    pcm = levelAt(-1.0f, 1.0f, 0.0f);
    HS_CHECK(allZero(pcm));

    rig.engine.setMasterVolume(7.0f);
    HS_CHECK(rig.engine.masterVolume() == 1.0f);
    rig.engine.setMasterVolume(-1.0f);
    HS_CHECK(rig.engine.masterVolume() == 0.0f);

    std::cout << "[PASS] testPanLawAndVolume passed." << std::endl;
}

void testStereoSourceKeepsChannelsApartAndMonoIsDuplicated() {
    std::cout << "[TEST] Running testStereoSourceKeepsChannelsApartAndMonoIsDuplicated..." << std::endl;
    Rig rig;

    // Left carries +0.5, right carries -0.25.
    std::vector<std::int16_t> samples;
    for (int frame = 0; frame < 4410; ++frame) {
        samples.push_back(kHalf);
        samples.push_back(-8192);
    }
    MediaStem stereo("s", "Split", rig.writeWav("split.wav", 2, samples));
    stereo.setPan(-1.0f); // left gain 1, right gain 0
    HS_CHECK(rig.engine.loadStems({stereo}));
    rig.engine.play();
    auto pcm = rig.sink->pull(32);
    HS_CHECK(channelIs(pcm, 0, 16383));
    HS_CHECK(channelIs(pcm, 1, 0));

    stereo.setPan(1.0f); // right gain 1: the right channel's own sample comes through
    HS_CHECK(rig.engine.loadStems({stereo}));
    rig.engine.play();
    pcm = rig.sink->pull(32);
    HS_CHECK(channelIs(pcm, 0, 0));
    HS_CHECK(channelIs(pcm, 1, -8192));

    // A mono file feeds both sides with the same sample.
    MediaStem mono("m", "Lead", rig.writeWav("lead.wav", 1, wav::constant(4410, 1, kHalf)));
    mono.setPan(0.0f);
    HS_CHECK(rig.engine.loadStems({mono}));
    rig.engine.play();
    pcm = rig.sink->pull(32);
    HS_CHECK(near(pcm[0], pcm[1], 1));
    HS_CHECK(pcm[0] > 11000);

    std::cout << "[PASS] testStereoSourceKeepsChannelsApartAndMonoIsDuplicated passed." << std::endl;
}

void testMuteSoloAndClipping() {
    std::cout << "[TEST] Running testMuteSoloAndClipping..." << std::endl;
    Rig rig;
    const MediaStem low = rig.stem("Low", 6554, -1.0f);    // 0.2
    const MediaStem high = rig.stem("High", 13107, -1.0f); // 0.4
    HS_CHECK(rig.engine.loadStems({low, high}));
    rig.engine.play();

    // Both stems sum.
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 19660));

    rig.engine.setStemMuted(0, true);
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 13106));
    rig.engine.setStemMuted(0, false);

    // Solo silences everything that is not soloed.
    rig.engine.setStemSolo(0, true);
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 6553));
    // A soloed stem that is also muted stays silent.
    rig.engine.setStemMuted(0, true);
    HS_CHECK(allZero(rig.sink->pull(16)));
    rig.engine.setStemMuted(0, false);
    rig.engine.setStemSolo(0, false);

    rig.engine.setStemVolume(1, 0.5f);
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 6553 + 6553));

    // Indices outside the stem list change nothing.
    rig.engine.setStemVolume(-1, 0.0f);
    rig.engine.setStemVolume(2, 0.0f);
    rig.engine.setStemMuted(-1, true);
    rig.engine.setStemMuted(2, true);
    rig.engine.setStemSolo(-1, true);
    rig.engine.setStemSolo(2, true);
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 6553 + 6553));

    // Two loud stems add up past full scale and clip instead of wrapping.
    const MediaStem loudA = rig.stem("LoudA", 26214, -1.0f); // 0.8
    const MediaStem loudB = rig.stem("LoudB", 26214, -1.0f);
    HS_CHECK(rig.engine.loadStems({loudA, loudB}));
    rig.engine.play();
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 32767));

    std::cout << "[PASS] testMuteSoloAndClipping passed." << std::endl;
}

void testPlaybackPositionPauseAndEndOfSong() {
    std::cout << "[TEST] Running testPlaybackPositionPauseAndEndOfSong..." << std::endl;
    Rig rig;
    // 441 frames = 10 ms.
    const MediaStem keys = rig.stem("Keys", kHalf, -1.0f, 441);
    HS_CHECK(rig.engine.loadStems({keys}));
    HS_CHECK(std::abs(rig.engine.durationSeconds() - 0.01) < 1e-12);
    HS_CHECK(rig.sink->bytesAvailable() == 44100 * 2 * sizeof(float));

    // Not playing yet: the sink gets silence and the position stays put.
    auto pcm = rig.sink->pull(100);
    HS_CHECK(pcm.size() == 200);
    HS_CHECK(allZero(pcm));
    HS_CHECK(rig.engine.positionSeconds() == 0.0);

    rig.engine.play();
    pcm = rig.sink->pull(100);
    HS_CHECK(channelIs(pcm, 0, 16383));
    HS_CHECK(std::abs(rig.engine.positionSeconds() - 100.0 / 44100.0) < 1e-9);

    // Paused: silence, position frozen.
    rig.engine.pause();
    pcm = rig.sink->pull(100);
    HS_CHECK(allZero(pcm));
    HS_CHECK(std::abs(rig.engine.positionSeconds() - 100.0 / 44100.0) < 1e-9);
    rig.engine.play();

    // Seek moves where the next pull starts reading.
    rig.engine.seek(-3.0);
    HS_CHECK(rig.engine.positionSeconds() == 0.0);
    rig.engine.seek(5.0);
    HS_CHECK(rig.engine.positionSeconds() == rig.engine.durationSeconds()); // clamped to the song length

    // Running off the end plays what is left, pads with silence, stops and rewinds.
    rig.engine.seek(0.0);
    pcm = rig.sink->pull(600);
    HS_CHECK(pcm.size() == 1200);
    HS_CHECK(near(pcm[2 * 440], 16383));
    HS_CHECK(pcm[2 * 441] == 0);
    HS_CHECK(rig.engine.playbackState() == PlaybackState::Stopped);
    HS_CHECK(rig.engine.positionSeconds() == 0.0);
    HS_CHECK(allZero(rig.sink->pull(10)));

    rig.engine.play();
    HS_CHECK(rig.engine.isPlaying());

    std::cout << "[PASS] testPlaybackPositionPauseAndEndOfSong passed." << std::endl;
}

void testSeekStartsReadingAtThatPosition() {
    std::cout << "[TEST] Running testSeekStartsReadingAtThatPosition..." << std::endl;
    Rig rig;
    // First half-second is quiet, the rest is loud.
    std::vector<std::int16_t> samples = wav::constant(22050, 2, 3277);
    const std::vector<std::int16_t> loud = wav::constant(22050, 2, 16384);
    samples.insert(samples.end(), loud.begin(), loud.end());
    MediaStem keys("k", "Keys", rig.writeWav("keys.wav", 2, samples));
    keys.setPan(-1.0f);
    HS_CHECK(rig.engine.loadStems({keys}));
    rig.engine.play();

    HS_CHECK(channelIs(rig.sink->pull(8), 0, 3276));
    rig.engine.seek(0.5);
    HS_CHECK(channelIs(rig.sink->pull(8), 0, 16383));
    rig.engine.seek(0.25);
    HS_CHECK(channelIs(rig.sink->pull(8), 0, 3276));

    std::cout << "[PASS] testSeekStartsReadingAtThatPosition passed." << std::endl;
}

void testSongDurationFollowsGuideStems() {
    std::cout << "[TEST] Running testSongDurationFollowsGuideStems..." << std::endl;
    Rig rig;
    const MediaStem pad = rig.stem("Pad", kHalf, 0.0f, 44100);
    const MediaStem click = rig.stem("Click", kHalf, -1.0f, 22050);
    const MediaStem reference = rig.stem("Reference Mix", kHalf, 0.0f, 88200);

    // A click/guide/split/stereo track defines the song length even when another stem is longer.
    HS_CHECK(rig.engine.loadStems({pad, click, reference}));
    HS_CHECK(rig.engine.durationSeconds() == 0.5);
    HS_CHECK(rig.engine.loadedStems().size() == 2); // the reference mix is never loaded

    // Without one, the longest stem wins.
    const MediaStem keys = rig.stem("Keys", kHalf, 0.0f, 11025);
    HS_CHECK(rig.engine.loadStems({pad, keys}));
    HS_CHECK(rig.engine.durationSeconds() == 1.0);

    for (const char* guideName : {"Guide", "Split", "Stereo"}) {
        const MediaStem guide = rig.stem(guideName, kHalf, 0.0f, 22050);
        HS_CHECK(rig.engine.loadStems({pad, guide}));
        HS_CHECK(rig.engine.durationSeconds() == 0.5);
    }

    std::cout << "[PASS] testSongDurationFollowsGuideStems passed." << std::endl;
}

void testStemsThatCannotBeMappedAreSkipped() {
    std::cout << "[TEST] Running testStemsThatCannotBeMappedAreSkipped..." << std::endl;
    Rig rig;
    writeFile(rig.dir.path() / "broken.wav", "this is not a wav file");
    const MediaStem broken("b", "Broken", (rig.dir.path() / "broken.wav").string());
    const MediaStem missing("m", "Missing", (rig.dir.path() / "missing.wav").string());
    const MediaStem good = rig.stem("Good", kHalf, -1.0f);

    // The stem list keeps every stem so the mixer UI lists them; only playable ones are mixed.
    HS_CHECK(rig.engine.loadStems({broken, missing, good}));
    HS_CHECK(rig.engine.loadedStems().size() == 3);
    rig.engine.play();
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 16383));

    // Only unplayable stems: the engine still "loads" them but there is nothing to hear and the
    // sink is not started by load.
    HS_CHECK(rig.engine.loadStems({broken}));
    HS_CHECK(rig.engine.durationSeconds() == 0.0);
    HS_CHECK(!rig.sink->isRunning());
    HS_CHECK(rig.sink->bytesAvailable() == 0);
    rig.engine.play();
    HS_CHECK(rig.sink->isRunning()); // play() still opens the sink
    const auto pcm = rig.sink->pull(16);
    HS_CHECK(allZero(pcm));
    HS_CHECK(rig.engine.positionSeconds() > 0.0); // no duration, so playback never ends by itself

    // A preloaded song with nothing playable still counts as preloaded stems.
    HS_CHECK(rig.engine.preloadStems({broken}));
    HS_CHECK(rig.engine.hasPreloadedStems());
    HS_CHECK(!rig.engine.preloadStems({MediaStem("r", "Reference", "r.wav")})); // reference stems are dropped
    HS_CHECK(!rig.engine.hasPreloadedStems());
    HS_CHECK(!rig.engine.switchToPreloaded());

    std::cout << "[PASS] testStemsThatCannotBeMappedAreSkipped passed." << std::endl;
}

void testStemControlsOnlyReachBuffersOfPlayableStems() {
    std::cout << "[TEST] Running testStemControlsOnlyReachBuffersOfPlayableStems..." << std::endl;
    Rig rig;
    const MediaStem missing("m", "Missing", (rig.dir.path() / "missing.wav").string());
    const MediaStem good = rig.stem("Good", kHalf, -1.0f);
    HS_CHECK(rig.engine.loadStems({missing, good}));
    rig.engine.play();
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 16383));

    // Index 1 exists in the stem list but only one stem has a buffer: the call is accepted
    // and the live mix is unchanged. (The list and the buffers disagree once a stem fails to map.)
    rig.engine.setStemMuted(1, true);
    rig.engine.setStemVolume(1, 0.0f);
    rig.engine.setStemSolo(1, true);
    HS_CHECK(rig.engine.loadedStems()[1].isMuted());
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 16383));

    std::cout << "[PASS] testStemControlsOnlyReachBuffersOfPlayableStems passed." << std::endl;
}

void testSwitchingSongsHandsOverToTheNextSongAtItsStart() {
    std::cout << "[TEST] Running testSwitchingSongsHandsOverToTheNextSongAtItsStart..." << std::endl;
    Rig rig;
    const MediaStem songA = rig.stem("KeysA", 6554, -1.0f, 8820);
    const MediaStem songB = rig.stem("KeysB", 19661, -1.0f, 4410);

    HS_CHECK(rig.engine.loadStems({songA}));
    HS_CHECK(rig.sink->startCalls == 1);
    rig.engine.play();
    HS_CHECK(rig.sink->startCalls == 1); // already active: not restarted
    HS_CHECK(channelIs(rig.sink->pull(100), 0, 6553));

    HS_CHECK(rig.engine.preloadStems({songB}));
    HS_CHECK(rig.engine.switchToPreloaded());
    HS_CHECK(rig.sink->startCalls == 1); // a running, active sink is kept
    HS_CHECK(rig.engine.positionSeconds() == 0.0);
    HS_CHECK(rig.engine.durationSeconds() == 0.1);

    // The next pull takes the handoff: B plays from its first frame, and A's position is not carried over.
    HS_CHECK(channelIs(rig.sink->pull(100), 0, 19660));
    HS_CHECK(std::abs(rig.engine.positionSeconds() - 100.0 / 44100.0) < 1e-9);

    // An idle sink (it stopped pulling) is started again by play() and by a switch.
    rig.sink->goIdle();
    rig.engine.play();
    HS_CHECK(rig.sink->startCalls == 2);

    const MediaStem songC = rig.stem("KeysC", 3277, -1.0f, 4410);
    HS_CHECK(rig.engine.preloadStems({songC}));
    rig.sink->goIdle();
    HS_CHECK(rig.engine.switchToPreloaded());
    HS_CHECK(rig.sink->startCalls == 3);
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 3276));

    // If the next song has nothing playable the idle sink is left alone.
    writeFile(rig.dir.path() / "broken.wav", "not a wav");
    HS_CHECK(rig.engine.preloadStems({MediaStem("x", "Broken", (rig.dir.path() / "broken.wav").string())}));
    rig.sink->goIdle();
    HS_CHECK(rig.engine.switchToPreloaded());
    HS_CHECK(rig.sink->startCalls == 3);
    HS_CHECK(allZero(rig.sink->pull(16)));

    std::cout << "[PASS] testSwitchingSongsHandsOverToTheNextSongAtItsStart passed." << std::endl;
}

void testSwitchWhileSinkStoppedHandsOverImmediately() {
    std::cout << "[TEST] Running testSwitchWhileSinkStoppedHandsOverImmediately..." << std::endl;
    Rig rig;
    writeFile(rig.dir.path() / "broken.wav", "not a wav");
    // Song A has no playable stem, so loading it does not start the sink.
    HS_CHECK(rig.engine.loadStems({MediaStem("a", "Broken", (rig.dir.path() / "broken.wav").string())}));
    HS_CHECK(!rig.sink->isRunning());
    HS_CHECK(rig.engine.liveSongSetCountForTesting() == 1);

    const MediaStem songB = rig.stem("KeysB", 19661, -1.0f, 4410);
    HS_CHECK(rig.engine.preloadStems({songB}));
    HS_CHECK(rig.engine.liveSongSetCountForTesting() == 2);
    HS_CHECK(rig.engine.switchToPreloaded());

    // No audio callback was running, so A was released at once and the sink was started for B.
    HS_CHECK(rig.engine.liveSongSetCountForTesting() == 1);
    HS_CHECK(rig.sink->startCalls == 1);
    HS_CHECK(rig.engine.durationSeconds() == 0.1);
    rig.engine.play();
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 19660));

    std::cout << "[PASS] testSwitchWhileSinkStoppedHandsOverImmediately passed." << std::endl;
}

void testLoadingAnotherSongStopsTheSinkFirst() {
    std::cout << "[TEST] Running testLoadingAnotherSongStopsTheSinkFirst..." << std::endl;
    Rig rig;
    const MediaStem songA = rig.stem("KeysA", kHalf, -1.0f);
    HS_CHECK(rig.engine.loadStems({songA}));
    rig.engine.play();
    const int stopsBefore = rig.sink->stopCalls;
    HS_CHECK(rig.engine.loadStems({songA}));
    HS_CHECK(rig.sink->stopCalls == stopsBefore + 1); // the device is quiet while buffers are replaced
    HS_CHECK(rig.sink->startCalls == 2);              // and started again for the new song
    HS_CHECK(!rig.engine.isPlaying());                // loading leaves the engine stopped

    // Destroying the engine stops the device.
    std::shared_ptr<int> totalStops;
    {
        auto fake = std::make_unique<FakeAudioSink>();
        totalStops = fake->totalStops;
        AudioEngine engine(std::move(fake));
        HS_CHECK(engine.loadStems({songA}));
        engine.play();
        HS_CHECK(*totalStops == 1); // load stops, play starts
    }
    HS_CHECK(*totalStops == 2);

    std::cout << "[PASS] testLoadingAnotherSongStopsTheSinkFirst passed." << std::endl;
}

void testEngineWithoutSinkStillTracksState() {
    std::cout << "[TEST] Running testEngineWithoutSinkStillTracksState..." << std::endl;
    const TempDir dir;
    const std::filesystem::path path = dir.path() / "keys.wav";
    writeFile(path, wav::pcm16(2, 44100, wav::constant(4410, 2, kHalf)));
    AudioEngine engine{std::unique_ptr<IAudioSink>()};

    HS_CHECK(engine.loadStems({MediaStem("k", "Keys", path.string())}));
    engine.play();
    HS_CHECK(engine.isPlaying());
    HS_CHECK(engine.preloadStems({MediaStem("k2", "Keys2", path.string())}));
    HS_CHECK(engine.switchToPreloaded());
    HS_CHECK(engine.isPlaying());
    HS_CHECK(engine.loadedStems().front().id() == "k2");
    engine.unloadCurrent();
    HS_CHECK(engine.loadedStems().empty());

    std::cout << "[PASS] testEngineWithoutSinkStillTracksState passed." << std::endl;
}

void testEngineCanBeMovedAndKeepsPlaying() {
    std::cout << "[TEST] Running testEngineCanBeMovedAndKeepsPlaying..." << std::endl;
    Rig rig;
    const MediaStem keys = rig.stem("Keys", kHalf, -1.0f);
    HS_CHECK(rig.engine.loadStems({keys}));
    rig.engine.play();

    AudioEngine moved(std::move(rig.engine));
    HS_CHECK(moved.isPlaying());
    HS_CHECK(channelIs(rig.sink->pull(16), 0, 16383)); // the sink still reaches the mixer

    // Move-assigning over an engine tears that engine down; the assigned engine keeps working.
    FakeAudioSink* otherSink = nullptr;
    AudioEngine other = Rig::makeEngine(otherSink);
    HS_CHECK(other.loadStems({keys}));
    other = std::move(moved);
    HS_CHECK(other.isPlaying());
    HS_CHECK(other.loadedStems().front().id() == "Keys");

    std::cout << "[PASS] testEngineCanBeMovedAndKeepsPlaying passed." << std::endl;
}

int main() {
    try {
        testPanLawAndVolume();
        testStereoSourceKeepsChannelsApartAndMonoIsDuplicated();
        testMuteSoloAndClipping();
        testPlaybackPositionPauseAndEndOfSong();
        testSeekStartsReadingAtThatPosition();
        testSongDurationFollowsGuideStems();
        testStemsThatCannotBeMappedAreSkipped();
        testStemControlsOnlyReachBuffersOfPlayableStems();
        testSwitchingSongsHandsOverToTheNextSongAtItsStart();
        testSwitchWhileSinkStoppedHandsOverImmediately();
        testLoadingAnotherSongStopsTheSinkFirst();
        testEngineWithoutSinkStillTracksState();
        testEngineCanBeMovedAndKeepsPlaying();
        std::cout << "\nALL AUDIO MIXING UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in audio mixing unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
