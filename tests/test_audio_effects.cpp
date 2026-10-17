#include "AudioDynamicsCompressor.hpp"
#include "MultiBandEqualizer.hpp"
#include "StemMixer.hpp"
#include "test_check.hpp"
#include "test_wav.hpp"
#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <utility>
#include <vector>

using namespace HarmonySync::Core;
using namespace HarmonySync::Media;

namespace {

bool close(float a, float b, float tolerance = 1e-5f) {
    return std::abs(a - b) <= tolerance;
}

// 1 kHz sine at 44.1 kHz, as floats.
std::vector<float> sineBuffer(float amplitude, std::size_t frames = 441) {
    std::vector<float> buffer;
    buffer.reserve(frames);
    for (const std::int16_t sample : wav::sine(frames, 1, 1000.0, 1.0)) {
        buffer.push_back(static_cast<float>(sample) / 32767.0f * amplitude);
    }
    return buffer;
}

float peak(const std::vector<float>& buffer) {
    float result = 0.0f;
    for (const float sample : buffer) {
        result = std::max(result, std::abs(sample));
    }
    return result;
}

// What the compressor should do to one sample, worked out from the dB definition.
float expectedCompressed(float sample, float thresholdDb, float ratio, float makeupDb) {
    const float sampleDb = 20.0f * std::log10(std::max(std::abs(sample), 1e-5f));
    float result = sample;
    if (sampleDb > thresholdDb) {
        const float outDb = thresholdDb + (sampleDb - thresholdDb) / ratio;
        result = std::copysign(std::pow(10.0f, outDb / 20.0f), sample);
    }
    return result * std::pow(10.0f, makeupDb / 20.0f);
}

} // namespace

void testCompressorParametersAreClamped() {
    std::cout << "[TEST] Running testCompressorParametersAreClamped..." << std::endl;
    AudioDynamicsCompressor comp;
    HS_CHECK(comp.isEnabled());
    HS_CHECK(comp.thresholdDb() == -12.0f);
    HS_CHECK(comp.ratio() == 4.0f);
    HS_CHECK(comp.makeupGainDb() == 0.0f);

    comp.setThresholdDb(-20.0f);
    HS_CHECK(comp.thresholdDb() == -20.0f);
    comp.setThresholdDb(-90.0f);
    HS_CHECK(comp.thresholdDb() == -60.0f);
    comp.setThresholdDb(6.0f);
    HS_CHECK(comp.thresholdDb() == 0.0f);

    comp.setRatio(8.0f);
    HS_CHECK(comp.ratio() == 8.0f);
    comp.setRatio(0.2f); // a ratio below 1 would expand, so it is raised to 1
    HS_CHECK(comp.ratio() == 1.0f);

    comp.setMakeupGainDb(6.0f);
    HS_CHECK(comp.makeupGainDb() == 6.0f);
    comp.setMakeupGainDb(-3.0f);
    HS_CHECK(comp.makeupGainDb() == 0.0f);
    comp.setMakeupGainDb(40.0f);
    HS_CHECK(comp.makeupGainDb() == 24.0f);

    comp.setEnabled(false);
    HS_CHECK(!comp.isEnabled());

    // The settings move with the compressor.
    comp.setThresholdDb(-30.0f);
    AudioDynamicsCompressor moved(std::move(comp));
    HS_CHECK(moved.thresholdDb() == -30.0f);
    AudioDynamicsCompressor assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.thresholdDb() == -30.0f);

    std::cout << "[PASS] testCompressorParametersAreClamped passed." << std::endl;
}

