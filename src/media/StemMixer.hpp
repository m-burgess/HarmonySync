#ifndef HARMONYSYNC_STEM_MIXER_HPP
#define HARMONYSYNC_STEM_MIXER_HPP

#include "MediaStem.hpp"
#include <vector>
#include <memory>

namespace HarmonySync::Media {

/**
 * @brief Stem mixer class calculating effective gain factors and solo/mute precedence rules.
 */
class StemMixer {
public:
    StemMixer();
    ~StemMixer();

    StemMixer(const StemMixer& other);
    StemMixer& operator=(const StemMixer& other);
    StemMixer(StemMixer&& other) noexcept;
    StemMixer& operator=(StemMixer&& other) noexcept;

    /**
     * @brief Calculate the effective linear gain (0.0 to 1.0) for a given stem, factoring in solo precedence, track mute, and master volume.
     */
    [[nodiscard]] float calculateEffectiveGain(const Core::MediaStem& stem, const std::vector<Core::MediaStem>& allStems, float masterVolume) const noexcept;

    /**
     * @brief Helper to check if any track in the current stem list is soloed.
     */
    [[nodiscard]] bool hasSoloTrack(const std::vector<Core::MediaStem>& stems) const noexcept;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_STEM_MIXER_HPP
