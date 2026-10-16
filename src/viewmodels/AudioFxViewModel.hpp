#ifndef HARMONYSYNC_AUDIO_FX_VIEWMODEL_HPP
#define HARMONYSYNC_AUDIO_FX_VIEWMODEL_HPP

#include "MultiBandEqualizer.hpp"
#include "AudioDynamicsCompressor.hpp"
#include <memory>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel managing multi-band EQ parameters, dynamic compression thresholds, and studio master effects.
 */
class AudioFxViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(bool isEqEnabled READ isEqEnabled WRITE setEqEnabled NOTIFY eqStateChanged)
    Q_PROPERTY(
        bool isCompressorEnabled READ isCompressorEnabled WRITE setCompressorEnabled NOTIFY compressorStateChanged)
    Q_PROPERTY(float thresholdDb READ thresholdDb WRITE setThresholdDb NOTIFY compressorParamsChanged)
    Q_PROPERTY(float ratio READ ratio WRITE setRatio NOTIFY compressorParamsChanged)
#endif

public:
    explicit AudioFxViewModel(std::shared_ptr<Media::MultiBandEqualizer> eq = nullptr,
                              std::shared_ptr<Media::AudioDynamicsCompressor> comp = nullptr);
    ~AudioFxViewModel();

    AudioFxViewModel(const AudioFxViewModel&) = delete;
    AudioFxViewModel& operator=(const AudioFxViewModel&) = delete;

    [[nodiscard]] bool isEqEnabled() const noexcept;
    void setEqEnabled(bool enabled) noexcept;

    [[nodiscard]] bool isCompressorEnabled() const noexcept;
    void setCompressorEnabled(bool enabled) noexcept;

    [[nodiscard]] float thresholdDb() const noexcept;
    void setThresholdDb(float db) noexcept;

    [[nodiscard]] float ratio() const noexcept;
    void setRatio(float r) noexcept;

#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_INVOKABLE void setEqBandGain(int bandIndex, float gainDb);
    Q_INVOKABLE float eqBandGain(int bandIndex) const;
#else
    void setEqBandGain(int bandIndex, float gainDb);
    float eqBandGain(int bandIndex) const;
#endif

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void eqStateChanged(bool enabled);
    void compressorStateChanged(bool enabled);
    void compressorParamsChanged();
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_AUDIO_FX_VIEWMODEL_HPP
