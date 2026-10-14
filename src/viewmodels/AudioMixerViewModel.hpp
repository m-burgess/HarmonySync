#ifndef HARMONYSYNC_AUDIO_MIXER_VIEWMODEL_HPP
#define HARMONYSYNC_AUDIO_MIXER_VIEWMODEL_HPP

#include "AudioEngine.hpp"
#include "StemMixer.hpp"
#include <cstdint>
#include <functional>
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
    Q_PROPERTY(bool isTransposing READ isTransposing NOTIFY isTransposingChanged)
    Q_PROPERTY(bool isPlaying READ isPlaying NOTIFY playStateChanged)
    Q_PROPERTY(double positionSeconds READ positionSeconds NOTIFY positionChanged)
    Q_PROPERTY(double durationSeconds READ durationSeconds NOTIFY durationChanged)
    Q_PROPERTY(int loadedStemCount READ loadedStemCount NOTIFY stemCountChanged)
    Q_PROPERTY(float crossfadePosition READ crossfadePosition WRITE setCrossfadePosition NOTIFY crossfadePositionChanged)
    Q_PROPERTY(QString activeBackgroundVideo READ activeBackgroundVideo NOTIFY activeBackgroundVideoChanged)
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
    [[nodiscard]] bool isTransposing() const noexcept;

    [[nodiscard]] bool isPlaying() const noexcept;
    [[nodiscard]] double positionSeconds() const noexcept;
    [[nodiscard]] double durationSeconds() const noexcept;
    [[nodiscard]] int loadedStemCount() const noexcept;
    [[nodiscard]] float crossfadePosition() const noexcept;

    // Commands
    bool loadSongStems(const std::vector<Core::MediaStem>& stems);
    /// Switches to the next song on the active deck and keeps the play state (#202):
    /// playing continues from 0 on the new song; stopped cues it at 0 without playing.
    bool loadNextSongStems(const std::vector<Core::MediaStem>& stems);

    /**
     * @brief Make this song current (#187). Never decodes on the calling thread.
     * If the song is already preloaded, switches now. Otherwise its decode runs on the
     * engine's worker and the switch happens when it is ready; the current song keeps
     * playing until then. Only the most recent request switches. The switch keeps the
     * play state (#202). Emits songSwitched() after each switch.
     */
    bool showSong(const std::vector<Core::MediaStem>& stems);
    /// Decode the song after the current one on the engine's worker, ready for showSong() (#187).
    void preloadNextSong(const std::vector<Core::MediaStem>& stems);

    /// Test seam: runs on the engine's decode worker before an async preload decodes.
    void setPreloadDecodeHookForTesting(std::function<void()> hook);
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString activeBackgroundVideo() const;
    Q_INVOKABLE void loadNextBackgroundVideo(const QString& path);
    Q_INVOKABLE void setActiveBackgroundVideo(const QString& path);
#else
    [[nodiscard]] std::string activeBackgroundVideo() const;
    void loadNextBackgroundVideo(const std::string& path);
    void setActiveBackgroundVideo(const std::string& path);
#endif
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_INVOKABLE void setCrossfadePosition(float position) noexcept;
    Q_INVOKABLE void finalizeCrossfade();
    Q_INVOKABLE void play();
    Q_INVOKABLE void pause();
    Q_INVOKABLE void stop();
    Q_INVOKABLE void seek(double position);
    Q_INVOKABLE void setStemVolume(int stemIndex, float volume);
    Q_INVOKABLE void toggleStemMute(int stemIndex);
    Q_INVOKABLE void toggleStemSolo(int stemIndex);

    Q_INVOKABLE QString stemName(int index) const;
    Q_INVOKABLE float stemVolume(int index) const;
    Q_INVOKABLE bool stemIsMuted(int index) const;
    Q_INVOKABLE bool stemIsSoloed(int index) const;
#else
    void setCrossfadePosition(float position) noexcept;
    void finalizeCrossfade();
    void play();
    void pause();
    void stop();
    void seek(double position);
    void setStemVolume(int stemIndex, float volume);
    void toggleStemMute(int stemIndex);
    void toggleStemSolo(int stemIndex);

    std::string stemName(int index) const;
    float stemVolume(int index) const;
    bool stemIsMuted(int index) const;
    bool stemIsSoloed(int index) const;
#endif

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void masterVolumeChanged(float volume);
    void pitchShiftChanged(int semitones);
    void isTransposingChanged(bool transposing);
    void playStateChanged(bool playing);
    void positionChanged(double position);
    void durationChanged(double duration);
    void stemCountChanged(int count);
    void crossfadePositionChanged(float position);
    void nextSongLoaded();
    /// A song requested through showSong() is now current (#187).
    void songSwitched();
    void stemStateChanged(int index);
    void activeBackgroundVideoChanged(const QString& path);
#endif

private slots:
    // UI thread: applies decodes the engine's worker finished (queued by name, no captures).
    void drainPreloadResults();

private:
    bool switchToPreloadedSong();
    void startPreload(const std::vector<Core::MediaStem>& stems, bool switchWhenReady);
    void onPreloadReady(std::uint64_t ticket, bool hasStems);

    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_AUDIO_MIXER_VIEWMODEL_HPP
