#include "AudioDynamicsCompressor.hpp"
#include <algorithm>
#include <cmath>
#include <mutex>

namespace HarmonySync::Media {

struct AudioDynamicsCompressor::Impl {
    float threshold{-12.0f};
    float compRatio{4.0f};
    float makeupGain{0.0f};
    bool enabled{true};
    mutable std::recursive_mutex mutex;
};

AudioDynamicsCompressor::AudioDynamicsCompressor()
    : m_impl(std::make_unique<Impl>())
{}

AudioDynamicsCompressor::~AudioDynamicsCompressor() = default;

AudioDynamicsCompressor::AudioDynamicsCompressor(AudioDynamicsCompressor&&) noexcept = default;
AudioDynamicsCompressor& AudioDynamicsCompressor::operator=(AudioDynamicsCompressor&&) noexcept = default;

void AudioDynamicsCompressor::setThresholdDb(float db) noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    m_impl->threshold = std::clamp(db, -60.0f, 0.0f);
}

float AudioDynamicsCompressor::thresholdDb() const noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    return m_impl->threshold;
}

void AudioDynamicsCompressor::setRatio(float ratio) noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    m_impl->compRatio = std::max(1.0f, ratio);
}

float AudioDynamicsCompressor::ratio() const noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    return m_impl->compRatio;
}

void AudioDynamicsCompressor::setMakeupGainDb(float db) noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    m_impl->makeupGain = std::clamp(db, 0.0f, 24.0f);
}

float AudioDynamicsCompressor::makeupGainDb() const noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    return m_impl->makeupGain;
}

void AudioDynamicsCompressor::setEnabled(bool enabled) noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    m_impl->enabled = enabled;
}

bool AudioDynamicsCompressor::isEnabled() const noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    return m_impl->enabled;
}

void AudioDynamicsCompressor::processBuffer(float* samples, size_t sampleCount) noexcept {
    if (!samples || sampleCount == 0) return;

    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    if (!m_impl->enabled) return;

    float gainLinear = std::pow(10.0f, m_impl->makeupGain / 20.0f);

    for (size_t i = 0; i < sampleCount; ++i) {
        float sample = samples[i];
        float absSample = std::abs(sample);
        float sampleDb = 20.0f * std::log10(std::max(absSample, 1e-5f));

        if (sampleDb > m_impl->threshold) {
            float excess = sampleDb - m_impl->threshold;
            float compressedDb = m_impl->threshold + (excess / m_impl->compRatio);
            float reductionFactor = std::pow(10.0f, (compressedDb - sampleDb) / 20.0f);
            sample *= reductionFactor;
        }

        samples[i] = sample * gainLinear;
    }
}

} // namespace HarmonySync::Media
