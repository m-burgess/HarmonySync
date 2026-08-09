#include "StemMixer.hpp"
#include <algorithm>

namespace HarmonySync::Media {

StemMixer::StemMixer() = default;
StemMixer::~StemMixer() = default;
StemMixer::StemMixer(const StemMixer&) = default;
StemMixer& StemMixer::operator=(const StemMixer&) = default;
StemMixer::StemMixer(StemMixer&&) noexcept = default;
StemMixer& StemMixer::operator=(StemMixer&&) noexcept = default;

bool StemMixer::hasSoloTrack(const std::vector<Core::MediaStem>& stems) const noexcept {
    return std::any_of(stems.begin(), stems.end(), [](const Core::MediaStem& s) {
        return s.isSolo();
    });
}

float StemMixer::calculateEffectiveGain(const Core::MediaStem& stem, const std::vector<Core::MediaStem>& allStems, float masterVolume) const noexcept {
    if (stem.isMuted()) {
        return 0.0f;
    }

    bool anySolo = hasSoloTrack(allStems);
    if (anySolo && !stem.isSolo()) {
        return 0.0f;
    }

    float baseVolume = std::clamp(stem.volume(), 0.0f, 1.0f);
    float masterFactor = std::clamp(masterVolume, 0.0f, 1.0f);

    return baseVolume * masterFactor;
}

} // namespace HarmonySync::Media
