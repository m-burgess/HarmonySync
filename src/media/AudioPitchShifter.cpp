#include "AudioPitchShifter.hpp"
#include <cmath>
#include <algorithm>

namespace HarmonySync::Media {

struct AudioPitchShifter::Impl {
    int semitones{0};
};

AudioPitchShifter::AudioPitchShifter()
    : m_impl(std::make_unique<Impl>()) {}

AudioPitchShifter::~AudioPitchShifter() = default;
AudioPitchShifter::AudioPitchShifter(AudioPitchShifter&&) noexcept = default;
AudioPitchShifter& AudioPitchShifter::operator=(AudioPitchShifter&&) noexcept = default;

void AudioPitchShifter::setPitchShiftSemitones(int semitones) noexcept {
    m_impl->semitones = std::clamp(semitones, -12, 12);
}

int AudioPitchShifter::pitchShiftSemitones() const noexcept {
    return m_impl->semitones;
}

double AudioPitchShifter::calculatePitchScaleFactor() const noexcept {
    // pitchScaleFactor = 2^(semitones / 12.0)
    return std::pow(2.0, static_cast<double>(m_impl->semitones) / 12.0);
}

void AudioPitchShifter::processBuffer(const float* inputBuffer, float* outputBuffer, size_t numFrames) noexcept {
    if (!inputBuffer || !outputBuffer) {
        return;
    }
    const auto scale = static_cast<float>(calculatePitchScaleFactor());

    for (size_t i = 0; i < numFrames; ++i) {
        outputBuffer[i] = inputBuffer[i] * scale;
    }
}

} // namespace HarmonySync::Media