void testCompressorProcessing() {
    std::cout << "[TEST] Running testCompressorProcessing..." << std::endl;
    AudioDynamicsCompressor comp;
    comp.setThresholdDb(-12.0f);
    comp.setRatio(4.0f);

    // Below the threshold nothing changes, above it the overshoot is divided by the ratio.
    std::vector<float> samples = {0.1f, -0.1f, 0.5f, -0.5f, 1.0f, 0.0f};
    const std::vector<float> original = samples;
    comp.processBuffer(samples.data(), samples.size());
    HS_CHECK(samples[0] == original[0]);
    HS_CHECK(samples[1] == original[1]);
    HS_CHECK(close(samples[2], expectedCompressed(0.5f, -12.0f, 4.0f, 0.0f)));
    HS_CHECK(close(samples[3], -samples[2])); // sign is preserved
    HS_CHECK(close(samples[4], expectedCompressed(1.0f, -12.0f, 4.0f, 0.0f)));
    HS_CHECK(samples[4] < 0.36f && samples[4] > 0.35f); // full scale lands at -9 dB
    HS_CHECK(samples[5] == 0.0f);

    // Make-up gain is applied to every sample, compressed or not.
    comp.setMakeupGainDb(6.0f);
    samples = original;
    comp.processBuffer(samples.data(), samples.size());
    HS_CHECK(close(samples[0], expectedCompressed(0.1f, -12.0f, 4.0f, 6.0f)));
    HS_CHECK(close(samples[2], expectedCompressed(0.5f, -12.0f, 4.0f, 6.0f)));
    HS_CHECK(samples[5] == 0.0f);
    comp.setMakeupGainDb(0.0f);

    // A ratio of 1 leaves the level alone.
    comp.setRatio(1.0f);
    samples = original;
    comp.processBuffer(samples.data(), samples.size());
    for (std::size_t i = 0; i < samples.size(); ++i) {
        HS_CHECK(close(samples[i], original[i], 1e-4f));
    }

    // A loud sine comes out with a lower peak; a quiet one is untouched.
    comp.setRatio(4.0f);
    std::vector<float> loud = sineBuffer(0.9f);
    comp.processBuffer(loud.data(), loud.size());
    HS_CHECK(peak(loud) < 0.5f);
    HS_CHECK(peak(loud) > std::pow(10.0f, -12.0f / 20.0f) - 0.01f); // still above the threshold
    std::vector<float> quiet = sineBuffer(0.1f);
    const std::vector<float> quietBefore = quiet;
    comp.processBuffer(quiet.data(), quiet.size());
    HS_CHECK(quiet == quietBefore);

    // Disabled: bypassed. Missing or empty buffers are ignored.
    comp.setEnabled(false);
    samples = original;
    comp.processBuffer(samples.data(), samples.size());
    HS_CHECK(samples == original);
    comp.setEnabled(true);
    comp.processBuffer(nullptr, 4);
    comp.processBuffer(samples.data(), 0);
    HS_CHECK(samples == original);

    std::cout << "[PASS] testCompressorProcessing passed." << std::endl;
}

void testEqualizerBandsAreClamped() {
    std::cout << "[TEST] Running testEqualizerBandsAreClamped..." << std::endl;
    MultiBandEqualizer eq;
    HS_CHECK(eq.isEnabled());
    for (const EqBand band : {EqBand::LowShelf, EqBand::LowMid, EqBand::Mid, EqBand::HighMid, EqBand::HighShelf}) {
        HS_CHECK(eq.bandGain(band) == 0.0f);
    }

    eq.setBandGain(EqBand::LowMid, 6.0f);
    HS_CHECK(eq.bandGain(EqBand::LowMid) == 6.0f);
    HS_CHECK(eq.bandGain(EqBand::Mid) == 0.0f); // bands are independent
    eq.setBandGain(EqBand::HighShelf, 30.0f);
    HS_CHECK(eq.bandGain(EqBand::HighShelf) == 12.0f);
    eq.setBandGain(EqBand::HighShelf, -30.0f);
    HS_CHECK(eq.bandGain(EqBand::HighShelf) == -12.0f);

    // A band outside the five known ones is ignored on write and reads as flat.
    const auto unknown = static_cast<EqBand>(7);
    eq.setBandGain(unknown, 6.0f);
    HS_CHECK(eq.bandGain(unknown) == 0.0f);

    eq.setEnabled(false);
    HS_CHECK(!eq.isEnabled());
    MultiBandEqualizer moved(std::move(eq));
    HS_CHECK(moved.bandGain(EqBand::LowMid) == 6.0f);
    MultiBandEqualizer assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.bandGain(EqBand::LowMid) == 6.0f);
    HS_CHECK(!assigned.isEnabled());

    std::cout << "[PASS] testEqualizerBandsAreClamped passed." << std::endl;
}

