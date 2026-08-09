#include "AudioEngine.hpp"
#include "StemMixer.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

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

int main() {
    try {
        testAudioEngineStates();
        testStemMixerCalculation();
        std::cout << "\nALL AUDIO ENGINE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in audio engine unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
