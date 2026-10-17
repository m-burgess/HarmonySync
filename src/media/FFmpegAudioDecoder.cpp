#include "FFmpegAudioDecoder.hpp"
#include <algorithm>
#include <cctype>
#include <cstdint>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iostream>

#if __has_include(<QProcess>)
#include <QProcess>
#include <QString>
#include <QStringList>
#endif

#ifdef HARMONYSYNC_HAS_QT
#include <QFile>
#endif

namespace HarmonySync::Media {

namespace {

bool isVideoFileExtension(const std::filesystem::path& path) {
    std::string ext = path.extension().string();
    std::transform(ext.begin(), ext.end(), ext.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return ext == ".mp4" || ext == ".mkv" || ext == ".webm" || ext == ".mov";
}

double probeVideoDurationSeconds(const std::filesystem::path& videoPath) {
#if __has_include(<QProcess>)
    QProcess proc;
    QStringList args;
    args << QStringLiteral("-v") << QStringLiteral("error") << QStringLiteral("-show_entries")
         << QStringLiteral("format=duration") << QStringLiteral("-of")
         << QStringLiteral("default=noprint_wrappers=1:nokey=1") << QString::fromStdString(videoPath.string());
    proc.start(QStringLiteral("ffprobe"), args);
    if (proc.waitForFinished(5000) && proc.exitStatus() == QProcess::NormalExit && proc.exitCode() == 0) {
        bool ok = false;
        const double dur = QString::fromUtf8(proc.readAllStandardOutput()).trimmed().toDouble(&ok);
        if (ok && dur > 0.1) {
            return std::min(dur, 600.0);
        }
    }
#else
    (void)videoPath;
#endif

    // Direct container header parse fallback (ISO BMFF / MP4 / MOV) when ffprobe is not installed
    std::ifstream file(videoPath, std::ios::binary);
    if (file) {
        std::vector<char> buf(8192);
        file.read(buf.data(), static_cast<std::streamsize>(buf.size()));
        const auto bytesRead = file.gcount();
        for (std::streamsize i = 0; i + 24 <= bytesRead; ++i) {
            if (std::memcmp(&buf[static_cast<std::size_t>(i)], "mvhd", 4) == 0) {
                const auto version = static_cast<std::uint8_t>(buf[static_cast<std::size_t>(i) + 4]);
                auto readU32 = [&](std::size_t off) -> std::uint32_t {
                    return (static_cast<std::uint32_t>(static_cast<std::uint8_t>(buf[off])) << 24) |
                           (static_cast<std::uint32_t>(static_cast<std::uint8_t>(buf[off + 1])) << 16) |
                           (static_cast<std::uint32_t>(static_cast<std::uint8_t>(buf[off + 2])) << 8) |
                           (static_cast<std::uint32_t>(static_cast<std::uint8_t>(buf[off + 3])));
                };
                if (version == 0 && i + 24 <= bytesRead) {
                    const std::uint32_t timescale = readU32(static_cast<std::size_t>(i) + 16);
                    const std::uint32_t duration = readU32(static_cast<std::size_t>(i) + 20);
                    if (timescale > 0 && duration > 0) {
                        const double dur = static_cast<double>(duration) / static_cast<double>(timescale);
                        if (dur > 0.1) {
                            return std::min(dur, 600.0);
                        }
                    }
                } else if (version == 1 && i + 36 <= bytesRead) {
                    const std::uint32_t timescale = readU32(static_cast<std::size_t>(i) + 24);
                    const std::uint64_t durHi = readU32(static_cast<std::size_t>(i) + 28);
                    const std::uint64_t durLo = readU32(static_cast<std::size_t>(i) + 32);
                    const std::uint64_t duration = (durHi << 32) | durLo;
                    if (timescale > 0 && duration > 0) {
                        const double dur = static_cast<double>(duration) / static_cast<double>(timescale);
                        if (dur > 0.1) {
                            return std::min(dur, 600.0);
                        }
                    }
                }
                break;
            }
        }
    }
    return 0.1;
}

void writeSilentWavFallback(const std::filesystem::path& wavPath, double durationSeconds = 0.1) {
    const std::uint32_t rate = 44100;
    const double clampedSec = std::clamp(durationSeconds, 0.1, 600.0);
    const auto frames = static_cast<std::uint32_t>(clampedSec * static_cast<double>(rate));
    const std::uint16_t channels = 2;
    const std::uint16_t bits = 16;
    const std::uint32_t dataBytes = frames * channels * bits / 8;
    std::ofstream out(wavPath, std::ios::binary);
    if (!out) {
        return;
    }
    auto u32 = [&](std::uint32_t v) { out.write(reinterpret_cast<const char*>(&v), 4); };
    auto u16 = [&](std::uint16_t v) { out.write(reinterpret_cast<const char*>(&v), 2); };
    out << "RIFF";
    u32(36 + dataBytes);
    out << "WAVEfmt ";
    u32(16);
    u16(1);
    u16(channels);
    u32(rate);
    u32(rate * channels * bits / 8);
    u16(channels * bits / 8);
    u16(bits);
    out << "data";
    u32(dataBytes);
    const std::vector<char> zeros(65536, 0);
    std::uint32_t remaining = dataBytes;
    while (remaining > 0) {
        const std::uint32_t chunk = std::min<std::uint32_t>(remaining, static_cast<std::uint32_t>(zeros.size()));
        out.write(zeros.data(), static_cast<std::streamsize>(chunk));
        remaining -= chunk;
    }
}

std::filesystem::path ensureVideoAudioWav(const std::filesystem::path& videoPath) {
    std::error_code ec;
    std::filesystem::path cacheDir = videoPath.parent_path() / ".audio_cache";
    std::filesystem::create_directories(cacheDir, ec);
    if (ec || !std::filesystem::exists(cacheDir)) {
        cacheDir = std::filesystem::temp_directory_path() / "harmonysync_video_audio_cache";
        std::filesystem::create_directories(cacheDir, ec);
    }

    const std::filesystem::path cachedWav = cacheDir / (videoPath.filename().string() + ".wav");
    if (std::filesystem::exists(cachedWav, ec)) {
        const auto wavSize = std::filesystem::file_size(cachedWav, ec);
        const auto videoSize = std::filesystem::file_size(videoPath, ec);
        if (wavSize > 44 && !(wavSize == 17684 && videoSize > 100000)) {
            return cachedWav;
        }
    }

#if __has_include(<QProcess>)
    QProcess proc;
    proc.setProcessChannelMode(QProcess::MergedChannels);
    QStringList args;
    args << QStringLiteral("-y") << QStringLiteral("-v") << QStringLiteral("error") << QStringLiteral("-i")
         << QString::fromStdString(videoPath.string()) << QStringLiteral("-vn") << QStringLiteral("-acodec")
         << QStringLiteral("pcm_s16le") << QStringLiteral("-ar") << QStringLiteral("44100") << QStringLiteral("-ac")
         << QStringLiteral("2") << QString::fromStdString(cachedWav.string());
    proc.start(QStringLiteral("ffmpeg"), args);
    const bool ok = proc.waitForFinished(-1) && proc.exitStatus() == QProcess::NormalExit && proc.exitCode() == 0;
    if (!ok || !std::filesystem::exists(cachedWav, ec) || std::filesystem::file_size(cachedWav, ec) <= 44) {
        std::filesystem::remove(cachedWav, ec);
        writeSilentWavFallback(cachedWav, probeVideoDurationSeconds(videoPath));
    }
#else
    writeSilentWavFallback(cachedWav);
#endif
    return cachedWav;
}

} // namespace

struct MappedAudioFile::Impl {
#ifdef HARMONYSYNC_HAS_QT
    std::unique_ptr<QFile> file;
    uchar* mappedData{nullptr};
    Impl() = default;
    Impl(const Impl&) = delete;
    Impl& operator=(const Impl&) = delete;
    ~Impl() {
        if (file && mappedData) {
            file->unmap(mappedData);
        }
    }
#else
    std::vector<int16_t> buffer;
#endif
};

struct FFmpegAudioDecoder::Impl {
    Impl() = default;
};

FFmpegAudioDecoder::FFmpegAudioDecoder()
    : m_impl(std::make_unique<Impl>()) {}

FFmpegAudioDecoder::~FFmpegAudioDecoder() = default;
FFmpegAudioDecoder::FFmpegAudioDecoder(FFmpegAudioDecoder&&) noexcept = default;
FFmpegAudioDecoder& FFmpegAudioDecoder::operator=(FFmpegAudioDecoder&&) noexcept = default;

AudioStreamInfo FFmpegAudioDecoder::inspectFile(const std::string& filePath) const {
    AudioStreamInfo info;
    if (!std::filesystem::exists(filePath)) {
        return info;
    }

    std::ifstream file(filePath, std::ios::binary);
    if (!file) {
        return info;
    }

    char chunkId[4] = {};
    file.read(chunkId, 4);
    if (std::strncmp(chunkId, "RIFF", 4) != 0) {
        return info;
    }

    file.seekg(4, std::ios::cur); // skip size
    file.read(chunkId, 4);
    if (std::strncmp(chunkId, "WAVE", 4) != 0) {
        return info;
    }

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
            if (chunkSize > 16) {
                file.seekg(chunkSize - 16, std::ios::cur);
            }
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

bool FFmpegAudioDecoder::decodeToPcmFloat(const std::string& filePath, std::vector<float>& outPcmBuffer,
                                          AudioStreamInfo& outInfo) const {
    outInfo = inspectFile(filePath);
    if (!outInfo.isValid) {
        return false;
    }

    std::ifstream file(filePath, std::ios::binary);
    if (!file) {
        return false;
    }

    // Fast-forward to data chunk
    char chunkId[4] = {};
    file.seekg(12, std::ios::beg); // skip RIFF + size + WAVE

    uint32_t dataSize = 0;
    while (file.read(chunkId, 4)) {
        uint32_t chunkSize;
        file.read(reinterpret_cast<char*>(&chunkSize), 4);
        if (std::strncmp(chunkId, "data", 4) == 0) {
            dataSize = chunkSize;
            break;
        }
        file.seekg(chunkSize, std::ios::cur);
    }

    if (dataSize == 0) {
        return false;
    }

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

MappedAudioFile FFmpegAudioDecoder::mapAudioFile(const std::string& filePath) const {
    std::string resolvedPath = filePath;
    MappedAudioFile result;
    result.info = inspectFile(resolvedPath);
    if (!result.info.isValid) {
        const std::filesystem::path fsPath(filePath);
        if (std::filesystem::exists(fsPath) && isVideoFileExtension(fsPath)) {
            resolvedPath = ensureVideoAudioWav(fsPath).string();
            result.info = inspectFile(resolvedPath);
        }
    }
    if (!result.info.isValid) {
        return result;
    }

    result.impl = std::make_shared<MappedAudioFile::Impl>();

#ifdef HARMONYSYNC_HAS_QT
    result.impl->file = std::make_unique<QFile>(QString::fromStdString(resolvedPath));
    if (!result.impl->file->open(QIODevice::ReadOnly)) {
        result.info.isValid = false;
        return result;
    }

    // Fast-forward to data chunk offset
    std::ifstream file(resolvedPath, std::ios::binary);
    char chunkId[4] = {};
    file.seekg(12, std::ios::beg); // skip RIFF + size + WAVE

    uint32_t dataSize = 0;
    uint32_t dataOffset = 0;
    while (file.read(chunkId, 4)) {
        uint32_t chunkSize;
        file.read(reinterpret_cast<char*>(&chunkSize), 4);
        if (std::strncmp(chunkId, "data", 4) == 0) {
            dataSize = chunkSize;
            dataOffset = static_cast<uint32_t>(file.tellg());
            break;
        }
        file.seekg(chunkSize, std::ios::cur);
    }

    // A truncated file claims more audio than it holds. Mapping past the end is not portable and
    // touching those pages would fault the audio thread, so only map what is on disk.
    const auto fileSize = static_cast<uint64_t>(result.impl->file->size());
    dataSize = dataOffset >= fileSize ? 0 : static_cast<uint32_t>(std::min<uint64_t>(dataSize, fileSize - dataOffset));

    if (dataSize > 0 && dataOffset > 0) {
        // Map the payload directly from disk to RAM via OS page cache
        result.impl->mappedData = result.impl->file->map(dataOffset, dataSize);
        if (result.impl->mappedData) {
            result.pcmData = reinterpret_cast<const int16_t*>(result.impl->mappedData);
            result.sampleCount = dataSize / sizeof(int16_t);
        } else {
            result.info.isValid = false; // Map failed
        }
    } else {
        result.info.isValid = false;
    }
#else
    // Fallback if Qt is not available: Load entirely into memory
    std::ifstream file(resolvedPath, std::ios::binary);
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

    if (dataSize > 0) {
        result.impl->buffer.resize(dataSize / sizeof(int16_t));
        file.read(reinterpret_cast<char*>(result.impl->buffer.data()), dataSize);
        result.pcmData = result.impl->buffer.data();
        result.sampleCount = result.impl->buffer.size();
    } else {
        result.info.isValid = false;
    }
#endif

    return result;
}

} // namespace HarmonySync::Media
