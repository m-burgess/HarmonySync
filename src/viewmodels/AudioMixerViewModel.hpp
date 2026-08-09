#ifndef HARMONYSYNC_AUDIO_MIXER_VIEWMODEL_HPP
#define HARMONYSYNC_AUDIO_MIXER_VIEWMODEL_HPP

#include "AudioEngine.hpp"
#include "StemMixer.hpp"
#include <memory>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel for multitrack audio playback, stem mixing controls, and transposition.
 */
class AudioMixerViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(float masterVolume READ masterVolume WRITE setMasterVolume NOTIFY masterVolumeChanged)
    Q_PROPERTY(int pitchShiftSemitones READ pitchShiftSemitones WRITE setPitchShiftSemitones NOTIFY pitchShiftChanged)
    Q_PROPERTY(bool isPlaying READ isPlaying NOTIFY playStateChanged)
    Q_PROPERTY(double positionSeconds READ positionSeconds NOTIFY positionChanged)
    Q_PROPERTY(double durationSeconds READ durationSeconds NOTIFY durationChanged)
    Q_PROPERTY(int loadedStemCount READ loadedStemCount NOTIFY stemCountChanged)
#endif

public:
    explicit AudioMixerViewModel(std::shared_ptr<Media::AudioEngine> audioEngine = nullptr);
    ~AudioMixerViewModel();

    AudioMixerViewModel(const AudioMixerViewModel&) = delete;
    AudioMixerViewModel& operator=(const AudioMixerViewModel&) = delete;

    // Property Accessors
    [[nodiscard]] float masterVolume() const noexcept;
    void setMasterVolume(float volume) noexcept;

    [[nodiscard]] int pitchShiftSemitones() const noexcept;
    void setPitchShiftSemitones(int semitones) noexcept;

    [[nodiscard]] bool isPlaying() const noexcept;
    [[nodiscard]] double positionSeconds() const noexcept;
    [[nodiscard]] double durationSeconds() const noexcept;
    [[nodiscard]] int loadedStemCount() const noexcept;

    // Commands
    bool loadSongStems(const std::vector<Core::MediaStem>& stems);
    void play();
    void pause();
    void stop();
    void seek(double position);
    void setStemVolume(int stemIndex, float volume);
    void toggleStemMute(int stemIndex);
    void toggleStemSolo(int stemIndex);

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void masterVolumeChanged(float volume);
    void pitchShiftChanged(int semitones);
    void playStateChanged(bool playing);
    void positionChanged(double position);
    void durationChanged(double duration);
    void stemCountChanged(int count);
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_AUDIO_MIXER_VIEWMODEL_HPP
