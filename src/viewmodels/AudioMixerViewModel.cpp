#include "AudioMixerViewModel.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct AudioMixerViewModel::Impl {
    std::shared_ptr<Media::AudioEngine> m_activeDeck;
    std::shared_ptr<Media::AudioEngine> m_nextDeck;
    Media::StemMixer stemMixer;
    float m_crossfadePos{0.0f};

    Impl(std::shared_ptr<Media::AudioEngine> engine)
        : m_activeDeck(std::move(engine))
    {
        if (!m_activeDeck) {
            m_activeDeck = std::make_shared<Media::AudioEngine>();
        }
        m_nextDeck = std::make_shared<Media::AudioEngine>();
    }
};

AudioMixerViewModel::AudioMixerViewModel(std::shared_ptr<Media::AudioEngine> audioEngine)
    : m_impl(std::make_unique<Impl>(std::move(audioEngine)))
{}

AudioMixerViewModel::~AudioMixerViewModel() = default;

float AudioMixerViewModel::masterVolume() const noexcept {
    return m_impl->m_activeDeck->masterVolume();
}

void AudioMixerViewModel::setMasterVolume(float volume) noexcept {
    if (m_impl->m_activeDeck->masterVolume() != volume) {
        // Master volume applies to the mix. We could store a global master if crossfade overrides engine master.
        // For simplicity, we assume setMasterVolume applies directly to active deck, and crossfading overrides this temporarily.
        m_impl->m_activeDeck->setMasterVolume(volume);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit masterVolumeChanged(volume);
#endif
    }
}

int AudioMixerViewModel::pitchShiftSemitones() const noexcept {
    return m_impl->m_activeDeck->pitchShiftSemitones();
}

void AudioMixerViewModel::setPitchShiftSemitones(int semitones) noexcept {
    if (m_impl->m_activeDeck->pitchShiftSemitones() != semitones) {
        m_impl->m_activeDeck->setPitchShiftSemitones(semitones);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit pitchShiftChanged(semitones);
#endif
    }
}

bool AudioMixerViewModel::isPlaying() const noexcept {
    return m_impl->m_activeDeck->isPlaying();
}

double AudioMixerViewModel::positionSeconds() const noexcept {
    return m_impl->m_activeDeck->positionSeconds();
}

double AudioMixerViewModel::durationSeconds() const noexcept {
    return m_impl->m_activeDeck->durationSeconds();
}

int AudioMixerViewModel::loadedStemCount() const noexcept {
    return static_cast<int>(m_impl->m_activeDeck->loadedStems().size());
}

float AudioMixerViewModel::crossfadePosition() const noexcept {
    return m_impl->m_crossfadePos;
}

bool AudioMixerViewModel::loadSongStems(const std::vector<Core::MediaStem>& stems) {
    bool result = m_impl->m_activeDeck->loadStems(stems);
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit stemCountChanged(loadedStemCount());
    emit durationChanged(durationSeconds());
    emit positionChanged(positionSeconds());
    emit playStateChanged(isPlaying());
#endif
    return result;
}

bool AudioMixerViewModel::loadNextSongStems(const std::vector<Core::MediaStem>& stems) {
    // Load stems into the inactive/next deck without altering active deck playback
    bool result = m_impl->m_nextDeck->loadStems(stems);
#ifdef HARMONYSYNC_QT_AVAILABLE
    if (result) {
        emit nextSongLoaded();
    }
#endif
    return result;
}

void AudioMixerViewModel::setCrossfadePosition(float position) noexcept {
    float clamped = std::clamp(position, 0.0f, 1.0f);
    if (m_impl->m_crossfadePos == clamped) return;

    m_impl->m_crossfadePos = clamped;
    
    // Equal power crossfade
    float activeVol = std::sqrt(1.0f - clamped);
    float nextVol = std::sqrt(clamped);
    
    // Apply crossfade multiplier to the master volume
    // Assuming 1.0f is default, but really we'd multiply by global master.
    m_impl->m_activeDeck->setMasterVolume(activeVol);
    m_impl->m_nextDeck->setMasterVolume(nextVol);
    
    // Automatically start playing next deck if we begin crossfading
    if (clamped > 0.0f && !m_impl->m_nextDeck->isPlaying()) {
        m_impl->m_nextDeck->play();
    }

#ifdef HARMONYSYNC_QT_AVAILABLE
    emit crossfadePositionChanged(clamped);
#endif
}