// The equalizer multiplies the whole signal by one factor, the product of (1 + gain / 24) per band.
void testEqualizerProcessing() {
    std::cout << "[TEST] Running testEqualizerProcessing..." << std::endl;
    MultiBandEqualizer eq;
    const std::vector<float> original = {0.5f, -0.25f, 0.0f, 0.8f};
    std::vector<float> samples = original;

    eq.processBuffer(samples.data(), samples.size()); // flat
    HS_CHECK(samples == original);

    eq.setBandGain(EqBand::Mid, -12.0f); // factor 0.5
    eq.processBuffer(samples.data(), samples.size());
    HS_CHECK(close(samples[0], 0.25f));
    HS_CHECK(close(samples[1], -0.125f));
    HS_CHECK(samples[2] == 0.0f);

    // Every band at +12 dB: 1.5 ^ 5.
    for (const EqBand band : {EqBand::LowShelf, EqBand::LowMid, EqBand::Mid, EqBand::HighMid, EqBand::HighShelf}) {
        eq.setBandGain(band, 12.0f);
    }
    samples = original;
    eq.processBuffer(samples.data(), samples.size());
    HS_CHECK(close(samples[0], 0.5f * 7.59375f, 1e-4f));

    // A boost on a quiet sine raises its peak.
    std::vector<float> sine = sineBuffer(0.1f);
    eq.processBuffer(sine.data(), sine.size());
    HS_CHECK(peak(sine) > 0.5f);

    eq.setEnabled(false);
    samples = original;
    eq.processBuffer(samples.data(), samples.size());
    HS_CHECK(samples == original);
    eq.setEnabled(true);
    eq.processBuffer(nullptr, 4);
    eq.processBuffer(samples.data(), 0);
    HS_CHECK(samples == original);

    std::cout << "[PASS] testEqualizerProcessing passed." << std::endl;
}

void testStemMixerGainRules() {
    std::cout << "[TEST] Running testStemMixerGainRules..." << std::endl;
    const StemMixer mixer;
    MediaStem drums("1", "Drums", "drums.wav");
    MediaStem bass("2", "Bass", "bass.wav");
    drums.setVolume(0.5f);
    bass.setVolume(0.8f);
    std::vector<MediaStem> stems = {drums, bass};

    HS_CHECK(!mixer.hasSoloTrack(stems));
    HS_CHECK(!mixer.hasSoloTrack({}));

    // Master volume scales the stem and is itself limited to [0, 1].
    HS_CHECK(close(mixer.calculateEffectiveGain(drums, stems, 0.5f), 0.25f));
    HS_CHECK(close(mixer.calculateEffectiveGain(drums, stems, 3.0f), 0.5f));
    HS_CHECK(mixer.calculateEffectiveGain(drums, stems, -1.0f) == 0.0f);

    // A muted stem is silent; a solo elsewhere silences the rest; a muted solo stays silent.
    bass.setSolo(true);
    stems = {drums, bass};
    HS_CHECK(mixer.hasSoloTrack(stems));
    HS_CHECK(mixer.calculateEffectiveGain(drums, stems, 1.0f) == 0.0f);
    HS_CHECK(close(mixer.calculateEffectiveGain(bass, stems, 1.0f), 0.8f));
    bass.setMuted(true);
    stems = {drums, bass};
    HS_CHECK(mixer.calculateEffectiveGain(bass, stems, 1.0f) == 0.0f);

    // Copies and moves behave like the original.
    StemMixer copy(mixer);
    StemMixer assigned;
    assigned = copy;
    StemMixer moved(std::move(copy));
    assigned = std::move(moved);
    HS_CHECK(assigned.hasSoloTrack(stems));

    std::cout << "[PASS] testStemMixerGainRules passed." << std::endl;
}

int main() {
    try {
        testCompressorParametersAreClamped();
        testCompressorProcessing();
        testEqualizerBandsAreClamped();
        testEqualizerProcessing();
        testStemMixerGainRules();
        std::cout << "\nALL AUDIO EFFECTS UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in audio effects unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
