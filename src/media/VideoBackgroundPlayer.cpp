#include "VideoBackgroundPlayer.hpp"
#include <mutex>

namespace HarmonySync::Media {

struct VideoBackgroundPlayer::Impl {
    std::string primaryPath;
    std::string secondaryPath;
    std::string activePath;
    bool playing{false};
    bool looping{true};
    int transitionMs{1000};
    float fadeProgress{0.0f};
    mutable std::mutex mutex;
};

VideoBackgroundPlayer::VideoBackgroundPlayer()
    : m_impl(std::make_unique<Impl>())
{}

VideoBackgroundPlayer::~VideoBackgroundPlayer() = default;

VideoBackgroundPlayer::VideoBackgroundPlayer(VideoBackgroundPlayer&&) noexcept = default;
VideoBackgroundPlayer& VideoBackgroundPlayer::operator=(VideoBackgroundPlayer&&) noexcept = default;

bool VideoBackgroundPlayer::loadPrimaryVideo(const std::string& videoPath) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->primaryPath = videoPath;
    if (m_impl->activePath.empty()) {
        m_impl->activePath = videoPath;
    }
    return !videoPath.empty();
}

bool VideoBackgroundPlayer::loadSecondaryVideo(const std::string& videoPath) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->secondaryPath = videoPath;
    return !videoPath.empty();
}

void VideoBackgroundPlayer::play() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->playing = true;
}

void VideoBackgroundPlayer::pause() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->playing = false;
}

void VideoBackgroundPlayer::stop() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->playing = false;
    m_impl->fadeProgress = 0.0f;
}

void VideoBackgroundPlayer::setLooping(bool loop) noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->looping = loop;
}

bool VideoBackgroundPlayer::isLooping() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->looping;
}

void VideoBackgroundPlayer::setTransitionDurationMs(int ms) noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->transitionMs = ms;
}

int VideoBackgroundPlayer::transitionDurationMs() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->transitionMs;
}

void VideoBackgroundPlayer::crossfadeToSecondary(VideoTransitionMode mode) {
    (void)mode;
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (!m_impl->secondaryPath.empty()) {
        m_impl->activePath = m_impl->secondaryPath;
        m_impl->fadeProgress = 1.0f;
    }
}

bool VideoBackgroundPlayer::isPlaying() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->playing;
}

const std::string& VideoBackgroundPlayer::activeVideoPath() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->activePath;
}

float VideoBackgroundPlayer::crossfadeProgress() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->fadeProgress;
}

} // namespace HarmonySync::Media