void AudioMixerViewModel::finalizeCrossfade() {
    // Stop the old active deck
    m_impl->m_activeDeck->stop();
    
    // Swap decks
    std::swap(m_impl->m_activeDeck, m_impl->m_nextDeck);
    
    // Reset crossfade position silently
    m_impl->m_crossfadePos = 0.0f;
    m_impl->m_activeDeck->setMasterVolume(1.0f);
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    // Broadcast all new states of the newly active deck
    emit stemCountChanged(loadedStemCount());
    emit durationChanged(durationSeconds());
    emit positionChanged(positionSeconds());
    emit playStateChanged(isPlaying());
    emit crossfadePositionChanged(0.0f);
#endif
}

void AudioMixerViewModel::play() {
    m_impl->m_activeDeck->play();
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit playStateChanged(isPlaying());
#endif
}

void AudioMixerViewModel::pause() {
    m_impl->m_activeDeck->pause();
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit playStateChanged(isPlaying());
#endif
}

void AudioMixerViewModel::stop() {
    m_impl->m_activeDeck->stop();
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit playStateChanged(isPlaying());
    emit positionChanged(positionSeconds());
#endif
}

void AudioMixerViewModel::seek(double position) {
    m_impl->m_activeDeck->seek(position);
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit positionChanged(positionSeconds());
#endif
}

void AudioMixerViewModel::setStemVolume(int stemIndex, float volume) {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (stemIndex >= 0 && stemIndex < static_cast<int>(stems.size())) {
        stems[static_cast<size_t>(stemIndex)].setVolume(volume);
        m_impl->m_activeDeck->loadStems(stems);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit stemStateChanged(stemIndex);
#endif
    }
}

void AudioMixerViewModel::toggleStemMute(int stemIndex) {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (stemIndex >= 0 && stemIndex < static_cast<int>(stems.size())) {
        bool currentMute = stems[static_cast<size_t>(stemIndex)].isMuted();
        stems[static_cast<size_t>(stemIndex)].setMuted(!currentMute);
        m_impl->m_activeDeck->loadStems(stems);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit stemStateChanged(stemIndex);
#endif
    }
}

void AudioMixerViewModel::toggleStemSolo(int stemIndex) {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (stemIndex >= 0 && stemIndex < static_cast<int>(stems.size())) {
        bool currentSolo = stems[static_cast<size_t>(stemIndex)].isSolo();
        stems[static_cast<size_t>(stemIndex)].setSolo(!currentSolo);
        m_impl->m_activeDeck->loadStems(stems);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit stemStateChanged(stemIndex);
#endif
    }
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString AudioMixerViewModel::stemName(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && index < static_cast<int>(stems.size())) {
        return QString::fromStdString(stems[static_cast<size_t>(index)].name());
    }
    return QString();
}
#else
std::string AudioMixerViewModel::stemName(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && index < static_cast<int>(stems.size())) {
        return stems[static_cast<size_t>(index)].name();
    }
    return "";
}
#endif

float AudioMixerViewModel::stemVolume(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && index < static_cast<int>(stems.size())) {
        return stems[static_cast<size_t>(index)].volume();
    }
    return 1.0f;
}

bool AudioMixerViewModel::stemIsMuted(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && index < static_cast<int>(stems.size())) {
        return stems[static_cast<size_t>(index)].isMuted();
    }
    return false;
}

bool AudioMixerViewModel::stemIsSoloed(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && index < static_cast<int>(stems.size())) {
        return stems[static_cast<size_t>(index)].isSolo();
    }
    return false;
}

} // namespace HarmonySync::ViewModels
