#include "LowerThirdOverlayViewModel.hpp"

namespace HarmonySync::ViewModels {

struct LowerThirdOverlayViewModel::Impl {
    bool visible{true};
    std::string titleText{"Way Maker"};
    std::string subtitleText{"Sinach"};
};

LowerThirdOverlayViewModel::LowerThirdOverlayViewModel()
    : m_impl(std::make_unique<Impl>()) {}

LowerThirdOverlayViewModel::~LowerThirdOverlayViewModel() = default;

bool LowerThirdOverlayViewModel::isVisible() const noexcept {
    return m_impl->visible;
}

void LowerThirdOverlayViewModel::setVisible(bool visible) noexcept {
    if (m_impl->visible != visible) {
        m_impl->visible = visible;
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit visibilityChanged(visible);
#endif
    }
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString LowerThirdOverlayViewModel::title() const {
    return QString::fromStdString(m_impl->titleText);
}

void LowerThirdOverlayViewModel::setTitle(const QString& title) {
    std::string str = title.toStdString();
    if (m_impl->titleText != str) {
        m_impl->titleText = str;
        emit titleChanged(title);
    }
}

QString LowerThirdOverlayViewModel::subtitle() const {
    return QString::fromStdString(m_impl->subtitleText);
}

void LowerThirdOverlayViewModel::setSubtitle(const QString& subtitle) {
    std::string str = subtitle.toStdString();
    if (m_impl->subtitleText != str) {
        m_impl->subtitleText = str;
        emit subtitleChanged(subtitle);
    }
}

#else

std::string LowerThirdOverlayViewModel::title() const {
    return m_impl->titleText;
}

void LowerThirdOverlayViewModel::setTitle(const std::string& title) {
    m_impl->titleText = title;
}

std::string LowerThirdOverlayViewModel::subtitle() const {
    return m_impl->subtitleText;
}

void LowerThirdOverlayViewModel::setSubtitle(const std::string& subtitle) {
    m_impl->subtitleText = subtitle;
}

#endif

std::string LowerThirdOverlayViewModel::titleStd() const {
    return m_impl->titleText;
}

std::string LowerThirdOverlayViewModel::subtitleStd() const {
    return m_impl->subtitleText;
}

} // namespace HarmonySync::ViewModels
