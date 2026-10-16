#include "AudioEngine.hpp"
#include "FFmpegAudioDecoder.hpp"
#include "RealtimeHandoff.hpp"
#include <algorithm>
#include <iostream>
#include <vector>
#include <atomic>
#include <cmath>
#include <cctype>
#include <functional>
#include <thread>

#ifdef HARMONYSYNC_HAS_QT
#include <QIODevice>
#include <QAudioSink>
#include <QMediaDevices>
#include <QAudioDevice>

namespace HarmonySync::Media {

/// Counts one live song buffer set against its engine (#185). Move-only; a moved-from or
/// default lease counts nothing. Never released on the audio thread: retired sets are freed
/// on the control thread.
class SongSetLease {
public:
    SongSetLease() = default;
    explicit SongSetLease(std::shared_ptr<std::atomic<std::size_t>> counter) noexcept
        : m_counter(std::move(counter)) {
        if (m_counter) m_counter->fetch_add(1, std::memory_order_relaxed);
    }
    SongSetLease(SongSetLease&& other) noexcept : m_counter(std::move(other.m_counter)) {}
    SongSetLease& operator=(SongSetLease&& other) noexcept {
        if (this != &other) {
            release();
            m_counter = std::move(other.m_counter);
        }
        return *this;
    }
    ~SongSetLease() { release(); }

private:
    void release() noexcept {
        if (m_counter) {
            m_counter->fetch_sub(1, std::memory_order_relaxed);
            m_counter.reset();
        }
    }
    std::shared_ptr<std::atomic<std::size_t>> m_counter;
};

class AudioMixerDevice : public QIODevice {
public:
    struct StemBuffer {
        Core::MediaStem stem;
        MappedAudioFile mappedFile;
    };

    /// One song's mapped stems. Built and freed on the control thread only.
    struct StemBufferSet {
        SongSetLease lease; // first, so it is released after the buffers are unmapped
        std::vector<StemBuffer> buffers;
        double duration = 0.0;
    };

    /// Song handoff (#177): the control thread publishes a fully mapped set; readData() takes
    /// it at the top of its next callback. The old set is retired, not freed, on the audio thread.
    RealtimeHandoff<StemBufferSet> m_sets;
    std::atomic<double>* m_position;
    std::atomic<PlaybackState>* m_state;
    std::atomic<float>* m_masterVolume;
    std::atomic<double> m_duration{0.0}; // duration of the set readData() is using

    AudioMixerDevice(QObject* parent = nullptr) : QIODevice(parent) {}

    bool isSequential() const override { return true; }

