#include "AppSettings.hpp"
#include <utility>

namespace HarmonySync::Core {

struct AppSettings::Impl {
    int presentationDisplay{1};
    int confidenceDisplay{2};
    int resWidth{1920};
    int resHeight{1080};

    int lyricsFontSize{48};
    int lowerThirdFontSize{26};
    std::string fontFamily{"Inter"};
    std::string textColorHex{"#FFFFFF"};

    TextVerticalAlignment vAlign{TextVerticalAlignment::Bottom};
    TextHorizontalAlignment hAlign{TextHorizontalAlignment::Center};
    int offsetX{0};
    int offsetY{40};
};

AppSettings::AppSettings()
    : m_impl(std::make_unique<Impl>()) {}

AppSettings::~AppSettings() = default;

AppSettings::AppSettings(const AppSettings& other)
    : m_impl(std::make_unique<Impl>(*other.m_impl)) {}

AppSettings& AppSettings::operator=(const AppSettings& other) {
    if (this != &other) {
        *m_impl = *other.m_impl;
    }
    return *this;
}

AppSettings::AppSettings(AppSettings&& other) noexcept = default;
AppSettings& AppSettings::operator=(AppSettings&& other) noexcept = default;

int AppSettings::presentationDisplayIndex() const noexcept {
    return m_impl->presentationDisplay;
}

void AppSettings::setPresentationDisplayIndex(int index) noexcept {
    m_impl->presentationDisplay = index;
}

int AppSettings::confidenceDisplayIndex() const noexcept {
    return m_impl->confidenceDisplay;
}

void AppSettings::setConfidenceDisplayIndex(int index) noexcept {
    m_impl->confidenceDisplay = index;
}

int AppSettings::resolutionWidth() const noexcept {
    return m_impl->resWidth;
}

int AppSettings::resolutionHeight() const noexcept {
    return m_impl->resHeight;
}

void AppSettings::setResolution(int width, int height) noexcept {
    m_impl->resWidth = width;
    m_impl->resHeight = height;
}

int AppSettings::lyricsFontSize() const noexcept {
    return m_impl->lyricsFontSize;
}

void AppSettings::setLyricsFontSize(int size) noexcept {
    m_impl->lyricsFontSize = size;
}

int AppSettings::lowerThirdFontSize() const noexcept {
    return m_impl->lowerThirdFontSize;
}

void AppSettings::setLowerThirdFontSize(int size) noexcept {
    m_impl->lowerThirdFontSize = size;
}

const std::string& AppSettings::fontFamily() const noexcept {
    return m_impl->fontFamily;
}

void AppSettings::setFontFamily(std::string family) {
    m_impl->fontFamily = std::move(family);
}

const std::string& AppSettings::textColorHex() const noexcept {
    return m_impl->textColorHex;
}

void AppSettings::setTextColorHex(std::string hexColor) {
    m_impl->textColorHex = std::move(hexColor);
}

TextVerticalAlignment AppSettings::verticalAlignment() const noexcept {
    return m_impl->vAlign;
}

void AppSettings::setVerticalAlignment(TextVerticalAlignment align) noexcept {
    m_impl->vAlign = align;
}

TextHorizontalAlignment AppSettings::horizontalAlignment() const noexcept {
    return m_impl->hAlign;
}

void AppSettings::setHorizontalAlignment(TextHorizontalAlignment align) noexcept {
    m_impl->hAlign = align;
}

int AppSettings::marginOffsetX() const noexcept {
    return m_impl->offsetX;
}

void AppSettings::setMarginOffsetX(int offset) noexcept {
    m_impl->offsetX = offset;
}

int AppSettings::marginOffsetY() const noexcept {
    return m_impl->offsetY;
}

void AppSettings::setMarginOffsetY(int offset) noexcept {
    m_impl->offsetY = offset;
}

const std::string& AppSettings::preServiceMusicUrl() const noexcept {
    static const std::string empty;
    return empty;
}

void AppSettings::setPreServiceMusicUrl(std::string url) {
    (void)url;
}

void AppSettings::resetToDefaults() {
    *m_impl = Impl();
}

} // namespace HarmonySync::Core
