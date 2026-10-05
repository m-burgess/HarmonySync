#include "AudioMixerViewModel.hpp"
#include <utility>
#include <filesystem>
#include <algorithm>
#include <cmath>
#include "FolderService.hpp"
#include "FFmpegTransposer.hpp"

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QTimer>
#endif

namespace HarmonySync::ViewModels {

struct AudioMixerViewModel::Impl {
    std::shared_ptr<Media::AudioEngine> m_activeDeck;
    std::shared_ptr<Media::AudioEngine> m_nextDeck;
    Media::StemMixer stemMixer;
    float m_crossfadePos{0.0f};
    std::string activeBackgroundVideo;
    std::string nextBackgroundVideo;
    bool isTransposing{false};
    Media::FFmpegTransposer transposer;

#ifdef HARMONYSYNC_QT_AVAILABLE
    std::unique_ptr<QTimer> autosaveTimer;
    std::unique_ptr<QTimer> transposeDebounceTimer;
    std::unique_ptr<QTimer> positionTimer;
#endif

    Impl(std::shared_ptr<Media::AudioEngine> engine)
        : m_activeDeck(std::move(engine))
    {
        if (!m_activeDeck) {
            m_activeDeck = std::make_shared<Media::AudioEngine>();
        }
        m_nextDeck = std::make_shared<Media::AudioEngine>();

#ifdef HARMONYSYNC_QT_AVAILABLE
        autosaveTimer = std::make_unique<QTimer>();
        autosaveTimer->setSingleShot(true);
        autosaveTimer->setInterval(500); // 500ms debounce
        
        transposeDebounceTimer = std::make_unique<QTimer>();
        transposeDebounceTimer->setSingleShot(true);
        transposeDebounceTimer->setInterval(700); // 700ms debounce before starting ffmpeg

        positionTimer = std::make_unique<QTimer>();
        positionTimer->setInterval(33); // ~30 fps UI update
#endif
    }
};

AudioMixerViewModel::AudioMixerViewModel(std::shared_ptr<Media::AudioEngine> audioEngine)
    : m_impl(std::make_unique<Impl>(std::move(audioEngine)))
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    QObject::connect(m_impl->autosaveTimer.get(), &QTimer::timeout, this, [this]() {
        auto stems = m_impl->m_activeDeck->loadedStems();
        if (!stems.empty()) {
            std::string folderPath = std::filesystem::path(stems[0].filePath()).parent_path().string();
            Core::FolderService::saveMixState(folderPath, stems);
        }
    });

    QObject::connect(m_impl->positionTimer.get(), &QTimer::timeout, this, [this]() {
        if (m_impl->m_activeDeck->isPlaying()) {
            emit positionChanged(positionSeconds());
        }
    });
    
    QObject::connect(m_impl->transposeDebounceTimer.get(), &QTimer::timeout, this, [this]() {
        auto stems = m_impl->m_activeDeck->loadedStems();
        if (stems.empty()) return;
        
        std::filesystem::path folderPath = std::filesystem::path(stems[0].filePath()).parent_path();
        // If transposed stems are from a subfolder, we need the actual root folder
        if (folderPath.filename().string().find("Transposed_") != std::string::npos) {
            folderPath = folderPath.parent_path();
        }
        
        m_impl->isTransposing = true;
        emit isTransposingChanged(true);
        
        bool wasPlaying = m_impl->m_activeDeck->isPlaying();
        double currentPos = m_impl->m_activeDeck->positionSeconds();
        
        if (wasPlaying) {
            m_impl->m_activeDeck->pause();
        }
        
        int targetSemitones = pitchShiftSemitones();
        
        m_impl->transposer.transposeStemsAsync(stems, folderPath, targetSemitones, [this, wasPlaying, currentPos](std::vector<Core::MediaStem> newStems) {
            QMetaObject::invokeMethod(this, [this, newStems, wasPlaying, currentPos]() {
                m_impl->m_activeDeck->loadStems(newStems);
                m_impl->m_activeDeck->seek(currentPos);
                if (wasPlaying) {
                    m_impl->m_activeDeck->play();
                }
                m_impl->isTransposing = false;
                emit isTransposingChanged(false);
            }, Qt::QueuedConnection);
        });
    });
#endif
}

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
        m_impl->transposeDebounceTimer->start();
#endif
    }
}

