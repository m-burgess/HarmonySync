#include "AudioPitchShifter.hpp"
#include "FFmpegAudioDecoder.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"
#include "test_wav.hpp"
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

using namespace HarmonySync::Media;

namespace {

std::string writeBytes(const TempDir& dir, const std::string& name, const std::string& bytes) {
    const std::filesystem::path path = dir.path() / name;
    writeFile(path, bytes);
    return path.string();
}

} // namespace

void testInspectRejectsFilesThatAreNotPcm16Wav() {
    std::cout << "[TEST] Running testInspectRejectsFilesThatAreNotPcm16Wav..." << std::endl;
    const TempDir dir;
    const FFmpegAudioDecoder decoder;
    const std::vector<std::int16_t> samples = wav::constant(100, 2, 1000);

    HS_CHECK(!decoder.inspectFile("/non/existent/file.wav").isValid);
    HS_CHECK(!decoder.inspectFile(writeBytes(dir, "empty.wav", "")).isValid);
    HS_CHECK(!decoder.inspectFile(writeBytes(dir, "text.wav", "this is not a wav file")).isValid);

    // RIFF container that is not WAVE (an AVI, say).
    std::string avi = "RIFF";
    wav::put32(avi, 4);
    avi += "AVI ";
    HS_CHECK(!decoder.inspectFile(writeBytes(dir, "movie.avi", avi)).isValid);

    // Float and 8-bit PCM are not supported.
    HS_CHECK(!decoder
                  .inspectFile(
                      writeBytes(dir, "float.wav", wav::riff(wav::fmtChunk(3, 2, 44100, 32) + wav::dataChunk(samples))))
                  .isValid);
    HS_CHECK(!decoder
                  .inspectFile(
                      writeBytes(dir, "eight.wav", wav::riff(wav::fmtChunk(1, 2, 44100, 8) + wav::dataChunk(samples))))
                  .isValid);

    // Header without a data chunk, or without a format chunk.
    HS_CHECK(!decoder.inspectFile(writeBytes(dir, "nodata.wav", wav::riff(wav::fmtChunk(1, 2, 44100, 16)))).isValid);
    HS_CHECK(!decoder.inspectFile(writeBytes(dir, "nofmt.wav", wav::riff(wav::dataChunk(samples)))).isValid);

    std::cout << "[PASS] testInspectRejectsFilesThatAreNotPcm16Wav passed." << std::endl;
}

void testInspectReadsFormatAndDuration() {
    std::cout << "[TEST] Running testInspectReadsFormatAndDuration..." << std::endl;
    const TempDir dir;
    const FFmpegAudioDecoder decoder;

    // One second of stereo.
    AudioStreamInfo info =
        decoder.inspectFile(writeBytes(dir, "stereo.wav", wav::pcm16(2, 44100, wav::constant(44100, 2, 1000))));
    HS_CHECK(info.isValid);
    HS_CHECK(info.channels == 2);
    HS_CHECK(info.sampleRate == 44100);
    HS_CHECK(info.codecName == "pcm_s16le");
    HS_CHECK(std::abs(info.durationSeconds - 1.0) < 1e-12);

    // Half a second of mono at 22.05 kHz is 11025 frames.
    info = decoder.inspectFile(writeBytes(dir, "mono.wav", wav::pcm16(1, 22050, wav::constant(11025, 1, 1000))));
    HS_CHECK(info.isValid);
    HS_CHECK(info.channels == 1);
    HS_CHECK(info.sampleRate == 22050);
    HS_CHECK(std::abs(info.durationSeconds - 0.5) < 1e-12);

    // A format chunk longer than 16 bytes and chunks the decoder does not know are skipped.
    const std::string extended = wav::riff(wav::fmtChunk(1, 2, 44100, 16, 2) + wav::chunk("LIST", "INFOabcd") +
                                           wav::dataChunk(wav::constant(441, 2, 1000)));
    info = decoder.inspectFile(writeBytes(dir, "extended.wav", extended));
    HS_CHECK(info.isValid);
    HS_CHECK(std::abs(info.durationSeconds - 0.01) < 1e-12);

    // A zero sample rate or channel count in the header falls back to 44.1 kHz and one channel for the duration.
    info = decoder.inspectFile(writeBytes(dir, "zero_rate.wav", wav::pcm16(2, 0, wav::constant(441, 2, 1000))));
    HS_CHECK(info.isValid);
    HS_CHECK(std::abs(info.durationSeconds - 0.01) < 1e-12);
    info = decoder.inspectFile(writeBytes(dir, "zero_channels.wav", wav::pcm16(0, 44100, wav::constant(441, 1, 1000))));
    HS_CHECK(info.isValid);
    HS_CHECK(std::abs(info.durationSeconds - 0.01) < 1e-12);

    std::cout << "[PASS] testInspectReadsFormatAndDuration passed." << std::endl;
}

