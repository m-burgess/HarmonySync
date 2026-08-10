#include "AudioEngine.hpp"
#include "FFmpegAudioDecoder.hpp"
#include <algorithm>
#include <iostream>
#include <vector>
#include <atomic>
#include <cmath>

#ifdef HARMONYSYNC_HAS_QT
#include <QIODevice>
#include <QAudioSink>
#include <QMediaDevices>
#include <QAudioDevice>

namespace HarmonySync::Media {

class AudioMixerDevice : public QIODevice {
public:
    struct StemBuffer {
        Core::MediaStem stem;
        std::vector<float> pcmData; // Interleaved stereo floats
        AudioStreamInfo info;
    };

    std::vector<StemBuffer> m_buffers;
    std::atomic<double>* m_position;
    std::atomic<PlaybackState>* m_state;
    std::atomic<float>* m_masterVolume;
    double m_duration = 0.0;

    AudioMixerDevice(QObject* parent = nullptr) : QIODevice(parent) {}

    bool isSequential() const override { return true; }

    qint64 readData(char *data, qint64 maxlen) override {
        if (m_state->load(std::memory_order_acquire) != PlaybackState::Playing) {
            std::fill(data, data + maxlen, 0);
            return maxlen; // Output silence when paused/stopped to keep sink alive
        }

        int frameSize = 2 * sizeof(int16_t); // Stereo 16-bit
        int framesToRead = maxlen / frameSize;
        int16_t* outBuffer = reinterpret_cast<int16_t*>(data);

        double currentPosSec = m_position->load(std::memory_order_relaxed);
        int currentFrame = static_cast<int>(currentPosSec * 44100.0);

        bool anySolo = false;
        for (const auto& buf : m_buffers) {
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

            for (const auto& buf : m_buffers) {
                if (buf.stem.isMuted()) continue;
                if (anySolo && !buf.stem.isSolo()) continue;

                int sampleIdx = frameIdx * 2;
                if (sampleIdx + 1 < static_cast<int>(buf.pcmData.size())) {
                    float sampleL = buf.pcmData[sampleIdx];
                    float sampleR = buf.pcmData[sampleIdx + 1];

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
        if (newPosSec >= m_duration && m_duration > 0.0) {
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
        return m_duration > 0.0 ? 44100 * 2 * sizeof(float) : 0; // Feed 1 sec ahead
    }
};

} // namespace HarmonySync::Media
#endif

namespace HarmonySync::Media {

struct AudioEngine::Impl {
    std::vector<Core::MediaStem> stems;
    std::atomic<PlaybackState> state{PlaybackState::Stopped};
    std::atomic<double> position{0.0};
    std::atomic<double> duration{0.0};
    std::atomic<float> masterVolume{1.0f};
    std::atomic<int> pitchSemitones{0};

#ifdef HARMONYSYNC_HAS_QT
    std::unique_ptr<QAudioSink> audioSink;
    AudioMixerDevice mixerDevice;
#endif

    Impl() = default;
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
    if (m_impl->audioSink) {
        m_impl->audioSink->stop();
    }
#endif
}

AudioEngine::AudioEngine(AudioEngine&&) noexcept = default;
AudioEngine& AudioEngine::operator=(AudioEngine&&) noexcept = default;

bool AudioEngine::loadStems(const std::vector<Core::MediaStem>& stems) {
    stop();
    m_impl->stems = stems;
    m_impl->position.store(0.0, std::memory_order_relaxed);
    
#ifdef HARMONYSYNC_HAS_QT
    if (m_impl->audioSink) {
        m_impl->audioSink->stop();
    }

    m_impl->mixerDevice.m_buffers.clear();
    double maxDuration = 0.0;
    FFmpegAudioDecoder decoder;

    for (const auto& stem : stems) {
        AudioMixerDevice::StemBuffer buf;
        buf.stem = stem;
        if (decoder.decodeToPcmFloat(stem.filePath(), buf.pcmData, buf.info)) {
            if (buf.info.durationSeconds > maxDuration) {
                maxDuration = buf.info.durationSeconds;
            }
            m_impl->mixerDevice.m_buffers.push_back(std::move(buf));
        } else {
            std::cerr << "[AudioEngine] Failed to decode stem: " << stem.filePath() << std::endl;
        }
    }

    std::cout << "[AudioEngine] Loaded " << m_impl->mixerDevice.m_buffers.size() << " stems. Max duration: " << maxDuration << "s" << std::endl;
    m_impl->mixerDevice.m_duration = maxDuration;
    m_impl->duration.store(maxDuration, std::memory_order_relaxed);

    if (m_impl->audioSink && !m_impl->mixerDevice.m_buffers.empty()) {
        m_impl->audioSink->start(&m_impl->mixerDevice);
    }
#else
    m_impl->duration.store(m_impl->stems.empty() ? 0.0 : 180.0, std::memory_order_relaxed);
#endif

    return !m_impl->stems.empty();
}

void AudioEngine::play() {
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
