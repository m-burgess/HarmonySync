#include "MultiBandEqualizer.hpp"
#include "AudioDynamicsCompressor.hpp"
#include "AudioFxViewModel.hpp"
#include <iostream>
#include <vector>
#include <cmath>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Media;
using namespace HarmonySync::ViewModels;

void testMultiBandEqualizer() {
    std::cout << "[TEST] Running testMultiBandEqualizer..." << std::endl;

    MultiBandEqualizer eq;
    assert(eq.isEnabled() == true);
    assert(eq.bandGain(EqBand::LowShelf) == 0.0f);

    eq.setBandGain(EqBand::LowShelf, 6.0f);
    assert(eq.bandGain(EqBand::LowShelf) == 6.0f);

    std::vector<float> buffer = {0.5f, -0.5f, 0.2f, -0.2f};
    eq.processBuffer(buffer.data(), buffer.size());
    assert(std::abs(buffer[0]) > 0.5f); // Boosted sample

    std::cout << "[PASS] testMultiBandEqualizer passed." << std::endl;
}

void testAudioDynamicsCompressor() {
    std::cout << "[TEST] Running testAudioDynamicsCompressor..." << std::endl;

    AudioDynamicsCompressor comp;
    assert(comp.isEnabled() == true);
    assert(comp.thresholdDb() == -12.0f);
    assert(comp.ratio() == 4.0f);

    comp.setThresholdDb(-20.0f);
    assert(comp.thresholdDb() == -20.0f);

    comp.setRatio(8.0f);
    assert(comp.ratio() == 8.0f);

    std::vector<float> buffer = {0.9f, 0.9f, 0.9f}; // Loud signal above -20dB
    comp.processBuffer(buffer.data(), buffer.size());
    assert(buffer[0] < 0.9f); // Compressed signal

    std::cout << "[PASS] testAudioDynamicsCompressor passed." << std::endl;
}

void testAudioFxViewModel() {
    std::cout << "[TEST] Running testAudioFxViewModel..." << std::endl;

    auto eq = std::make_shared<MultiBandEqualizer>();
    auto comp = std::make_shared<AudioDynamicsCompressor>();
    AudioFxViewModel vm(eq, comp);

    assert(vm.isEqEnabled() == true);
    assert(vm.isCompressorEnabled() == true);

    vm.setEqBandGain(0, 3.5f);
    assert(vm.eqBandGain(0) == 3.5f);

    vm.setThresholdDb(-15.0f);
    assert(vm.thresholdDb() == -15.0f);

    std::cout << "[PASS] testAudioFxViewModel passed." << std::endl;
}

int main() {
    try {
        testMultiBandEqualizer();
        testAudioDynamicsCompressor();
        testAudioFxViewModel();
        std::cout << "\nALL SPRINT 16 ADVANCED DSP UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Advanced DSP unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