void testDecodeToPcmFloat() {
    std::cout << "[TEST] Running testDecodeToPcmFloat..." << std::endl;
    const TempDir dir;
    const FFmpegAudioDecoder decoder;
    std::vector<float> pcm;
    AudioStreamInfo info;

    HS_CHECK(!decoder.decodeToPcmFloat("/non/existent/file.wav", pcm, info));
    HS_CHECK(!info.isValid);

    // Stereo samples become floats in [-1, 1) and keep their interleaving.
    const std::vector<std::int16_t> stereo = {16384, -16384, -32768, 32767};
    HS_CHECK(decoder.decodeToPcmFloat(writeBytes(dir, "stereo.wav", wav::pcm16(2, 44100, stereo)), pcm, info));
    HS_CHECK(info.channels == 2);
    HS_CHECK(pcm.size() == 4);
    HS_CHECK(pcm[0] == 0.5f);
    HS_CHECK(pcm[1] == -0.5f);
    HS_CHECK(pcm[2] == -1.0f);
    HS_CHECK(std::abs(pcm[3] - 1.0f) < 1e-4f);

    // Mono is widened to stereo so the mixer sees one layout.
    HS_CHECK(decoder.decodeToPcmFloat(writeBytes(dir, "mono.wav", wav::pcm16(1, 44100, {16384, -8192})), pcm, info));
    HS_CHECK(info.channels == 2);
    HS_CHECK(pcm == std::vector<float>({0.5f, 0.5f, -0.25f, -0.25f}));

    // Chunks ahead of the audio are skipped.
    const std::string withList =
        wav::riff(wav::fmtChunk(1, 2, 44100, 16) + wav::chunk("LIST", "INFOabcd") + wav::dataChunk(stereo));
    HS_CHECK(decoder.decodeToPcmFloat(writeBytes(dir, "list.wav", withList), pcm, info));
    HS_CHECK(pcm.size() == 4);
    HS_CHECK(pcm[0] == 0.5f);

    // A well-formed file with no audio decodes to nothing.
    HS_CHECK(!decoder.decodeToPcmFloat(writeBytes(dir, "silent.wav", wav::pcm16(2, 44100, {})), pcm, info));
    HS_CHECK(!decoder.decodeToPcmFloat(writeBytes(dir, "text.wav", "not a wav file"), pcm, info));

    std::cout << "[PASS] testDecodeToPcmFloat passed." << std::endl;
}

void testMapAudioFile() {
    std::cout << "[TEST] Running testMapAudioFile..." << std::endl;
    const TempDir dir;
    const FFmpegAudioDecoder decoder;

    HS_CHECK(!decoder.mapAudioFile("/non/existent/file.wav").info.isValid);
    HS_CHECK(decoder.mapAudioFile("/non/existent/file.wav").pcmData == nullptr);
    HS_CHECK(!decoder.mapAudioFile(writeBytes(dir, "text.wav", "not a wav file")).info.isValid);

    const std::vector<std::int16_t> samples = {100, -100, 200, -200, 300, -300};
    MappedAudioFile mapped = decoder.mapAudioFile(writeBytes(dir, "plain.wav", wav::pcm16(2, 44100, samples)));
    HS_CHECK(mapped.info.isValid);
    HS_CHECK(mapped.info.channels == 2);
    HS_CHECK(mapped.sampleCount == samples.size());
    HS_CHECK(mapped.pcmData != nullptr);
    for (std::size_t i = 0; i < samples.size(); ++i) {
        HS_CHECK(mapped.pcmData[i] == samples[i]);
    }

    // The data chunk is found after other chunks, wherever it sits in the file.
    const std::string withList =
        wav::riff(wav::fmtChunk(1, 2, 44100, 16, 2) + wav::chunk("LIST", "INFOabcd") + wav::dataChunk(samples));
    const MappedAudioFile listed = decoder.mapAudioFile(writeBytes(dir, "list.wav", withList));
    HS_CHECK(listed.info.isValid);
    HS_CHECK(listed.sampleCount == samples.size());
    HS_CHECK(listed.pcmData[4] == 300);

    // The mapping belongs to the result, not the decoder.
    MappedAudioFile outlives;
    {
        const FFmpegAudioDecoder shortLived;
        outlives = shortLived.mapAudioFile(writeBytes(dir, "outlives.wav", wav::pcm16(2, 44100, samples)));
    }
    HS_CHECK(outlives.pcmData[2] == 200);

    // No audio at all cannot be mapped, even when the header claims some.
    HS_CHECK(!decoder.mapAudioFile(writeBytes(dir, "silent.wav", wav::pcm16(2, 44100, {}))).info.isValid);
    const std::string claimsMore = wav::riff(wav::fmtChunk(1, 2, 44100, 16) + wav::chunk("data", std::string(8, '\0')));
    HS_CHECK(!decoder.mapAudioFile(writeBytes(dir, "headeronly.wav", claimsMore.substr(0, claimsMore.size() - 8)))
                  .info.isValid);

    // A truncated file maps only the bytes it holds (the header says 8, two are present).
    const MappedAudioFile truncated =
        decoder.mapAudioFile(writeBytes(dir, "truncated.wav", claimsMore.substr(0, claimsMore.size() - 6)));
    HS_CHECK(truncated.info.isValid);
    HS_CHECK(truncated.sampleCount == 1);

    // Decoders are movable.
    FFmpegAudioDecoder first;
    FFmpegAudioDecoder second(std::move(first));
    first = std::move(second);
    HS_CHECK(!first.inspectFile("/non/existent/file.wav").isValid);

    std::cout << "[PASS] testMapAudioFile passed." << std::endl;
}

