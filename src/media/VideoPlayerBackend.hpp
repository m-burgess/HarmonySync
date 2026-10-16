#ifndef HARMONYSYNC_VIDEO_PLAYER_BACKEND_HPP
#define HARMONYSYNC_VIDEO_PLAYER_BACKEND_HPP
#include <memory>
#include <string>
namespace HarmonySync::Media {
enum class VideoTransitionMode { Cut, Crossfade, AlphaBlend };
class IVideoPlayerBackend {
public:
    virtual ~IVideoPlayerBackend() = default;
    virtual bool loadPrimary(const std::string& path) = 0;
    virtual bool loadSecondary(const std::string& path) = 0;
    virtual void play() = 0;
    virtual void pause() = 0;
    virtual void stop() = 0;
    virtual void setLooping(bool loop) = 0;
    // Completion is synchronous, matching the existing instantaneous transition behavior.
    virtual void transition(VideoTransitionMode mode, int durationMs) = 0;
};
std::unique_ptr<IVideoPlayerBackend> createOfflineVideoPlayerBackend();
} // namespace HarmonySync::Media
#endif
