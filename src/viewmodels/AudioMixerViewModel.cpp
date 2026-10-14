#include "AudioMixerViewModel.hpp"
#include <utility>
#include <filesystem>
#include <algorithm>
#include <cmath>
#include "FolderService.hpp"
#include "FFmpegTransposer.hpp"

#include <mutex>
#include <type_traits>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QMetaObject>
#include <QTimer>
#endif

namespace HarmonySync::ViewModels {

namespace {
// saveMixState returns void today; C++ Lead is changing it to bool (false on failure).
// Compile against either: void counts as success, bool is passed through.
// (A template so the untaken branch is discarded.)
template <typename Service = Core::FolderService>
bool saveMixStateWithResult(const std::string& folderPath, const std::vector<Core::MediaStem>& stems) {
    using Result = decltype(Service::saveMixState(folderPath, stems));
    if constexpr (std::is_void_v<Result>) {
        Service::saveMixState(folderPath, stems);
        return true;
    } else {
        return static_cast<bool>(Service::saveMixState(folderPath, stems));
    }
}
} // namespace

struct AudioMixerViewModel::Impl {
    std::shared_ptr<Media::AudioEngine> m_activeDeck;
    std::shared_ptr<Media::AudioEngine> m_nextDeck;
    Media::StemMixer stemMixer;
    float m_crossfadePos{0.0f};
    std::string activeBackgroundVideo;
    std::string nextBackgroundVideo;
    bool isTransposing{false};
    Media::FFmpegTransposer transposer;

    // #187: the song being (or already) preloaded, keyed by its stem file paths.
    std::vector<std::string> preloadKey;
    Media::AudioEngine::PreloadTicket preloadTicket{0};
    bool preloadReady{false};
    bool switchWhenReady{false};

    // The engine's onReady runs on its worker. It may only post to this view model while
    // the view model is alive; the destructor clears target under the lock first.
    struct CallbackGuard {
        std::mutex mutex;
        AudioMixerViewModel* target{nullptr};
        // Finished decodes waiting for the UI thread, guarded by mutex.
        std::vector<std::pair<std::uint64_t, bool>> readyResults;
    };
    std::shared_ptr<CallbackGuard> callbackGuard = std::make_shared<CallbackGuard>();

    MixStateSaver mixSaver = [](const std::string& folder, std::vector<Core::MediaStem> stems) {
        return saveMixStateWithResult(folder, stems);
    };

#ifdef HARMONYSYNC_QT_AVAILABLE
    std::unique_ptr<QTimer> autosaveTimer;
    std::unique_ptr<QTimer> transposeDebounceTimer;
    std::unique_ptr<QTimer> positionTimer;
#endif

