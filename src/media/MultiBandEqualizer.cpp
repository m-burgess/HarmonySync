#include "MultiBandEqualizer.hpp"
#include <algorithm>
#include <array>
#include <mutex>

namespace HarmonySync::Media {

struct MultiBandEqualizer::Impl {
    std::array<float, 5> gains{0.0f, 0.0f, 0.0f, 0.0f, 0.0f};
    bool enabled{true};
    mutable std::recursive_mutex mutex;
};

MultiBandEqualizer::MultiBandEqualizer()
    : m_impl(std::make_unique<Impl>()) {}

MultiBandEqualizer::~MultiBandEqualizer() = default;

MultiBandEqualizer::MultiBandEqualizer(MultiBandEqualizer&&) noexcept = default;
MultiBandEqualizer& MultiBandEqualizer::operator=(MultiBandEqualizer&&) noexcept = default;

void MultiBandEqualizer::setBandGain(EqBand band, float gainDb) noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    const auto idx = static_cast<size_t>(band);
    if (idx < 5) {
        m_impl->gains[idx] = std::clamp(gainDb, -12.0f, 12.0f);
    }
}

float MultiBandEqualizer::bandGain(EqBand band) const noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    const auto idx = static_cast<size_t>(band);
    if (idx < 5) {
        return m_impl->gains[idx];
    }
    return 0.0f;
}

void MultiBandEqualizer::setEnabled(bool enabled) noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    m_impl->enabled = enabled;
}

bool MultiBandEqualizer::isEnabled() const noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    return m_impl->enabled;
}

void MultiBandEqualizer::processBuffer(float* samples, size_t sampleCount) noexcept {
    if (!samples || sampleCount == 0) {
        return;
    }

    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    if (!m_impl->enabled) {
        return;
    }

    // Apply basic gain adjustment per band frequency band placeholder
    float totalGainFactor = 1.0f;
    for (float g : m_impl->gains) {
        totalGainFactor *= (1.0f + (g / 24.0f));
    }

    for (size_t i = 0; i < sampleCount; ++i) {
        samples[i] *= totalGainFactor;
    }
}

} // namespace HarmonySync::Media
