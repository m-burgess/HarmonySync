#ifndef HARMONYSYNC_MULTI_BAND_EQUALIZER_HPP
#define HARMONYSYNC_MULTI_BAND_EQUALIZER_HPP

#include <memory>
#include <vector>
#include <cstddef>

namespace HarmonySync::Media {

enum class EqBand { LowShelf = 0, LowMid = 1, Mid = 2, HighMid = 3, HighShelf = 4 };

/**
 * @brief Thread-safe 5-band parametric equalizer with RAII memory management and lock-free processing.
 */
class MultiBandEqualizer {
public:
    MultiBandEqualizer();
    ~MultiBandEqualizer();

    MultiBandEqualizer(const MultiBandEqualizer&) = delete;
    MultiBandEqualizer& operator=(const MultiBandEqualizer&) = delete;
    MultiBandEqualizer(MultiBandEqualizer&&) noexcept;
    MultiBandEqualizer& operator=(MultiBandEqualizer&&) noexcept;

    void setBandGain(EqBand band, float gainDb) noexcept;
    [[nodiscard]] float bandGain(EqBand band) const noexcept;

    void setEnabled(bool enabled) noexcept;
    [[nodiscard]] bool isEnabled() const noexcept;

    void processBuffer(float* samples, size_t sampleCount) noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_MULTI_BAND_EQUALIZER_HPP
