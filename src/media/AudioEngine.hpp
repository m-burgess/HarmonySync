#ifndef HARMONYSYNC_AUDIO_ENGINE_HPP
#define HARMONYSYNC_AUDIO_ENGINE_HPP

#include "MediaStem.hpp"
#include <vector>
#include <string>
#include <atomic>
#include <cstddef>
#include <cstdint>
#include <functional>
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

    /// Identifies one call to preloadStemsAsync(). Never 0.
    using PreloadTicket = std::uint64_t;
    /**
     * @brief Called once per preloadStemsAsync() call, on the decode worker thread (#216).
     * hasStems is false if the song had nothing playable or a newer preload/load replaced it.
     * A newer preload can start just after hasStems=true is reported, so callers should
     * act only on the most recent ticket. Marshal to your own thread before touching UI.
     */
    using PreloadReadyCallback = std::function<void(PreloadTicket ticket, bool hasStems)>;
    /**
     * @brief Decode the next song on a worker thread and return at once (#216).
     * Playback of the current song is untouched. A newer preloadStemsAsync(), preloadStems()
     * or loadStems() cancels this one and its result is discarded.
     * While the decode is running, switchToPreloaded() returns false without blocking and
     * the current song keeps playing.
     */
    PreloadTicket preloadStemsAsync(std::vector<Core::MediaStem> stems,
                                    PreloadReadyCallback onReady = {});
    /// True while the most recent preloadStemsAsync() is still decoding.
    [[nodiscard]] bool isPreloadPending() const noexcept;
    /// Test seam: runs on the decode worker before decoding starts. Not for production use.
    void setPreloadDecodeHookForTesting(std::function<void()> hook);
    /**
     * @brief Drop the next song (#185). Cancels a preloadStemsAsync() that is still decoding
     * (its onReady reports hasStems=false and its result is never adopted) and frees a
     * finished or synchronously preloaded song. Afterwards hasPreloadedStems() is false and
     * switchToPreloaded() returns false. Never touches the current song, so it is safe while
     * that song plays.
     */
    void clearPreloaded();
    /**
     * @brief Stop and free the current song (#185). A preloaded song is kept, so
     * switchToPreloaded() still works afterwards. The audio sink is stopped before the
     * current song's buffers are freed, so they are never freed under the audio callback.
     */
    void unloadCurrent();
    /**
     * @brief Test seam (#185): song buffer sets this engine still holds in memory. Counts the
     * current song, a handed-off song the audio thread has not taken yet, songs the audio thread
     * has retired but the control thread has not freed yet, the preloaded song, and an async
     * decode result not yet adopted. Not for production use.
     */
    [[nodiscard]] std::size_t liveSongSetCountForTesting() const noexcept;
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
