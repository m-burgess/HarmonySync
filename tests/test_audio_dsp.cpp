#include "FFmpegAudioDecoder.hpp"
#include "AudioPitchShifter.hpp"
#include <iostream>
#include <cmath>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Media;

void testFFmpegAudioDecoder() {
    std::cout << "[TEST] Running testFFmpegAudioDecoder..." << std::endl;
    FFmpegAudioDecoder decoder;

    AudioStreamInfo info = decoder.inspectFile("/non/existent/file.wav");
    assert(!info.isValid);

    // Testing inspect on virtual paths
    AudioStreamInfo infoWav = decoder.inspectFile("/virtual/test_stem.wav");
    // Should be invalid since path doesn't exist on disk, so inspect return isValid = false
    assert(!infoWav.isValid);

    std::cout << "[PASS] testFFmpegAudioDecoder passed." << std::endl;
}

void testAudioPitchShifterRatio() {
    std::cout << "[TEST] Running testAudioPitchShifterRatio..." << std::endl;
    AudioPitchShifter shifter;

    assert(shifter.pitchShiftSemitones() == 0);
    assert(std::abs(shifter.calculatePitchScaleFactor() - 1.0) < 0.0001);

    // +12 semitones = 1 octave up = factor 2.0
    shifter.setPitchShiftSemitones(12);
    assert(shifter.pitchShiftSemitones() == 12);
    assert(std::abs(shifter.calculatePitchScaleFactor() - 2.0) < 0.0001);

    // -12 semitones = 1 octave down = factor 0.5
    shifter.setPitchShiftSemitones(-12);
    assert(shifter.pitchShiftSemitones() == -12);
    assert(std::abs(shifter.calculatePitchScaleFactor() - 0.5) < 0.0001);

    // Clamp check
    shifter.setPitchShiftSemitones(24);
    assert(shifter.pitchShiftSemitones() == 12);

    std::cout << "[PASS] testAudioPitchShifterRatio passed." << std::endl;
}

int main() {
    try {
        testFFmpegAudioDecoder();
        testAudioPitchShifterRatio();
        std::cout << "\nALL AUDIO DSP UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in audio dsp unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