bool AudioMixerViewModel::isTransposing() const noexcept {
    return m_impl->isTransposing;
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

#ifdef HARMONYSYNC_QT_AVAILABLE
QString AudioMixerViewModel::activeBackgroundVideo() const {
    return QString::fromStdString(m_impl->activeBackgroundVideo);
}

void AudioMixerViewModel::loadNextBackgroundVideo(const QString& path) {
    m_impl->nextBackgroundVideo = path.toStdString();
}

void AudioMixerViewModel::setActiveBackgroundVideo(const QString& path) {
    std::string pathStr = path.toStdString();
    if (m_impl->activeBackgroundVideo != pathStr) {
        m_impl->activeBackgroundVideo = pathStr;
        emit activeBackgroundVideoChanged(path);
    }
}
#else
std::string AudioMixerViewModel::activeBackgroundVideo() const {
    return m_impl->activeBackgroundVideo;
}

void AudioMixerViewModel::loadNextBackgroundVideo(const std::string& path) {
    m_impl->nextBackgroundVideo = path;
}

void AudioMixerViewModel::setActiveBackgroundVideo(const std::string& path) {
    if (m_impl->activeBackgroundVideo != path) {
        m_impl->activeBackgroundVideo = path;
    }
}
#endif

bool AudioMixerViewModel::loadNextSongStems(const std::vector<Core::MediaStem>& stems) {
    // Preload on the active deck, then switch. Do not fill the next deck.
    if (!m_impl->m_activeDeck->preloadStems(stems)) {
        return false;
    }
    bool result = m_impl->m_activeDeck->switchToPreloaded();
#ifdef HARMONYSYNC_QT_AVAILABLE
    if (result) {
        emit nextSongLoaded();
        emit stemCountChanged(loadedStemCount());
        emit durationChanged(durationSeconds());
        emit positionChanged(positionSeconds());
        emit playStateChanged(isPlaying());
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
    
    // Swap background video
    m_impl->activeBackgroundVideo = m_impl->nextBackgroundVideo;
    
    // Reset crossfade position silently
    m_impl->m_crossfadePos = 0.0f;
    m_impl->m_activeDeck->setMasterVolume(1.0f);
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    // Broadcast all new states of the newly active deck
    emit activeBackgroundVideoChanged(QString::fromStdString(m_impl->activeBackgroundVideo));
    emit stemCountChanged(loadedStemCount());
    emit durationChanged(durationSeconds());
    emit positionChanged(positionSeconds());
    emit playStateChanged(isPlaying());
    emit crossfadePositionChanged(0.0f);
    
    if (m_impl->m_activeDeck->isPlaying()) {
        m_impl->positionTimer->start();
    } else {
        m_impl->positionTimer->stop();
    }
#endif
}

void AudioMixerViewModel::play() {
    m_impl->m_activeDeck->play();
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->positionTimer->start();
    emit playStateChanged(isPlaying());
#endif
}

void AudioMixerViewModel::pause() {
    m_impl->m_activeDeck->pause();
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->positionTimer->stop();
    emit playStateChanged(isPlaying());
#endif
}

void AudioMixerViewModel::stop() {
    m_impl->m_activeDeck->stop();
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->positionTimer->stop();
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
    m_impl->m_activeDeck->setStemVolume(stemIndex, volume);
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->autosaveTimer->start();
    emit stemStateChanged(stemIndex);
#endif
}

void AudioMixerViewModel::toggleStemMute(int stemIndex) {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (stemIndex >= 0 && stemIndex < static_cast<int>(stems.size())) {
        bool currentMute = stems[static_cast<size_t>(stemIndex)].isMuted();
        m_impl->m_activeDeck->setStemMuted(stemIndex, !currentMute);
#ifdef HARMONYSYNC_QT_AVAILABLE
        m_impl->autosaveTimer->start();
        emit stemStateChanged(stemIndex);
#endif
    }
}

void AudioMixerViewModel::toggleStemSolo(int stemIndex) {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (stemIndex >= 0 && stemIndex < static_cast<int>(stems.size())) {
        bool currentSolo = stems[static_cast<size_t>(stemIndex)].isSolo();
        m_impl->m_activeDeck->setStemSolo(stemIndex, !currentSolo);
#ifdef HARMONYSYNC_QT_AVAILABLE
        m_impl->autosaveTimer->start();
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
