#ifndef HARMONYSYNC_TESTS_TEST_WAV_HPP
#define HARMONYSYNC_TESTS_TEST_WAV_HPP

#include <cmath>
#include <cstddef>
#include <cstdint>
#include <numbers>
#include <string>
#include <vector>

// Builders for synthetic 16-bit PCM WAV bytes. Chunks can be assembled by hand to make malformed files.
namespace wav {

inline void put16(std::string& out, std::uint16_t value) {
    out.push_back(static_cast<char>(value & 0xFF));
    out.push_back(static_cast<char>((value >> 8) & 0xFF));
}

inline void put32(std::string& out, std::uint32_t value) {
    put16(out, static_cast<std::uint16_t>(value & 0xFFFF));
    put16(out, static_cast<std::uint16_t>((value >> 16) & 0xFFFF));
}

inline std::string chunk(const std::string& id, const std::string& payload) {
    std::string out = id;
    put32(out, static_cast<std::uint32_t>(payload.size()));
    return out + payload;
}

// extraBytes pads the fmt chunk past the 16 bytes PCM needs, like WAVE_FORMAT_EXTENSIBLE writers do.
inline std::string fmtChunk(std::uint16_t format, std::uint16_t channels, std::uint32_t sampleRate,
                            std::uint16_t bitsPerSample, std::size_t extraBytes = 0) {
    std::string payload;
    put16(payload, format);
    put16(payload, channels);
    put32(payload, sampleRate);
    put32(payload, sampleRate * channels * (bitsPerSample / 8U));
    put16(payload, static_cast<std::uint16_t>(channels * (bitsPerSample / 8U)));
    put16(payload, bitsPerSample);
    payload.append(extraBytes, '\0');
    return chunk("fmt ", payload);
}

inline std::string dataChunk(const std::vector<std::int16_t>& samples) {
    std::string payload;
    for (const std::int16_t sample : samples) {
        put16(payload, static_cast<std::uint16_t>(sample));
    }
    return chunk("data", payload);
}

inline std::string riff(const std::string& chunks) {
    std::string out = "RIFF";
    put32(out, static_cast<std::uint32_t>(4 + chunks.size()));
    return out + "WAVE" + chunks;
}

inline std::string pcm16(std::uint16_t channels, std::uint32_t sampleRate, const std::vector<std::int16_t>& samples) {
    return riff(fmtChunk(1, channels, sampleRate, 16) + dataChunk(samples));
}

// Interleaved samples where every channel carries the same sine.
inline std::vector<std::int16_t> sine(std::size_t frames, std::uint16_t channels, double frequencyHz, double amplitude,
                                      std::uint32_t sampleRate = 44100) {
    std::vector<std::int16_t> samples;
    samples.reserve(frames * channels);
    for (std::size_t frame = 0; frame < frames; ++frame) {
        const double phase = 2.0 * std::numbers::pi * frequencyHz * static_cast<double>(frame) / sampleRate;
        const auto value = static_cast<std::int16_t>(std::lround(std::sin(phase) * amplitude * 32767.0));
        for (std::uint16_t channel = 0; channel < channels; ++channel) {
            samples.push_back(value);
        }
    }
    return samples;
}

inline std::vector<std::int16_t> constant(std::size_t frames, std::uint16_t channels, std::int16_t value) {
    return std::vector<std::int16_t>(frames * channels, value);
}

} // namespace wav

#endif // HARMONYSYNC_TESTS_TEST_WAV_HPP
