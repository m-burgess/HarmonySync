#include "AudioMixerViewModel.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct AudioMixerViewModel::Impl {
    std::shared_ptr<Media::AudioEngine> audioEngine;
    Media::StemMixer stemMixer;

    Impl(std::shared_ptr<Media::AudioEngine> engine)
        : audioEngine(std::move(engine))
    {
        if (!audioEngine) {
            audioEngine = std::make_shared<Media::AudioEngine>();
        }
    }
};

AudioMixerViewModel::AudioMixerViewModel(std::shared_ptr<Media::AudioEngine> audioEngine)
    : m_impl(std::make_unique<Impl>(std::move(audioEngine)))
{}

AudioMixerViewModel::~AudioMixerViewModel() = default;

float AudioMixerViewModel::masterVolume() const noexcept {
    return m_impl->audioEngine->masterVolume();
}

void AudioMixerViewModel::setMasterVolume(float volume) noexcept {
    if (m_impl->audioEngine->masterVolume() != volume) {
        m_impl->audioEngine->setMasterVolume(volume);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit masterVolumeChanged(volume);
#endif
    }
}

int AudioMixerViewModel::pitchShiftSemitones() const noexcept {
    return m_impl->audioEngine->pitchShiftSemitones();
}

void AudioMixerViewModel::setPitchShiftSemitones(int semitones) noexcept {
    if (m_impl->audioEngine->pitchShiftSemitones() != semitones) {
        m_impl->audioEngine->setPitchShiftSemitones(semitones);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit pitchShiftChanged(semitones);
#endif
    }
}

bool AudioMixerViewModel::isPlaying() const noexcept {
    return m_impl->audioEngine->isPlaying();
}

double AudioMixerViewModel::positionSeconds() const noexcept {
    return m_impl->audioEngine->positionSeconds();
}

double AudioMixerViewModel::durationSeconds() const noexcept {
    return m_impl->audioEngine->durationSeconds();
}

int AudioMixerViewModel::loadedStemCount() const noexcept {
    return static_cast<int>(m_impl->audioEngine->loadedStems().size());
}

bool AudioMixerViewModel::loadSongStems(const std::vector<Core::MediaStem>& stems) {
    bool result = m_impl->audioEngine->loadStems(stems);
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit stemCountChanged(loadedStemCount());
    emit durationChanged(durationSeconds());
    emit positionChanged(positionSeconds());
    emit playStateChanged(isPlaying());
#endif
    return result;
}

void AudioMixerViewModel::play() {
    m_impl->audioEngine->play();
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit playStateChanged(isPlaying());
#endif
}

void AudioMixerViewModel::pause() {
    m_impl->audioEngine->pause();
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit playStateChanged(isPlaying());
#endif
}

void AudioMixerViewModel::stop() {
    m_impl->audioEngine->stop();
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit playStateChanged(isPlaying());
    emit positionChanged(positionSeconds());
#endif
}

void AudioMixerViewModel::seek(double position) {
    m_impl->audioEngine->seek(position);
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit positionChanged(positionSeconds());
#endif
}

void AudioMixerViewModel::setStemVolume(int stemIndex, float volume) {
    auto stems = m_impl->audioEngine->loadedStems();
    if (stemIndex >= 0 && stemIndex < static_cast<int>(stems.size())) {
        stems[static_cast<size_t>(stemIndex)].setVolume(volume);
        m_impl->audioEngine->loadStems(stems);
    }
}

void AudioMixerViewModel::toggleStemMute(int stemIndex) {
    auto stems = m_impl->audioEngine->loadedStems();
    if (stemIndex >= 0 && stemIndex < static_cast<int>(stems.size())) {
        bool currentMute = stems[static_cast<size_t>(stemIndex)].isMuted();
        stems[static_cast<size_t>(stemIndex)].setMuted(!currentMute);
        m_impl->audioEngine->loadStems(stems);
    }
}

void AudioMixerViewModel::toggleStemSolo(int stemIndex) {
    auto stems = m_impl->audioEngine->loadedStems();
    if (stemIndex >= 0 && stemIndex < static_cast<int>(stems.size())) {
        bool currentSolo = stems[static_cast<size_t>(stemIndex)].isSolo();
        stems[static_cast<size_t>(stemIndex)].setSolo(!currentSolo);
        m_impl->audioEngine->loadStems(stems);
    }
}

} // namespace HarmonySync::ViewModels
