#include "PresentationWindowViewModel.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct PresentationWindowViewModel::Impl {
    std::shared_ptr<Media::VideoBackgroundPlayer> videoPlayer;
    bool chromaKeyEnabled{true};
    std::string keyColorHex{"#00FF00"};

    explicit Impl(std::shared_ptr<Media::VideoBackgroundPlayer> vp)
        : videoPlayer(std::move(vp))
    {
        if (!videoPlayer) {
            videoPlayer = std::make_shared<Media::VideoBackgroundPlayer>();
        }
    }
};

PresentationWindowViewModel::PresentationWindowViewModel(std::shared_ptr<Media::VideoBackgroundPlayer> videoPlayer)
    : m_impl(std::make_unique<Impl>(std::move(videoPlayer)))
{}

PresentationWindowViewModel::~PresentationWindowViewModel() = default;

bool PresentationWindowViewModel::isChromaKeyEnabled() const noexcept {
    return m_impl->chromaKeyEnabled;
}

void PresentationWindowViewModel::setChromaKeyEnabled(bool enabled) noexcept {
    if (m_impl->chromaKeyEnabled != enabled) {
        m_impl->chromaKeyEnabled = enabled;
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit chromaKeyStateChanged(enabled);
#endif
    }
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString PresentationWindowViewModel::keyColorHex() const {
    return QString::fromStdString(m_impl->keyColorHex);
}

void PresentationWindowViewModel::setKeyColorHex(const QString& colorHex) {
    std::string str = colorHex.toStdString();
    if (m_impl->keyColorHex != str) {
        m_impl->keyColorHex = str;
        emit chromaKeyColorChanged(colorHex);
    }
}

QString PresentationWindowViewModel::activeVideoPath() const {
    return QString::fromStdString(m_impl->videoPlayer->activeVideoPath());
}

#else

std::string PresentationWindowViewModel::keyColorHex() const {
    return m_impl->keyColorHex;
}

void PresentationWindowViewModel::setKeyColorHex(const std::string& colorHex) {
    m_impl->keyColorHex = colorHex;
}

std::string PresentationWindowViewModel::activeVideoPath() const {
    return m_impl->videoPlayer->activeVideoPath();
}

#endif

std::string PresentationWindowViewModel::keyColorHexStd() const {
    return m_impl->keyColorHex;
}

std::string PresentationWindowViewModel::activeVideoPathStd() const {
    return m_impl->videoPlayer->activeVideoPath();
}

bool PresentationWindowViewModel::isVideoPlaying() const noexcept {
    return m_impl->videoPlayer->isPlaying();
}

#ifdef HARMONYSYNC_QT_AVAILABLE
bool PresentationWindowViewModel::loadBackgroundVideo(const QString& videoPath) {
    bool ok = m_impl->videoPlayer->loadPrimaryVideo(videoPath.toStdString());
    if (ok) emit videoPathChanged(videoPath);
    return ok;
}
#else
bool PresentationWindowViewModel::loadBackgroundVideo(const std::string& videoPath) {
    return m_impl->videoPlayer->loadPrimaryVideo(videoPath);
}
#endif

void PresentationWindowViewModel::playVideo() {
    m_impl->videoPlayer->play();
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit videoStateChanged(true);
#endif
}

void PresentationWindowViewModel::pauseVideo() {
    m_impl->videoPlayer->pause();
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit videoStateChanged(false);
#endif
}

void PresentationWindowViewModel::triggerCrossfade() {
    m_impl->videoPlayer->crossfadeToSecondary();
}

} // namespace HarmonySync::ViewModels
