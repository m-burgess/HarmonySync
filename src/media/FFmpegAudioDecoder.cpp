#include "FFmpegAudioDecoder.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <cstring>

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

    std::ifstream file(filePath, std::ios::binary);
    if (!file) return info;

    char chunkId[4];
    file.read(chunkId, 4);
    if (std::strncmp(chunkId, "RIFF", 4) != 0) return info;

    file.seekg(4, std::ios::cur); // skip size
    file.read(chunkId, 4);
    if (std::strncmp(chunkId, "WAVE", 4) != 0) return info;

    bool fmtFound = false;
    bool dataFound = false;
    uint32_t dataSize = 0;

    while (file.read(chunkId, 4)) {
        uint32_t chunkSize;
        file.read(reinterpret_cast<char*>(&chunkSize), 4);

        if (std::strncmp(chunkId, "fmt ", 4) == 0) {
            uint16_t audioFormat;
            file.read(reinterpret_cast<char*>(&audioFormat), 2);
            file.read(reinterpret_cast<char*>(&info.channels), 2);
            file.read(reinterpret_cast<char*>(&info.sampleRate), 4);
            file.seekg(6, std::ios::cur); // skip byte rate and block align
            uint16_t bitsPerSample;
            file.read(reinterpret_cast<char*>(&bitsPerSample), 2);

            if (audioFormat == 1 && bitsPerSample == 16) {
                fmtFound = true;
                info.codecName = "pcm_s16le";
            }
            if (chunkSize > 16) file.seekg(chunkSize - 16, std::ios::cur);
        } else if (std::strncmp(chunkId, "data", 4) == 0) {
            dataFound = true;
            dataSize = chunkSize;
            break; // Data chunk found, stop parsing headers
        } else {
            file.seekg(chunkSize, std::ios::cur); // Skip unknown chunks
        }
    }

    if (fmtFound && dataFound) {
        info.isValid = true;
        // 16-bit = 2 bytes per sample
        uint32_t totalSamples = dataSize / 2; 
        uint32_t channels = info.channels > 0 ? static_cast<uint32_t>(info.channels) : 1u;
        uint32_t totalFrames = totalSamples / channels;
        info.durationSeconds = static_cast<double>(totalFrames) / (info.sampleRate > 0 ? info.sampleRate : 44100);
    }
    return info;
}

bool FFmpegAudioDecoder::decodeToPcmFloat(const std::string& filePath, std::vector<float>& outPcmBuffer, AudioStreamInfo& outInfo) const {
    outInfo = inspectFile(filePath);
    if (!outInfo.isValid) {
        return false;
    }

    std::ifstream file(filePath, std::ios::binary);
    if (!file) return false;

    // Fast-forward to data chunk
    char chunkId[4];
    file.seekg(12, std::ios::beg); // skip RIFF + size + WAVE

    uint32_t dataSize = 0;
    while (file.read(chunkId, 4)) {
        uint32_t chunkSize;
        file.read(reinterpret_cast<char*>(&chunkSize), 4);
        if (std::strncmp(chunkId, "data", 4) == 0) {
            dataSize = chunkSize;
            break;
        } else {
            file.seekg(chunkSize, std::ios::cur);
        }
    }

    if (dataSize == 0) return false;

    std::vector<int16_t> intBuffer(dataSize / 2);
    file.read(reinterpret_cast<char*>(intBuffer.data()), dataSize);

    // Convert to float [-1.0f, 1.0f]
    outPcmBuffer.resize(intBuffer.size());
    for (size_t i = 0; i < intBuffer.size(); ++i) {
        outPcmBuffer[i] = static_cast<float>(intBuffer[i]) / 32768.0f;
    }

    // Force stereo 44100Hz if it's mono for simplicity in the mixer
    if (outInfo.channels == 1) {
        std::vector<float> stereoBuffer;
        stereoBuffer.reserve(outPcmBuffer.size() * 2);
        for (float sample : outPcmBuffer) {
            stereoBuffer.push_back(sample); // Left
            stereoBuffer.push_back(sample); // Right
        }
        outPcmBuffer = std::move(stereoBuffer);
        outInfo.channels = 2;
    }

    return true;
}

} // namespace HarmonySync::Media
