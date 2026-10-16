#ifndef HARMONYSYNC_FFMPEG_AUDIO_DECODER_HPP
#define HARMONYSYNC_FFMPEG_AUDIO_DECODER_HPP

#include <string>
#include <vector>
#include <memory>
#include <cstdint>

namespace HarmonySync::Media {

struct AudioStreamInfo {
    int sampleRate{44100};
    int channels{2};
    double durationSeconds{0.0};
    std::string codecName{"pcm_s16le"};
    bool isValid{false};
};

struct MappedAudioFile {
    AudioStreamInfo info;
    const int16_t* pcmData{nullptr};
    size_t sampleCount{0};

    struct Impl;
    std::shared_ptr<Impl> impl;
};

/**
 * @brief Multi-format audio decoder abstraction for WAV, MP3, FLAC, M4A, and OGG media stems.
 */
class FFmpegAudioDecoder {
public:
    FFmpegAudioDecoder();
    ~FFmpegAudioDecoder();

    FFmpegAudioDecoder(const FFmpegAudioDecoder&) = delete;
    FFmpegAudioDecoder& operator=(const FFmpegAudioDecoder&) = delete;
    FFmpegAudioDecoder(FFmpegAudioDecoder&&) noexcept;
    FFmpegAudioDecoder& operator=(FFmpegAudioDecoder&&) noexcept;

    // Decoding Operations
    [[nodiscard]] AudioStreamInfo inspectFile(const std::string& filePath) const;
    [[nodiscard]] bool decodeToPcmFloat(const std::string& filePath, std::vector<float>& outPcmBuffer,
                                        AudioStreamInfo& outInfo) const;
    [[nodiscard]] MappedAudioFile mapAudioFile(const std::string& filePath) const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_FFMPEG_AUDIO_DECODER_HPP
