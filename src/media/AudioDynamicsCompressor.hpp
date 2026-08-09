#ifndef HARMONYSYNC_AUDIO_DYNAMICS_COMPRESSOR_HPP
#define HARMONYSYNC_AUDIO_DYNAMICS_COMPRESSOR_HPP

#include <memory>
#include <cstddef>

namespace HarmonySync::Media {

/**
 * @brief Thread-safe dynamics compressor and brickwall peak limiter.
 */
class AudioDynamicsCompressor {
public:
    AudioDynamicsCompressor();
    ~AudioDynamicsCompressor();

    AudioDynamicsCompressor(const AudioDynamicsCompressor&) = delete;
    AudioDynamicsCompressor& operator=(const AudioDynamicsCompressor&) = delete;
    AudioDynamicsCompressor(AudioDynamicsCompressor&&) noexcept;
    AudioDynamicsCompressor& operator=(AudioDynamicsCompressor&&) noexcept;

    void setThresholdDb(float db) noexcept;
    [[nodiscard]] float thresholdDb() const noexcept;

    void setRatio(float ratio) noexcept;
    [[nodiscard]] float ratio() const noexcept;

    void setMakeupGainDb(float db) noexcept;
    [[nodiscard]] float makeupGainDb() const noexcept;

    void setEnabled(bool enabled) noexcept;
    [[nodiscard]] bool isEnabled() const noexcept;

    void processBuffer(float* samples, size_t sampleCount) noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_AUDIO_DYNAMICS_COMPRESSOR_HPP