void testAudioPitchShifterRatio() {
    std::cout << "[TEST] Running testAudioPitchShifterRatio..." << std::endl;
    AudioPitchShifter shifter;

    HS_CHECK(shifter.pitchShiftSemitones() == 0);
    HS_CHECK(std::abs(shifter.calculatePitchScaleFactor() - 1.0) < 0.0001);

    // +12 semitones = 1 octave up = factor 2.0
    shifter.setPitchShiftSemitones(12);
    HS_CHECK(shifter.pitchShiftSemitones() == 12);
    HS_CHECK(std::abs(shifter.calculatePitchScaleFactor() - 2.0) < 0.0001);

    // -12 semitones = 1 octave down = factor 0.5
    shifter.setPitchShiftSemitones(-12);
    HS_CHECK(shifter.pitchShiftSemitones() == -12);
    HS_CHECK(std::abs(shifter.calculatePitchScaleFactor() - 0.5) < 0.0001);

    // Clamp check
    shifter.setPitchShiftSemitones(24);
    HS_CHECK(shifter.pitchShiftSemitones() == 12);
    shifter.setPitchShiftSemitones(-24);
    HS_CHECK(shifter.pitchShiftSemitones() == -12);

    std::cout << "[PASS] testAudioPitchShifterRatio passed." << std::endl;
}

// The processor scales each sample by the pitch ratio; it does not resample.
void testAudioPitchShifterProcessBuffer() {
    std::cout << "[TEST] Running testAudioPitchShifterProcessBuffer..." << std::endl;
    AudioPitchShifter shifter;
    const std::vector<float> input = {0.25f, -0.5f, 0.0f, 1.0f};
    std::vector<float> output(input.size(), 9.0f);

    shifter.processBuffer(input.data(), output.data(), input.size());
    HS_CHECK(output == input); // 0 semitones: unchanged

    shifter.setPitchShiftSemitones(12);
    shifter.processBuffer(input.data(), output.data(), input.size());
    HS_CHECK(output == std::vector<float>({0.5f, -1.0f, 0.0f, 2.0f}));

    shifter.setPitchShiftSemitones(-12);
    shifter.processBuffer(input.data(), output.data(), input.size());
    HS_CHECK(output == std::vector<float>({0.125f, -0.25f, 0.0f, 0.5f}));

    // In place, and only the requested number of frames is touched.
    std::vector<float> inPlace = {0.4f, 0.4f, 0.4f};
    shifter.setPitchShiftSemitones(12);
    shifter.processBuffer(inPlace.data(), inPlace.data(), 2);
    HS_CHECK(std::abs(inPlace[0] - 0.8f) < 1e-6f);
    HS_CHECK(std::abs(inPlace[1] - 0.8f) < 1e-6f);
    HS_CHECK(inPlace[2] == 0.4f);

    // Missing buffers are ignored.
    std::vector<float> untouched = {1.0f};
    shifter.processBuffer(nullptr, untouched.data(), 1);
    shifter.processBuffer(untouched.data(), nullptr, 1);
    HS_CHECK(untouched[0] == 1.0f);

    // Movable, and the setting travels with it.
    AudioPitchShifter moved(std::move(shifter));
    HS_CHECK(moved.pitchShiftSemitones() == 12);
    AudioPitchShifter assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.pitchShiftSemitones() == 12);

    std::cout << "[PASS] testAudioPitchShifterProcessBuffer passed." << std::endl;
}

int main() {
    try {
        testInspectRejectsFilesThatAreNotPcm16Wav();
        testInspectReadsFormatAndDuration();
        testDecodeToPcmFloat();
        testMapAudioFile();
        testAudioPitchShifterRatio();
        testAudioPitchShifterProcessBuffer();
        std::cout << "\nALL AUDIO DSP UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in audio dsp unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
