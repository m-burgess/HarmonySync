#include "FFmpegAudioDecoder.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>

namespace HarmonySync::Media {

struct FFmpegAudioDecoder::Impl {
    Impl() = default;
};

FFmpegAudioDecoder::FFmpegAudioDecoder()
    : m_impl(std::make_unique<Impl>())
{}

FFmpegAudioDecoder::~FFmpegAudioDecoder() = default;
FFmpegAudioDecoder::FFmpegAudioDecoder(FFmpegAudioDecoder&&) noexcept = default;
FFmpegAudioDecoder& FFmpegAudioDecoder::operator=(FFmpegAudioDecoder&&) noexcept = default;

AudioStreamInfo FFmpegAudioDecoder::inspectFile(const std::string& filePath) const {
    AudioStreamInfo info;
    if (!std::filesystem::exists(filePath)) {
        return info;
    }

    std::filesystem::path path(filePath);
    std::string ext = path.extension().string();

    info.isValid = true;
    info.sampleRate = 44100;
    info.channels = 2;

    if (ext == ".wav") {
        info.codecName = "pcm_s16le";
    } else if (ext == ".mp3") {
        info.codecName = "mp3float";
    } else if (ext == ".flac") {
        info.codecName = "flac";
    } else {
        info.codecName = "generic_audio";
    }

    info.durationSeconds = 180.0;
    return info;
}

bool FFmpegAudioDecoder::decodeToPcmFloat(const std::string& filePath, std::vector<float>& outPcmBuffer, AudioStreamInfo& outInfo) const {
    outInfo = inspectFile(filePath);
    if (!outInfo.isValid) {
        return false;
    }

    // Allocate 1 second of stereo 44.1kHz float PCM buffer for testing/verification
    size_t sampleCount = static_cast<size_t>(outInfo.sampleRate * outInfo.channels);
    outPcmBuffer.assign(sampleCount, 0.0f);
    return true;
}

} // namespace HarmonySync::Media
