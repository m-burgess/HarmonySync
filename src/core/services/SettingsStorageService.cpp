#include "SettingsStorageService.hpp"
#include <fstream>
#include <sstream>
#include <mutex>
#include <utility>

namespace HarmonySync::Core {

struct SettingsStorageService::Impl {
    std::string path{"/tmp/harmonysync_settings.json"};
    mutable std::mutex mutex;

    explicit Impl(std::string p)
        : path(std::move(p)) {}
};

SettingsStorageService::SettingsStorageService()
    : m_impl(std::make_unique<Impl>("/tmp/harmonysync_settings.json")) {}

SettingsStorageService::SettingsStorageService(std::string defaultFilePath)
    : m_impl(std::make_unique<Impl>(std::move(defaultFilePath))) {}

SettingsStorageService::~SettingsStorageService() = default;

SettingsStorageService::SettingsStorageService(SettingsStorageService&&) noexcept = default;
SettingsStorageService& SettingsStorageService::operator=(SettingsStorageService&&) noexcept = default;

bool SettingsStorageService::saveSettings(const AppSettings& settings, const std::string& filePath) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    std::string targetPath = filePath.empty() ? m_impl->path : filePath;

    std::ofstream outFile(targetPath);
    if (!outFile.is_open()) {
        return false;
    }

    outFile << "{\n"
            << "  \"presentationDisplay\": " << settings.presentationDisplayIndex() << ",\n"
            << "  \"confidenceDisplay\": " << settings.confidenceDisplayIndex() << ",\n"
            << "  \"resolutionWidth\": " << settings.resolutionWidth() << ",\n"
            << "  \"resolutionHeight\": " << settings.resolutionHeight() << ",\n"
            << "  \"lyricsFontSize\": " << settings.lyricsFontSize() << ",\n"
            << "  \"lowerThirdFontSize\": " << settings.lowerThirdFontSize() << ",\n"
            << "  \"fontFamily\": \"" << settings.fontFamily() << "\",\n"
            << "  \"textColorHex\": \"" << settings.textColorHex() << "\",\n"
            << "  \"vAlign\": " << static_cast<int>(settings.verticalAlignment()) << ",\n"
            << "  \"hAlign\": " << static_cast<int>(settings.horizontalAlignment()) << ",\n"
            << "  \"marginOffsetX\": " << settings.marginOffsetX() << ",\n"
            << "  \"marginOffsetY\": " << settings.marginOffsetY() << "\n"
            << "}\n";

    return true;
}

AppSettings SettingsStorageService::loadSettings(const std::string& filePath) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    std::string targetPath = filePath.empty() ? m_impl->path : filePath;

    AppSettings settings;
    std::ifstream inFile(targetPath);
    if (!inFile.is_open()) {
        return settings;
    }

    std::string line;
    while (std::getline(inFile, line)) {
        if (line.find("\"presentationDisplay\":") != std::string::npos) {
            settings.setPresentationDisplayIndex(std::stoi(line.substr(line.find(':') + 1)));
        } else if (line.find("\"confidenceDisplay\":") != std::string::npos) {
            settings.setConfidenceDisplayIndex(std::stoi(line.substr(line.find(':') + 1)));
        } else if (line.find("\"lyricsFontSize\":") != std::string::npos) {
            settings.setLyricsFontSize(std::stoi(line.substr(line.find(':') + 1)));
        } else if (line.find("\"lowerThirdFontSize\":") != std::string::npos) {
            settings.setLowerThirdFontSize(std::stoi(line.substr(line.find(':') + 1)));
        } else if (line.find("\"marginOffsetX\":") != std::string::npos) {
            settings.setMarginOffsetX(std::stoi(line.substr(line.find(':') + 1)));
        } else if (line.find("\"marginOffsetY\":") != std::string::npos) {
            settings.setMarginOffsetY(std::stoi(line.substr(line.find(':') + 1)));
        }
    }

    return settings;
}

std::string SettingsStorageService::defaultFilePath() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->path;
}

} // namespace HarmonySync::Core