    qint64 readData(char *data, qint64 maxlen) override {
        // Take a staged song before touching any buffers. Every position write in this
        // callback comes after the handoff, so a late write of the old song's position
        // cannot undo the reset to 0.
        const bool switchedSong = m_sets.acquirePending();
        const StemBufferSet* active = m_sets.current();
        if (switchedSong) {
            m_duration.store(active != nullptr ? active->duration : 0.0, std::memory_order_relaxed);
            m_position->store(0.0, std::memory_order_relaxed);
        }

        if (m_state->load(std::memory_order_acquire) != PlaybackState::Playing || active == nullptr) {
            std::fill(data, data + maxlen, 0);
            return maxlen; // Output silence when paused/stopped to keep sink alive
        }

        const std::vector<StemBuffer>& buffers = active->buffers;
        const double duration = active->duration;

        int frameSize = 2 * sizeof(int16_t); // Stereo 16-bit
        int framesToRead = maxlen / frameSize;
        int16_t* outBuffer = reinterpret_cast<int16_t*>(data);

        double currentPosSec = switchedSong ? 0.0 : m_position->load(std::memory_order_relaxed);
        int currentFrame = static_cast<int>(currentPosSec * 44100.0);

        bool anySolo = false;
        for (const auto& buf : buffers) {
            if (buf.stem.isSolo()) {
                anySolo = true;
                break;
            }
        }

        float masterVol = m_masterVolume->load(std::memory_order_relaxed);

        for (int i = 0; i < framesToRead; ++i) {
            int frameIdx = currentFrame + i;
            float mixL = 0.0f;
            float mixR = 0.0f;

            for (const auto& buf : buffers) {
                if (buf.stem.isMuted()) continue;
                if (anySolo && !buf.stem.isSolo()) continue;

                int sampleIdx = frameIdx * buf.mappedFile.info.channels;
                if (sampleIdx < static_cast<int>(buf.mappedFile.sampleCount)) {
                    float sampleL = static_cast<float>(buf.mappedFile.pcmData[sampleIdx]) / 32768.0f;
                    float sampleR = sampleL;
                    if (buf.mappedFile.info.channels >= 2 && sampleIdx + 1 < static_cast<int>(buf.mappedFile.sampleCount)) {
                        sampleR = static_cast<float>(buf.mappedFile.pcmData[sampleIdx + 1]) / 32768.0f;
                    }

                    float vol = buf.stem.volume();
                    float pan = buf.stem.pan();

                    // Equal power panning
                    // pan is -1.0 to +1.0
                    float panAngle = (pan + 1.0f) * 0.25f * M_PI; // 0 to pi/2
                    float gainL = std::cos(panAngle) * vol;
                    float gainR = std::sin(panAngle) * vol;

                    mixL += sampleL * gainL;
                    mixR += sampleR * gainR;
                }
            }

            // Master Volume and Hard Clip
            mixL = std::clamp(mixL * masterVol, -1.0f, 1.0f);
            mixR = std::clamp(mixR * masterVol, -1.0f, 1.0f);

            outBuffer[i * 2] = static_cast<int16_t>(mixL * 32767.0f);
            outBuffer[i * 2 + 1] = static_cast<int16_t>(mixR * 32767.0f);
        }

        double newPosSec = static_cast<double>(currentFrame + framesToRead) / 44100.0;
        if (newPosSec >= duration && duration > 0.0) {
            m_state->store(PlaybackState::Stopped, std::memory_order_release);
            newPosSec = 0.0;
        }
        
        m_position->store(newPosSec, std::memory_order_relaxed);
        return framesToRead * frameSize;
    }

    qint64 writeData(const char *data, qint64 len) override {
        Q_UNUSED(data);
        Q_UNUSED(len);
        return 0;
    }
    
    qint64 bytesAvailable() const override {
        return m_duration.load(std::memory_order_relaxed) > 0.0 ? 44100 * 2 * sizeof(float) : 0; // Feed 1 sec ahead
    }
};

} // namespace HarmonySync::Media
#endif

