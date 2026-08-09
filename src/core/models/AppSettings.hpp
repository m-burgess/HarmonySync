#ifndef HARMONYSYNC_APP_SETTINGS_HPP
#define HARMONYSYNC_APP_SETTINGS_HPP

#include <string>
#include <memory>

namespace HarmonySync::Core {

enum class TextVerticalAlignment {
    Top,
    Center,
    Bottom
};

enum class TextHorizontalAlignment {
    Left,
    Center,
    Right
};

/**
 * @brief Thread-safe domain model capturing system display, typography, and text layout placement settings.
 */
class AppSettings {
public:
    AppSettings();
    ~AppSettings();

    AppSettings(const AppSettings& other);
    AppSettings& operator=(const AppSettings& other);
    AppSettings(AppSettings&& other) noexcept;
    AppSettings& operator=(AppSettings&& other) noexcept;

    // Display Settings
    [[nodiscard]] int presentationDisplayIndex() const noexcept;
    void setPresentationDisplayIndex(int index) noexcept;

    [[nodiscard]] int confidenceDisplayIndex() const noexcept;
    void setConfidenceDisplayIndex(int index) noexcept;

    [[nodiscard]] int resolutionWidth() const noexcept;
    [[nodiscard]] int resolutionHeight() const noexcept;
    void setResolution(int width, int height) noexcept;

    // Typography Settings
    [[nodiscard]] int lyricsFontSize() const noexcept;
    void setLyricsFontSize(int size) noexcept;

    [[nodiscard]] int lowerThirdFontSize() const noexcept;
    void setLowerThirdFontSize(int size) noexcept;

    [[nodiscard]] const std::string& fontFamily() const noexcept;
    void setFontFamily(std::string family);

    [[nodiscard]] const std::string& textColorHex() const noexcept;
    void setTextColorHex(std::string hexColor);

    // Text Alignment & Placement Settings
    [[nodiscard]] TextVerticalAlignment verticalAlignment() const noexcept;
    void setVerticalAlignment(TextVerticalAlignment align) noexcept;

    [[nodiscard]] TextHorizontalAlignment horizontalAlignment() const noexcept;
    void setHorizontalAlignment(TextHorizontalAlignment align) noexcept;

    [[nodiscard]] int marginOffsetX() const noexcept;
    void setMarginOffsetX(int offset) noexcept;

    [[nodiscard]] int marginOffsetY() const noexcept;
    void setMarginOffsetY(int offset) noexcept;

    void resetToDefaults();

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_APP_SETTINGS_HPP
