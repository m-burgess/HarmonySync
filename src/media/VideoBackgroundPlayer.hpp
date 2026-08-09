#ifndef HARMONYSYNC_VIDEO_BACKGROUND_PLAYER_HPP
#define HARMONYSYNC_VIDEO_BACKGROUND_PLAYER_HPP

#include <string>
#include <memory>

namespace HarmonySync::Media {

enum class VideoTransitionMode {
    Cut,
    Crossfade,
    AlphaBlend
};

/**
 * @brief Thread-safe manager for background video loops, crossfade transitions, and hardware-accelerated playback.
 */
class VideoBackgroundPlayer {
public:
    VideoBackgroundPlayer();
    ~VideoBackgroundPlayer();

    VideoBackgroundPlayer(const VideoBackgroundPlayer&) = delete;
    VideoBackgroundPlayer& operator=(const VideoBackgroundPlayer&) = delete;
    VideoBackgroundPlayer(VideoBackgroundPlayer&&) noexcept;
    VideoBackgroundPlayer& operator=(VideoBackgroundPlayer&&) noexcept;

    bool loadPrimaryVideo(const std::string& videoPath);
    bool loadSecondaryVideo(const std::string& videoPath);

    void play();
    void pause();
    void stop();

    void setLooping(bool loop) noexcept;
    [[nodiscard]] bool isLooping() const noexcept;

    void setTransitionDurationMs(int ms) noexcept;
    [[nodiscard]] int transitionDurationMs() const noexcept;

    void crossfadeToSecondary(VideoTransitionMode mode = VideoTransitionMode::Crossfade);

    [[nodiscard]] bool isPlaying() const noexcept;
    [[nodiscard]] const std::string& activeVideoPath() const noexcept;
    [[nodiscard]] float crossfadeProgress() const noexcept; // 0.0 to 1.0

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_VIDEO_BACKGROUND_PLAYER_HPP
