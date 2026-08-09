#ifndef HARMONYSYNC_SETTINGS_STORAGE_SERVICE_HPP
#define HARMONYSYNC_SETTINGS_STORAGE_SERVICE_HPP

#include "AppSettings.hpp"
#include <string>
#include <memory>

namespace HarmonySync::Core {

/**
 * @brief Thread-safe file persistence service saving and loading AppSettings configuration files.
 */
class SettingsStorageService {
public:
    SettingsStorageService();
    explicit SettingsStorageService(std::string defaultFilePath);
    ~SettingsStorageService();

    SettingsStorageService(const SettingsStorageService&) = delete;
    SettingsStorageService& operator=(const SettingsStorageService&) = delete;
    SettingsStorageService(SettingsStorageService&&) noexcept;
    SettingsStorageService& operator=(SettingsStorageService&&) noexcept;

    bool saveSettings(const AppSettings& settings, const std::string& filePath = "");
    [[nodiscard]] AppSettings loadSettings(const std::string& filePath = "");

    [[nodiscard]] std::string defaultFilePath() const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_SETTINGS_STORAGE_SERVICE_HPP
