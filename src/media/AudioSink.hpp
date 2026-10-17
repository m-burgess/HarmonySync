#ifndef HARMONYSYNC_AUDIO_SINK_HPP
#define HARMONYSYNC_AUDIO_SINK_HPP

#include <cstddef>
#include <memory>

namespace HarmonySync::Media {

/**
 * @brief PCM producer that an audio sink pulls from, on the audio thread.
 * The format is fixed: interleaved signed 16-bit stereo at 44.1 kHz.
 */
class IPcmSource {
public:
    IPcmSource() = default;
    IPcmSource(const IPcmSource&) = delete;
    IPcmSource& operator=(const IPcmSource&) = delete;
    virtual ~IPcmSource() = default;

    /// Fills up to @p maxBytes and returns how many bytes were written.
    virtual std::size_t read(char* data, std::size_t maxBytes) = 0;
    virtual std::size_t bytesAvailable() const = 0;
};

/**
 * @brief Audio output device the engine plays through. The sink pulls from the source it was
 * started with, so tests can drive playback on demand without a device.
 */
class IAudioSink {
public:
    IAudioSink() = default;
    IAudioSink(const IAudioSink&) = delete;
    IAudioSink& operator=(const IAudioSink&) = delete;
    virtual ~IAudioSink() = default;

    /// Starts pulling from @p source, which must outlive the sink or be stopped first.
    virtual void start(IPcmSource& source) = 0;
    virtual void stop() = 0;
    /// True from start() until stop(): the sink may call the source on the audio thread.
    virtual bool isRunning() const = 0;
    /// True while running and not idle (an idle sink has stopped pulling and needs start() again).
    virtual bool isActive() const = 0;
};

// Production sink on the default output device (see QtAudioSink.cpp). Null if the device
// cannot play 16-bit stereo at 44.1 kHz.
std::unique_ptr<IAudioSink> createQtAudioSink();

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_AUDIO_SINK_HPP