namespace HarmonySync::Media {

namespace {

bool isReferenceStemName(std::string name) {
    std::transform(name.begin(), name.end(), name.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return name.find("reference") != std::string::npos;
}

bool isDurationGuideStemName(std::string name) {
    std::transform(name.begin(), name.end(), name.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return name.find("click") != std::string::npos
        || name.find("guide") != std::string::npos
        || name.find("split") != std::string::npos
        || name.find("stereo") != std::string::npos;
}

#ifdef HARMONYSYNC_HAS_QT
/// Decode/map stems into a set on the calling (control) thread. Never called on the switch path.
/// Also runs on the async preload worker (#216); touches nothing shared with the engine.
AudioMixerDevice::StemBufferSet mapStemBufferSet(const std::vector<Core::MediaStem>& stems,
                                                 std::vector<Core::MediaStem>& outStems,
                                                 const char* failureLabel,
                                                 const std::shared_ptr<std::atomic<std::size_t>>& liveSets,
                                                 const std::atomic<bool>* cancelled = nullptr) {
    AudioMixerDevice::StemBufferSet set;
    set.lease = SongSetLease(liveSets);
    double maxDuration = 0.0;
    double fallbackDuration = 0.0;
    FFmpegAudioDecoder decoder;

    for (const auto& stem : stems) {
        if (cancelled != nullptr && cancelled->load(std::memory_order_relaxed)) {
            break; // a newer preload or load replaced this one; stop decoding early
        }
        if (isReferenceStemName(stem.name())) {
            continue;
        }

        outStems.push_back(stem);

        AudioMixerDevice::StemBuffer buf;
        buf.stem = stem;
        MappedAudioFile mappedFile = decoder.mapAudioFile(stem.filePath());
        if (mappedFile.info.isValid) {
            if (isDurationGuideStemName(stem.name())) {
                if (mappedFile.info.durationSeconds > maxDuration) {
                    maxDuration = mappedFile.info.durationSeconds;
                }
            }
            if (mappedFile.info.durationSeconds > fallbackDuration) {
                fallbackDuration = mappedFile.info.durationSeconds;
            }
            buf.mappedFile = std::move(mappedFile);
            set.buffers.push_back(std::move(buf));
        } else {
            std::cerr << "[AudioEngine] " << failureLabel << ": " << stem.filePath() << std::endl;
        }
    }

    if (maxDuration == 0.0) maxDuration = fallbackDuration;
    set.duration = maxDuration;
    return set;
}
#endif

/// One decoded song, ready to become the preloaded song.
struct DecodedSong {
    std::vector<Core::MediaStem> stems;
#ifdef HARMONYSYNC_HAS_QT
    AudioMixerDevice::StemBufferSet set;
#endif
};

DecodedSong decodeSong(const std::vector<Core::MediaStem>& stems,
                       [[maybe_unused]] const std::shared_ptr<std::atomic<std::size_t>>& liveSets,
                       const std::atomic<bool>* cancelled = nullptr) {
    DecodedSong song;
#ifdef HARMONYSYNC_HAS_QT
    song.set = mapStemBufferSet(stems, song.stems, "Failed to map preloaded stem", liveSets, cancelled);
#else
    for (const auto& stem : stems) {
        if (cancelled != nullptr && cancelled->load(std::memory_order_relaxed)) {
            break;
        }
        if (isReferenceStemName(stem.name())) {
            continue;
        }
        song.stems.push_back(stem);
    }
#endif
    return song;
}

/// State shared between the control thread and one async preload worker (#216).
/// The worker writes `result`, then sets `done` (release); the control thread reads
/// `result` only after seeing `done` (acquire).
struct PreloadJob {
    AudioEngine::PreloadTicket ticket = 0;
    DecodedSong result;
    std::atomic<bool> done{false};
    std::atomic<bool> cancelled{false};
};

struct PreloadWorker {
    std::shared_ptr<PreloadJob> job;
    std::thread thread;
};

} // namespace

struct AudioEngine::Impl {
    std::vector<Core::MediaStem> stems;
    std::vector<Core::MediaStem> preloadedStems;
    std::atomic<PlaybackState> state{PlaybackState::Stopped};
    std::atomic<double> position{0.0};
    std::atomic<double> duration{0.0};
    std::atomic<float> masterVolume{1.0f};
    std::atomic<int> pitchSemitones{0};
    /// Live song buffer sets of this engine (#185). Shared with workers and every set's lease.
    std::shared_ptr<std::atomic<std::size_t>> liveSets = std::make_shared<std::atomic<std::size_t>>(0);

#ifdef HARMONYSYNC_HAS_QT
    std::unique_ptr<QAudioSink> audioSink;
    AudioMixerDevice mixerDevice;
    // Next song, fully mapped by preloadStems() so switchToPreloaded() only hands it off.
    AudioMixerDevice::StemBufferSet preloadedSet;

    /// True while the sink may call readData() on the audio thread.
    bool audioCallbackMayRun() const {
        return audioSink && audioSink->state() != QAudio::StoppedState;
    }

    /// Mixer-side buffers the control thread may tweak (latest published set).
    std::vector<AudioMixerDevice::StemBuffer>* controlBuffers() {
        AudioMixerDevice::StemBufferSet* set = mixerDevice.m_sets.latest();
        return set != nullptr ? &set->buffers : nullptr;
    }
#endif

    /// Free song sets the audio thread has already let go of. Control thread only.
    void reclaimRetiredSongs() {
#ifdef HARMONYSYNC_HAS_QT
        mixerDevice.m_sets.reclaimRetired();
#endif
    }

    // ---- Async preload (#216). Control thread only, except inside the worker lambda. ----
    std::shared_ptr<PreloadJob> pendingJob; // latest preloadStemsAsync(), not yet adopted
    std::vector<PreloadWorker> workers;     // every worker not yet joined
    AudioEngine::PreloadTicket nextTicket = 1;
    std::function<void()> decodeHookForTesting;
    std::function<void()> finishHookForTesting;

    /// Drop the pending async preload; its worker finishes on its own and is joined later.
    void cancelPendingPreload() {
        if (pendingJob) {
            pendingJob->cancelled.store(true, std::memory_order_relaxed);
            pendingJob.reset();
        }
    }

    /// Join workers that have finished. Never waits on a running decode.
    void joinFinishedWorkers() {
        std::erase_if(workers, [](PreloadWorker& worker) {
            if (!worker.job->done.load(std::memory_order_acquire)) {
                return false;
            }
            if (worker.thread.joinable()) {
                worker.thread.join(); // done is the worker's last write before the callback
            }
            return true;
        });
    }

    /// If the latest async preload has finished, make it the preloaded song.
    /// Returns false while it is still decoding.
    bool adoptFinishedPreload() {
        if (!pendingJob) {
            return true;
        }
        if (!pendingJob->done.load(std::memory_order_acquire)) {
            return false;
        }
        preloadedStems = std::move(pendingJob->result.stems);
#ifdef HARMONYSYNC_HAS_QT
        preloadedSet = std::move(pendingJob->result.set);
#endif
        pendingJob.reset();
        joinFinishedWorkers();
        return true;
    }

    Impl() = default;

    ~Impl() {
        // Runs for destruction and for move-assignment over this engine. A running worker
        // only touches its own job, so cancelling then joining is enough.
        for (auto& worker : workers) {
            worker.job->cancelled.store(true, std::memory_order_relaxed);
        }
        for (auto& worker : workers) {
            if (worker.thread.joinable()) {
                worker.thread.join();
            }
        }
    }
};

AudioEngine::AudioEngine()
    : m_impl(std::make_unique<Impl>())
{
#ifdef HARMONYSYNC_HAS_QT
    m_impl->mixerDevice.m_position = &m_impl->position;
    m_impl->mixerDevice.m_state = &m_impl->state;
    m_impl->mixerDevice.m_masterVolume = &m_impl->masterVolume;
    m_impl->mixerDevice.open(QIODevice::ReadOnly);

    QAudioFormat format;
    format.setSampleRate(44100);
    format.setChannelCount(2);
    format.setSampleFormat(QAudioFormat::Int16);

    auto defaultDevice = QMediaDevices::defaultAudioOutput();
    if (defaultDevice.isFormatSupported(format)) {
        m_impl->audioSink = std::make_unique<QAudioSink>(defaultDevice, format);
        m_impl->audioSink->setBufferSize(44100 * 2 * sizeof(float) / 10); // ~100ms buffer
    } else {
        std::cerr << "Warning: Audio format not supported!" << std::endl;
    }
#endif
}

AudioEngine::~AudioEngine() {
#ifdef HARMONYSYNC_HAS_QT
    if (m_impl && m_impl->audioSink) {
        m_impl->audioSink->stop();
    }
#endif
}

AudioEngine::AudioEngine(AudioEngine&&) noexcept = default;
AudioEngine& AudioEngine::operator=(AudioEngine&&) noexcept = default;

bool AudioEngine::loadStems(const std::vector<Core::MediaStem>& stems) {
    stop();
    m_impl->cancelPendingPreload();
    m_impl->joinFinishedWorkers();
    m_impl->stems.clear();
    m_impl->preloadedStems.clear();
    m_impl->position.store(0.0, std::memory_order_relaxed);
    
#ifdef HARMONYSYNC_HAS_QT
    if (m_impl->audioSink) {
        m_impl->audioSink->stop();
    }

    // Sink is stopped, so no readData() is in flight: safe to replace every set here.
    m_impl->mixerDevice.m_sets.clear();
    m_impl->preloadedSet = {};

    AudioMixerDevice::StemBufferSet set = mapStemBufferSet(stems, m_impl->stems, "Failed to map stem", m_impl->liveSets);
    const double maxDuration = set.duration;
    const std::size_t bufferCount = set.buffers.size();
    m_impl->mixerDevice.m_sets.resetCurrent(std::move(set));

    std::cout << "[AudioEngine] Loaded " << bufferCount << " stems. Max duration: " << maxDuration << "s" << std::endl;
    m_impl->mixerDevice.m_duration.store(maxDuration, std::memory_order_relaxed);
    m_impl->duration.store(maxDuration, std::memory_order_relaxed);

    if (m_impl->audioSink && bufferCount > 0) {
        m_impl->audioSink->start(&m_impl->mixerDevice);
    }
#else
    for (const auto& stem : stems) {
        if (isReferenceStemName(stem.name())) {
            continue;
        }
        m_impl->stems.push_back(stem);
    }
    m_impl->duration.store(m_impl->stems.empty() ? 0.0 : 180.0, std::memory_order_relaxed);
#endif

    return !m_impl->stems.empty();
}

bool AudioEngine::preloadStems(const std::vector<Core::MediaStem>& stems) {
    // Do not stop or clear the currently playing set (#177).
    // All decoding/file mapping for the next song happens here, never on the switch path.
    m_impl->reclaimRetiredSongs();
    m_impl->cancelPendingPreload();
    m_impl->joinFinishedWorkers();

    DecodedSong song = decodeSong(stems, m_impl->liveSets);
    m_impl->preloadedStems = std::move(song.stems);
#ifdef HARMONYSYNC_HAS_QT
    m_impl->preloadedSet = std::move(song.set);
#endif

    return !m_impl->preloadedStems.empty();
}

bool AudioEngine::switchToPreloaded() {
    // #216: an async preload still decoding means "not ready": return at once, keep A playing.
    if (!m_impl->adoptFinishedPreload()) {
        return false;
    }
    if (m_impl->preloadedStems.empty()) {
        return false;
    }

    // Swap in already-decoded stems; drop A. Keep playback state.
    m_impl->stems = std::move(m_impl->preloadedStems);
    m_impl->preloadedStems.clear();
    // Report 0 right away; the audio thread re-applies it with the handoff so a late
    // position write from song A cannot leave B starting partway in.
    m_impl->position.store(0.0, std::memory_order_relaxed);

#ifdef HARMONYSYNC_HAS_QT
    AudioMixerDevice& device = m_impl->mixerDevice;
    device.m_sets.reclaimRetired();

    const double nextDuration = m_impl->preloadedSet.duration;
    const bool nextHasAudio = !m_impl->preloadedSet.buffers.empty();
    // No decoding or mapping here: hand the already-mapped set to the audio thread.
    // A stays alive until readData() has let go of it.
    device.m_sets.publish(std::move(m_impl->preloadedSet));
    m_impl->preloadedSet = {};
    m_impl->duration.store(nextDuration, std::memory_order_relaxed);

    if (!m_impl->audioCallbackMayRun()) {
        // No audio callback can be running, so do the handoff here and free A now.
        device.m_sets.acquirePending();
        device.m_duration.store(nextDuration, std::memory_order_relaxed);
        device.m_sets.reclaimRetired();
    }

    if (m_impl->audioSink && nextHasAudio
        && m_impl->audioSink->state() != QAudio::ActiveState) {
        m_impl->audioSink->start(&device);
    }
#else
    m_impl->duration.store(m_impl->stems.empty() ? 0.0 : 180.0, std::memory_order_relaxed);
#endif

    return !m_impl->stems.empty();
}

bool AudioEngine::hasPreloadedStems() const noexcept {
    const auto& job = m_impl->pendingJob;
    if (job) {
        // A finished but not yet adopted async preload counts; one still decoding does not.
        return job->done.load(std::memory_order_acquire) && !job->result.stems.empty();
    }
    return !m_impl->preloadedStems.empty();
}

AudioEngine::PreloadTicket AudioEngine::preloadStemsAsync(std::vector<Core::MediaStem> stems,
                                                          PreloadReadyCallback onReady) {
    m_impl->reclaimRetiredSongs();
    m_impl->joinFinishedWorkers();
    m_impl->cancelPendingPreload();
    // The new request replaces any earlier preloaded song, finished or not.
    m_impl->preloadedStems.clear();
#ifdef HARMONYSYNC_HAS_QT
    m_impl->preloadedSet = {};
#endif

    auto job = std::make_shared<PreloadJob>();
    job->ticket = m_impl->nextTicket++;

    // The worker owns copies of everything it uses; it never touches Impl.
    std::thread thread([job, stems = std::move(stems), onReady = std::move(onReady),
                        hook = m_impl->decodeHookForTesting,
                        finishHook = m_impl->finishHookForTesting, liveSets = m_impl->liveSets]() {
        if (hook) {
            hook();
        }
        if (!job->cancelled.load(std::memory_order_relaxed)) {
            job->result = decodeSong(stems, liveSets, &job->cancelled);
        }
        const bool hasStems = !job->result.stems.empty()
                              && !job->cancelled.load(std::memory_order_relaxed);
        if (!hasStems) {
            // Replaced or cleared (#185): free its buffers now rather than at the next join.
            // The control thread never reads a cancelled job's result.
            job->result = {};
        }
        if (finishHook) {
            finishHook();
        }
        job->done.store(true, std::memory_order_release);
        if (onReady) {
            onReady(job->ticket, hasStems);
        }
    });

    m_impl->pendingJob = job;
    m_impl->workers.push_back(PreloadWorker{job, std::move(thread)});
    return job->ticket;
}

bool AudioEngine::isPreloadPending() const noexcept {
    const auto& job = m_impl->pendingJob;
    return job && !job->done.load(std::memory_order_acquire);
}

void AudioEngine::setPreloadDecodeHookForTesting(std::function<void()> hook) {
    m_impl->decodeHookForTesting = std::move(hook);
}

void AudioEngine::setPreloadFinishHookForTesting(std::function<void()> hook) {
    m_impl->finishHookForTesting = std::move(hook);
}

void AudioEngine::clearPreloaded() {
    // Only the preloaded song and the decode job are touched; the audio thread never sees
    // either, so this is safe while the current song plays. Never waits on a running decode.
    m_impl->reclaimRetiredSongs();
    m_impl->cancelPendingPreload();
    m_impl->joinFinishedWorkers();
    m_impl->preloadedStems.clear();
#ifdef HARMONYSYNC_HAS_QT
    m_impl->preloadedSet = {};
#endif
}

void AudioEngine::unloadCurrent() {
    stop();
    m_impl->stems.clear();
    m_impl->duration.store(0.0, std::memory_order_relaxed);
#ifdef HARMONYSYNC_HAS_QT
    if (m_impl->audioSink) {
        m_impl->audioSink->stop();
    }
    // Sink is stopped, so no readData() is in flight (same rule as loadStems()): the current,
    // handed-off and retired sets can be freed here. The preloaded set is not in m_sets.
    m_impl->mixerDevice.m_sets.clear();
    m_impl->mixerDevice.m_duration.store(0.0, std::memory_order_relaxed);
#endif
}

std::size_t AudioEngine::liveSongSetCountForTesting() const noexcept {
#ifdef HARMONYSYNC_HAS_QT
    return m_impl->liveSets->load(std::memory_order_relaxed);
#else
    // No mapped buffers without Qt: count the stem lists the engine still holds.
    std::size_t count = (m_impl->stems.empty() ? 0 : 1) + (m_impl->preloadedStems.empty() ? 0 : 1);
    const auto& job = m_impl->pendingJob;
    if (job && job->done.load(std::memory_order_acquire) && !job->result.stems.empty()) {
        ++count;
    }
    return count;
#endif
}

void AudioEngine::play() {
    m_impl->reclaimRetiredSongs();
    if (m_impl->stems.empty()) {
        std::cout << "[AudioEngine] play() ignored - no stems loaded." << std::endl;
        return;
    }
    m_impl->state.store(PlaybackState::Playing, std::memory_order_release);
#ifdef HARMONYSYNC_HAS_QT
    if (m_impl->audioSink) {
        if (m_impl->audioSink->state() != QAudio::ActiveState) {
            std::cout << "[AudioEngine] Starting audio sink." << std::endl;
            m_impl->audioSink->start(&m_impl->mixerDevice);
        } else {
            std::cout << "[AudioEngine] Audio sink already active." << std::endl;
        }
    } else {
        std::cout << "[AudioEngine] No audio sink available!" << std::endl;
    }
#endif
    std::cout << "[AudioEngine] play() executed." << std::endl;
}

void AudioEngine::pause() {
    if (m_impl->state.load(std::memory_order_acquire) == PlaybackState::Playing) {
        m_impl->state.store(PlaybackState::Paused, std::memory_order_release);
    }
}

void AudioEngine::stop() {
    m_impl->state.store(PlaybackState::Stopped, std::memory_order_release);
    m_impl->position.store(0.0, std::memory_order_relaxed);
    m_impl->reclaimRetiredSongs();
}

void AudioEngine::seek(double positionSeconds) noexcept {
    double clamped = std::clamp(positionSeconds, 0.0, m_impl->duration.load(std::memory_order_relaxed));
    m_impl->position.store(clamped, std::memory_order_relaxed);
}

void AudioEngine::setMasterVolume(float volume) noexcept {
    float clamped = std::clamp(volume, 0.0f, 1.0f);
    m_impl->masterVolume.store(clamped, std::memory_order_relaxed);
}

void AudioEngine::setPitchShiftSemitones(int semitones) noexcept {
    int clamped = std::clamp(semitones, -12, 12);
    m_impl->pitchSemitones.store(clamped, std::memory_order_relaxed);
}

void AudioEngine::setStemVolume(int stemIndex, float volume) noexcept {
    if (stemIndex >= 0 && stemIndex < static_cast<int>(m_impl->stems.size())) {
        m_impl->stems[stemIndex].setVolume(volume);
#ifdef HARMONYSYNC_HAS_QT
        auto* buffers = m_impl->controlBuffers();
        if (buffers != nullptr && stemIndex < static_cast<int>(buffers->size())) {
            (*buffers)[stemIndex].stem.setVolume(volume);
        }
#endif
    }
}

void AudioEngine::setStemMuted(int stemIndex, bool muted) noexcept {
    if (stemIndex >= 0 && stemIndex < static_cast<int>(m_impl->stems.size())) {
        m_impl->stems[stemIndex].setMuted(muted);
#ifdef HARMONYSYNC_HAS_QT
        auto* buffers = m_impl->controlBuffers();
        if (buffers != nullptr && stemIndex < static_cast<int>(buffers->size())) {
            (*buffers)[stemIndex].stem.setMuted(muted);
        }
#endif
    }
}

void AudioEngine::setStemSolo(int stemIndex, bool solo) noexcept {
    if (stemIndex >= 0 && stemIndex < static_cast<int>(m_impl->stems.size())) {
        m_impl->stems[stemIndex].setSolo(solo);
#ifdef HARMONYSYNC_HAS_QT
        auto* buffers = m_impl->controlBuffers();
        if (buffers != nullptr && stemIndex < static_cast<int>(buffers->size())) {
            (*buffers)[stemIndex].stem.setSolo(solo);
        }
#endif
    }
}

PlaybackState AudioEngine::playbackState() const noexcept {
    return m_impl->state.load(std::memory_order_acquire);
}

bool AudioEngine::isPlaying() const noexcept {
    return playbackState() == PlaybackState::Playing;
}

double AudioEngine::positionSeconds() const noexcept {
    return m_impl->position.load(std::memory_order_relaxed);
}

double AudioEngine::durationSeconds() const noexcept {
    return m_impl->duration.load(std::memory_order_relaxed);
}

float AudioEngine::masterVolume() const noexcept {
    return m_impl->masterVolume.load(std::memory_order_relaxed);
}

int AudioEngine::pitchShiftSemitones() const noexcept {
    return m_impl->pitchSemitones.load(std::memory_order_relaxed);
}

const std::vector<Core::MediaStem>& AudioEngine::loadedStems() const noexcept {
    return m_impl->stems;
}

} // namespace HarmonySync::Media
