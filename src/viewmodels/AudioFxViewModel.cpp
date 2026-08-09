#include "AudioFxViewModel.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct AudioFxViewModel::Impl {
    std::shared_ptr<Media::MultiBandEqualizer> equalizer;
    std::shared_ptr<Media::AudioDynamicsCompressor> compressor;

    Impl(
        std::shared_ptr<Media::MultiBandEqualizer> eq,
        std::shared_ptr<Media::AudioDynamicsCompressor> comp
    )
        : equalizer(std::move(eq))
        , compressor(std::move(comp))
    {
        if (!equalizer) {
            equalizer = std::make_shared<Media::MultiBandEqualizer>();
        }
        if (!compressor) {
            compressor = std::make_shared<Media::AudioDynamicsCompressor>();
        }
    }
};

AudioFxViewModel::AudioFxViewModel(
    std::shared_ptr<Media::MultiBandEqualizer> eq,
    std::shared_ptr<Media::AudioDynamicsCompressor> comp
)
    : m_impl(std::make_unique<Impl>(std::move(eq), std::move(comp)))
{}

AudioFxViewModel::~AudioFxViewModel() = default;

bool AudioFxViewModel::isEqEnabled() const noexcept {
    return m_impl->equalizer->isEnabled();
}

void AudioFxViewModel::setEqEnabled(bool enabled) noexcept {
    if (m_impl->equalizer->isEnabled() != enabled) {
        m_impl->equalizer->setEnabled(enabled);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit eqStateChanged(enabled);
#endif
    }
}

bool AudioFxViewModel::isCompressorEnabled() const noexcept {
    return m_impl->compressor->isEnabled();
}

void AudioFxViewModel::setCompressorEnabled(bool enabled) noexcept {
    if (m_impl->compressor->isEnabled() != enabled) {
        m_impl->compressor->setEnabled(enabled);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit compressorStateChanged(enabled);
#endif
    }
}

float AudioFxViewModel::thresholdDb() const noexcept {
    return m_impl->compressor->thresholdDb();
}

void AudioFxViewModel::setThresholdDb(float db) noexcept {
    if (m_impl->compressor->thresholdDb() != db) {
        m_impl->compressor->setThresholdDb(db);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit compressorParamsChanged();
#endif
    }
}

float AudioFxViewModel::ratio() const noexcept {
    return m_impl->compressor->ratio();
}

void AudioFxViewModel::setRatio(float r) noexcept {
    if (m_impl->compressor->ratio() != r) {
        m_impl->compressor->setRatio(r);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit compressorParamsChanged();
#endif
    }
}

void AudioFxViewModel::setEqBandGain(int bandIndex, float gainDb) {
    if (bandIndex >= 0 && bandIndex < 5) {
        m_impl->equalizer->setBandGain(static_cast<Media::EqBand>(bandIndex), gainDb);
    }
}

float AudioFxViewModel::eqBandGain(int bandIndex) const {
    if (bandIndex >= 0 && bandIndex < 5) {
        return m_impl->equalizer->bandGain(static_cast<Media::EqBand>(bandIndex));
    }
    return 0.0f;
}

} // namespace HarmonySync::ViewModels
