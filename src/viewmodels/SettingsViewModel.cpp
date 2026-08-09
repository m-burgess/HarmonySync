#include "SettingsViewModel.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct SettingsViewModel::Impl {
    Core::AppSettings settings;
    std::shared_ptr<Core::SettingsStorageService> storageService;
    std::shared_ptr<Core::DisplayManager> displayManager;

    Impl(std::shared_ptr<Core::SettingsStorageService> storage,
         std::shared_ptr<Core::DisplayManager> displays)
        : storageService(std::move(storage)), displayManager(std::move(displays))
    {
        if (!storageService) {
            storageService = std::make_shared<Core::SettingsStorageService>();
        }
        if (!displayManager) {
            displayManager = std::make_shared<Core::DisplayManager>();
        }
        displayManager->detectSystemDisplays();
    }
};

SettingsViewModel::SettingsViewModel(
    std::shared_ptr<Core::SettingsStorageService> storageService,
    std::shared_ptr<Core::DisplayManager> displayManager)
    : m_impl(std::make_unique<Impl>(std::move(storageService), std::move(displayManager)))
{}

SettingsViewModel::~SettingsViewModel() = default;

int SettingsViewModel::presentationDisplayIndex() const noexcept {
    return m_impl->settings.presentationDisplayIndex();
}

void SettingsViewModel::setPresentationDisplayIndex(int index) noexcept {
    if (m_impl->settings.presentationDisplayIndex() != index) {
        m_impl->settings.setPresentationDisplayIndex(index);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit settingsChanged();
#endif
    }
}

int SettingsViewModel::confidenceDisplayIndex() const noexcept {
    return m_impl->settings.confidenceDisplayIndex();
}

void SettingsViewModel::setConfidenceDisplayIndex(int index) noexcept {
    if (m_impl->settings.confidenceDisplayIndex() != index) {
        m_impl->settings.setConfidenceDisplayIndex(index);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit settingsChanged();
#endif
    }
}

int SettingsViewModel::lyricsFontSize() const noexcept {
    return m_impl->settings.lyricsFontSize();
}

void SettingsViewModel::setLyricsFontSize(int size) noexcept {
    if (m_impl->settings.lyricsFontSize() != size) {
        m_impl->settings.setLyricsFontSize(size);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit settingsChanged();
#endif
    }
}

int SettingsViewModel::lowerThirdFontSize() const noexcept {
    return m_impl->settings.lowerThirdFontSize();
}

void SettingsViewModel::setLowerThirdFontSize(int size) noexcept {
    if (m_impl->settings.lowerThirdFontSize() != size) {
        m_impl->settings.setLowerThirdFontSize(size);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit settingsChanged();
#endif
    }
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString SettingsViewModel::fontFamily() const {
    return QString::fromStdString(m_impl->settings.fontFamily());
}

void SettingsViewModel::setFontFamily(const QString& family) {
    std::string fStr = family.toStdString();
    if (m_impl->settings.fontFamily() != fStr) {
        m_impl->settings.setFontFamily(fStr);
        emit settingsChanged();
    }
}

QString SettingsViewModel::textColorHex() const {
    return QString::fromStdString(m_impl->settings.textColorHex());
}

void SettingsViewModel::setTextColorHex(const QString& hexColor) {
    std::string cStr = hexColor.toStdString();
    if (m_impl->settings.textColorHex() != cStr) {
        m_impl->settings.setTextColorHex(cStr);
        emit settingsChanged();
    }
}

QStringList SettingsViewModel::availableDisplayNames() const {
    QStringList list;
    for (const auto& d : m_impl->displayManager->availableDisplays()) {
        list.append(QString::fromStdString(d.name));
    }
    return list;
}

void SettingsViewModel::refreshDisplays() {
    m_impl->displayManager->detectSystemDisplays();
    emit availableDisplaysChanged();
}

bool SettingsViewModel::saveSettings() {
    return m_impl->storageService->saveSettings(m_impl->settings);
}

bool SettingsViewModel::loadSettings() {
    m_impl->settings = m_impl->storageService->loadSettings();
    emit settingsChanged();
    return true;
}

void SettingsViewModel::resetToDefaults() {
    m_impl->settings.resetToDefaults();
    emit settingsChanged();
}

#else

std::string SettingsViewModel::fontFamily() const {
    return m_impl->settings.fontFamily();
}

void SettingsViewModel::setFontFamily(const std::string& family) {
    m_impl->settings.setFontFamily(family);
}

std::string SettingsViewModel::textColorHex() const {
    return m_impl->settings.textColorHex();
}

void SettingsViewModel::setTextColorHex(const std::string& hexColor) {
    m_impl->settings.setTextColorHex(hexColor);
}

std::vector<std::string> SettingsViewModel::availableDisplayNames() const {
    std::vector<std::string> list;
    for (const auto& d : m_impl->displayManager->availableDisplays()) {
        list.push_back(d.name);
    }
    return list;
}

void SettingsViewModel::refreshDisplays() {
    m_impl->displayManager->detectSystemDisplays();
}

bool SettingsViewModel::saveSettings() {
    return m_impl->storageService->saveSettings(m_impl->settings);
}

bool SettingsViewModel::loadSettings() {
    m_impl->settings = m_impl->storageService->loadSettings();
    return true;
}

void SettingsViewModel::resetToDefaults() {
    m_impl->settings.resetToDefaults();
}

#endif

int SettingsViewModel::vAlign() const noexcept {
    return static_cast<int>(m_impl->settings.verticalAlignment());
}

void SettingsViewModel::setVAlign(int align) noexcept {
    m_impl->settings.setVerticalAlignment(static_cast<Core::TextVerticalAlignment>(align));
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit settingsChanged();
#endif
}

int SettingsViewModel::hAlign() const noexcept {
    return static_cast<int>(m_impl->settings.horizontalAlignment());
}

void SettingsViewModel::setHAlign(int align) noexcept {
    m_impl->settings.setHorizontalAlignment(static_cast<Core::TextHorizontalAlignment>(align));
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit settingsChanged();
#endif
}

int SettingsViewModel::marginOffsetX() const noexcept {
    return m_impl->settings.marginOffsetX();
}

void SettingsViewModel::setMarginOffsetX(int offset) noexcept {
    if (m_impl->settings.marginOffsetX() != offset) {
        m_impl->settings.setMarginOffsetX(offset);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit settingsChanged();
#endif
    }
}

int SettingsViewModel::marginOffsetY() const noexcept {
    return m_impl->settings.marginOffsetY();
}

void SettingsViewModel::setMarginOffsetY(int offset) noexcept {
    if (m_impl->settings.marginOffsetY() != offset) {
        m_impl->settings.setMarginOffsetY(offset);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit settingsChanged();
#endif
    }
}

} // namespace HarmonySync::ViewModels
