#ifndef HARMONYSYNC_SETTINGS_VIEWMODEL_HPP
#define HARMONYSYNC_SETTINGS_VIEWMODEL_HPP

#include "AppSettings.hpp"
#include "SettingsStorageService.hpp"
#include "DisplayManager.hpp"
#include <memory>
#include <string>
#include <vector>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#include <QStringList>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel exposing application display, typography, and layout settings to QML interfaces.
 */
class SettingsViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(int presentationDisplayIndex READ presentationDisplayIndex WRITE setPresentationDisplayIndex NOTIFY
                   settingsChanged)
    Q_PROPERTY(
        int confidenceDisplayIndex READ confidenceDisplayIndex WRITE setConfidenceDisplayIndex NOTIFY settingsChanged)
    Q_PROPERTY(int lyricsFontSize READ lyricsFontSize WRITE setLyricsFontSize NOTIFY settingsChanged)
    Q_PROPERTY(int lowerThirdFontSize READ lowerThirdFontSize WRITE setLowerThirdFontSize NOTIFY settingsChanged)
    Q_PROPERTY(QString fontFamily READ fontFamily WRITE setFontFamily NOTIFY settingsChanged)
    Q_PROPERTY(QString textColorHex READ textColorHex WRITE setTextColorHex NOTIFY settingsChanged)
    Q_PROPERTY(int vAlign READ vAlign WRITE setVAlign NOTIFY settingsChanged)
    Q_PROPERTY(int hAlign READ hAlign WRITE setHAlign NOTIFY settingsChanged)
    Q_PROPERTY(int marginOffsetX READ marginOffsetX WRITE setMarginOffsetX NOTIFY settingsChanged)
    Q_PROPERTY(int marginOffsetY READ marginOffsetY WRITE setMarginOffsetY NOTIFY settingsChanged)
    Q_PROPERTY(QStringList availableDisplayNames READ availableDisplayNames NOTIFY availableDisplaysChanged)
    Q_PROPERTY(QString localIpAddress READ localIpAddress CONSTANT)
#endif

public:
    explicit SettingsViewModel(std::shared_ptr<Core::SettingsStorageService> storageService = nullptr,
                               std::shared_ptr<Core::DisplayManager> displayManager = nullptr);
#ifdef HARMONYSYNC_QT_AVAILABLE
    ~SettingsViewModel() override;
#else
    ~SettingsViewModel();
#endif

    SettingsViewModel(const SettingsViewModel&) = delete;
    SettingsViewModel& operator=(const SettingsViewModel&) = delete;

    [[nodiscard]] int presentationDisplayIndex() const noexcept;
    void setPresentationDisplayIndex(int index) noexcept;

    [[nodiscard]] int confidenceDisplayIndex() const noexcept;
    void setConfidenceDisplayIndex(int index) noexcept;

    [[nodiscard]] int lyricsFontSize() const noexcept;
    void setLyricsFontSize(int size) noexcept;

    [[nodiscard]] int lowerThirdFontSize() const noexcept;
    void setLowerThirdFontSize(int size) noexcept;

#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString fontFamily() const;
    void setFontFamily(const QString& family);

    [[nodiscard]] QString textColorHex() const;
    void setTextColorHex(const QString& hexColor);
    [[nodiscard]] QStringList availableDisplayNames() const;
    Q_INVOKABLE void refreshDisplays();
    Q_INVOKABLE bool saveSettings();
    Q_INVOKABLE bool loadSettings();
    Q_INVOKABLE void resetToDefaults();
    [[nodiscard]] QString localIpAddress() const;
#else
    [[nodiscard]] std::string fontFamily() const;
    void setFontFamily(const std::string& family);

    [[nodiscard]] std::string textColorHex() const;
    void setTextColorHex(const std::string& hexColor);
    [[nodiscard]] std::vector<std::string> availableDisplayNames() const;
    void refreshDisplays();
    bool saveSettings();
    bool loadSettings();
    void resetToDefaults();
#endif

    [[nodiscard]] int vAlign() const noexcept;
    void setVAlign(int align) noexcept;

    [[nodiscard]] int hAlign() const noexcept;
    void setHAlign(int align) noexcept;

    [[nodiscard]] int marginOffsetX() const noexcept;
    void setMarginOffsetX(int offset) noexcept;

    [[nodiscard]] int marginOffsetY() const noexcept;
    void setMarginOffsetY(int offset) noexcept;

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void settingsChanged();
    void availableDisplaysChanged();
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_SETTINGS_VIEWMODEL_HPP