    Impl(std::shared_ptr<Media::AudioEngine> engine, std::shared_ptr<Media::AudioEngine> nextEngine)
        : m_activeDeck(std::move(engine)) {
        if (!m_activeDeck) {
            m_activeDeck = std::make_shared<Media::AudioEngine>();
        }
        m_nextDeck = std::move(nextEngine);
        if (!m_nextDeck) {
            m_nextDeck = std::make_shared<Media::AudioEngine>();
        }

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

AudioMixerViewModel::AudioMixerViewModel(std::shared_ptr<Media::AudioEngine> audioEngine,
                                         std::shared_ptr<Media::AudioEngine> nextAudioEngine)
    : m_impl(std::make_unique<Impl>(std::move(audioEngine), std::move(nextAudioEngine))) {
    m_impl->callbackGuard->target = this;
#ifdef HARMONYSYNC_QT_AVAILABLE
    QObject::connect(m_impl->autosaveTimer.get(), &QTimer::timeout, this, [this]() { requestMixSave(); });

    QObject::connect(m_impl->positionTimer.get(), &QTimer::timeout, this, [this]() {
        if (m_impl->m_activeDeck->isPlaying()) {
            emit positionChanged(positionSeconds());
        }
    });

    QObject::connect(m_impl->transposeDebounceTimer.get(), &QTimer::timeout, this, [this]() {
        auto stems = m_impl->m_activeDeck->loadedStems();
        if (stems.empty()) {
            return;
        }

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

        m_impl->transposer.transposeStemsAsync(
            stems, folderPath, targetSemitones,
            [this, wasPlaying,
             currentPos](std::vector<Core::MediaStem> newStems) { // NOLINT(performance-unnecessary-value-param): the
                                                                  // queued closure owns the decoded stems.
                QMetaObject::invokeMethod( // NOLINT(clang-analyzer-cplusplus.NewDeleteLeaks): Qt owns queued functors.
                    this,
                    [this, newStems, wasPlaying, currentPos]() {
                        m_impl->m_activeDeck->loadStems(newStems);
                        m_impl->m_activeDeck->seek(currentPos);
                        if (wasPlaying) {
                            m_impl->m_activeDeck->play();
                        }
                        m_impl->isTransposing = false;
                        emit isTransposingChanged(false);
                    },
                    Qt::QueuedConnection);
            });
    });
#endif
}

AudioMixerViewModel::~AudioMixerViewModel() {
    // Stop worker callbacks from posting here before the engines (and their workers) go away.
    std::lock_guard lock(m_impl->callbackGuard->mutex);
    m_impl->callbackGuard->target = nullptr;
}

namespace {
std::vector<std::string> songKey(const std::vector<Core::MediaStem>& stems) {
    std::vector<std::string> key;
    key.reserve(stems.size());
    for (const auto& stem : stems) {
        key.push_back(stem.filePath());
    }
    return key;
}
} // namespace

float AudioMixerViewModel::masterVolume() const noexcept {
    return m_impl->m_activeDeck->masterVolume();
}

void AudioMixerViewModel::setMasterVolume(float volume) noexcept {
    if (m_impl->m_activeDeck->masterVolume() != volume) {
        // Master volume applies to the mix. We could store a global master if crossfade overrides engine master.
        // For simplicity, we assume setMasterVolume applies directly to active deck, and crossfading overrides this
        // temporarily.
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
    // loadStems cancels any pending preload in the engine; forget ours too.
    m_impl->preloadKey.clear();
    m_impl->preloadReady = false;
    m_impl->switchWhenReady = false;
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
    // Synchronous preload and switch in one call; decodes on the calling thread.
    // The app uses showSong()/preloadNextSong() instead (#187).
    m_impl->preloadKey.clear();
    m_impl->preloadReady = false;
    m_impl->switchWhenReady = false;
    // Preload on the active deck, then switch. Do not fill the next deck.
    // Play-or-cue rule (#202): the switch keeps the current play state. If a song is
    // playing, the next song plays from 0; if stopped (opening a service order or
    // advancing the setlist), the next song is cued at 0 and waits for play().
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

bool AudioMixerViewModel::showSong(const std::vector<Core::MediaStem>& stems) {
#ifdef HARMONYSYNC_QT_AVAILABLE
    if (!m_impl->preloadKey.empty() && songKey(stems) == m_impl->preloadKey) {
        if (m_impl->preloadReady) {
            return switchToPreloadedSong();
        }
        // Still decoding: switch as soon as it is ready. The current song keeps playing.
        m_impl->switchWhenReady = true;
        return true;
    }
    startPreload(stems, /*switchWhenReady=*/true);
    return true;
#else
    // Without Qt there is no UI thread to protect: preload and switch in one call.
    return loadNextSongStems(stems);
#endif
}

void AudioMixerViewModel::preloadNextSong(const std::vector<Core::MediaStem>& stems) {
#ifdef HARMONYSYNC_QT_AVAILABLE
    if (stems.empty() || songKey(stems) == m_impl->preloadKey) {
        return;
    }
    startPreload(stems, /*switchWhenReady=*/false);
#else
    (void)stems;
#endif
}

void AudioMixerViewModel::startPreload(const std::vector<Core::MediaStem>& stems, bool switchWhenReady) {
    m_impl->preloadKey = songKey(stems);
    m_impl->preloadReady = false;
    m_impl->switchWhenReady = switchWhenReady;
#ifdef HARMONYSYNC_QT_AVAILABLE
    // A newer preload cancels the pending one in the engine, and its ticket is ignored here.
    m_impl->preloadTicket = m_impl->m_activeDeck->preloadStemsAsync(
        stems, [guard = m_impl->callbackGuard](Media::AudioEngine::PreloadTicket ticket, bool hasStems) {
            // Worker thread: post to the UI thread, never touch the view model here.
            std::lock_guard lock(guard->mutex);
            // The result goes through our own mutex and the post carries no data, so the
            // handoff is ordered by a lock every tool (including ThreadSanitizer) can see.
            if (AudioMixerViewModel* target = guard->target) {
                guard->readyResults.emplace_back(ticket, hasStems);
                QMetaObject::invokeMethod(target, "drainPreloadResults", Qt::QueuedConnection);
            }
        });
#endif
}

void AudioMixerViewModel::drainPreloadResults() {
    std::vector<std::pair<std::uint64_t, bool>> results;
    {
        std::lock_guard lock(m_impl->callbackGuard->mutex);
        results.swap(m_impl->callbackGuard->readyResults);
    }
    for (const auto& [ticket, hasStems] : results) {
        onPreloadReady(ticket, hasStems);
    }
}

void AudioMixerViewModel::onPreloadReady(std::uint64_t ticket, bool hasStems) {
    if (ticket != m_impl->preloadTicket) {
        return; // a newer request replaced this one
    }
    m_impl->preloadReady = true;
    if (!hasStems) {
        // Nothing playable (or cancelled): keep the current song, retry on the next request.
        m_impl->preloadKey.clear();
        m_impl->switchWhenReady = false;
        return;
    }
    if (m_impl->switchWhenReady) {
        m_impl->switchWhenReady = false;
        switchToPreloadedSong();
    }
}

bool AudioMixerViewModel::switchToPreloadedSong() {
    // Play-or-cue rule (#202): the switch keeps the current play state.
    bool result = m_impl->m_activeDeck->switchToPreloaded();
    m_impl->preloadKey.clear();
    m_impl->preloadReady = false;
    m_impl->switchWhenReady = false;
#ifdef HARMONYSYNC_QT_AVAILABLE
    if (result) {
        emit nextSongLoaded();
        emit stemCountChanged(loadedStemCount());
        emit durationChanged(durationSeconds());
        emit positionChanged(positionSeconds());
        emit playStateChanged(isPlaying());
        emit songSwitched();
    }
#endif
    return result;
}

void AudioMixerViewModel::setPreloadDecodeHookForTesting(std::function<void()> hook) {
    m_impl->m_activeDeck->setPreloadDecodeHookForTesting(std::move(hook));
}

void AudioMixerViewModel::clearPreloadedSong() {
    m_impl->m_activeDeck->clearPreloaded();
    // A cancelled decode still reports; ticket 0 never matches, so it is ignored.
    m_impl->preloadKey.clear();
    m_impl->preloadTicket = 0;
    m_impl->preloadReady = false;
    m_impl->switchWhenReady = false;
}

void AudioMixerViewModel::clearPreloadedSongKeepingPendingAdvance() {
    if (m_impl->switchWhenReady && !m_impl->preloadKey.empty()) {
        return;
    }
    clearPreloadedSong();
}

void AudioMixerViewModel::unloadCurrentSong() {
    m_impl->m_activeDeck->unloadCurrent();
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->positionTimer->stop();
    emit stemCountChanged(loadedStemCount());
    emit durationChanged(durationSeconds());
    emit positionChanged(positionSeconds());
    emit playStateChanged(isPlaying());
#endif
}

bool AudioMixerViewModel::isPreloadedSong(const std::vector<Core::MediaStem>& stems) const {
    return !stems.empty() && !m_impl->preloadKey.empty() && songKey(stems) == m_impl->preloadKey;
}

bool AudioMixerViewModel::isPreloadReadyForTesting() const noexcept {
    return m_impl->preloadReady;
}

std::size_t AudioMixerViewModel::liveSongSetCountForTesting() const noexcept {
    return m_impl->m_activeDeck->liveSongSetCountForTesting() + m_impl->m_nextDeck->liveSongSetCountForTesting();
}

void AudioMixerViewModel::setMixStateSaverForTesting(MixStateSaver saver) {
    m_impl->mixSaver = std::move(saver);
}

// STUB (fail-first commit): still writes on the UI thread.
void AudioMixerViewModel::requestMixSave() {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (stems.empty()) return;
    std::string folderPath = std::filesystem::path(stems[0].filePath()).parent_path().string();
    bool ok = m_impl->mixSaver(folderPath, stems);
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit mixSaveFinished(ok);
#else
    (void)ok;
#endif
}

void AudioMixerViewModel::flushPendingMixSave() {}

#ifdef HARMONYSYNC_QT_AVAILABLE
void AudioMixerViewModel::drainMixSaveResults() {}
#endif

void AudioMixerViewModel::setCrossfadePosition(float position) noexcept {
    float clamped = std::clamp(position, 0.0f, 1.0f);
    if (m_impl->m_crossfadePos == clamped) {
        return;
    }

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
    if (stemIndex >= 0 && static_cast<std::size_t>(stemIndex) < stems.size()) {
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
    if (stemIndex >= 0 && static_cast<std::size_t>(stemIndex) < stems.size()) {
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
    if (index >= 0 && static_cast<std::size_t>(index) < stems.size()) {
        return QString::fromStdString(stems[static_cast<size_t>(index)].name());
    }
    return QString();
}
#else
std::string AudioMixerViewModel::stemName(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && static_cast<std::size_t>(index) < stems.size()) {
        return stems[static_cast<size_t>(index)].name();
    }
    return "";
}
#endif

float AudioMixerViewModel::stemVolume(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && static_cast<std::size_t>(index) < stems.size()) {
        return stems[static_cast<size_t>(index)].volume();
    }
    return 1.0f;
}

bool AudioMixerViewModel::stemIsMuted(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && static_cast<std::size_t>(index) < stems.size()) {
        return stems[static_cast<size_t>(index)].isMuted();
    }
    return false;
}

bool AudioMixerViewModel::stemIsSoloed(int index) const {
    auto stems = m_impl->m_activeDeck->loadedStems();
    if (index >= 0 && static_cast<std::size_t>(index) < stems.size()) {
        return stems[static_cast<size_t>(index)].isSolo();
    }
    return false;
}

} // namespace HarmonySync::ViewModels
