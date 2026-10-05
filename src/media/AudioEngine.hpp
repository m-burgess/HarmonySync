#ifndef HARMONYSYNC_AUDIO_ENGINE_HPP
#define HARMONYSYNC_AUDIO_ENGINE_HPP

#include "MediaStem.hpp"
#include <vector>
#include <string>
#include <atomic>
#include <memory>

namespace HarmonySync::Media {

enum class PlaybackState {
    Stopped,
    Playing,
    Paused
};

/**
 * @brief Low-latency audio playback engine managing multi-track stems and lock-free state.
 * Sutter & Alexandrescu Standard #5 Compliant.
 */
class AudioEngine {
public:
    AudioEngine();
    ~AudioEngine();

    AudioEngine(const AudioEngine&) = delete;
    AudioEngine& operator=(const AudioEngine&) = delete;
    AudioEngine(AudioEngine&&) noexcept;
    AudioEngine& operator=(AudioEngine&&) noexcept;

    // Control Methods
    bool loadStems(const std::vector<Core::MediaStem>& stems);
    /**
     * @brief Decode/store the next song's stems without stopping current playback (#177).
     * Does not replace loadedStems() until switchToPreloaded().
     */
    bool preloadStems(const std::vector<Core::MediaStem>& stems);
    /**
     * @brief Make the preloaded stems current and drop the previous set.
     * Keeps playback state; intended to complete in under 100ms.
     */
    bool switchToPreloaded();
    [[nodiscard]] bool hasPreloadedStems() const noexcept;
    void play();
    void pause();
    void stop();
    void seek(double positionSeconds) noexcept;
    void setMasterVolume(float volume) noexcept;
    void setPitchShiftSemitones(int semitones) noexcept;
    void setStemVolume(int stemIndex, float volume) noexcept;
    void setStemMuted(int stemIndex, bool muted) noexcept;
    void setStemSolo(int stemIndex, bool solo) noexcept;

    // State Queries (Thread-Safe & Lock-Free)
    [[nodiscard]] PlaybackState playbackState() const noexcept;
    [[nodiscard]] bool isPlaying() const noexcept;
    [[nodiscard]] double positionSeconds() const noexcept;
    [[nodiscard]] double durationSeconds() const noexcept;
    [[nodiscard]] float masterVolume() const noexcept;
    [[nodiscard]] int pitchShiftSemitones() const noexcept;
    [[nodiscard]] const std::vector<Core::MediaStem>& loadedStems() const noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_AUDIO_ENGINE_HPP
