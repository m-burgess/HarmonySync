#ifndef HARMONYSYNC_AUTO_UPDATE_SERVICE_HPP
#define HARMONYSYNC_AUTO_UPDATE_SERVICE_HPP

#include <string>
#include <memory>

namespace HarmonySync::Core {

/**
 * @brief Thread-safe background service checking for updates and verifying SHA256 integrity signatures.
 */
class AutoUpdateService {
public:
    AutoUpdateService();
    explicit AutoUpdateService(const std::string& updateChannel);
    ~AutoUpdateService();

    AutoUpdateService(const AutoUpdateService&) = delete;
    AutoUpdateService& operator=(const AutoUpdateService&) = delete;
    AutoUpdateService(AutoUpdateService&&) noexcept;
    AutoUpdateService& operator=(AutoUpdateService&&) noexcept;

    bool checkForUpdates();
    [[nodiscard]] bool isUpdateAvailable() const noexcept;
    [[nodiscard]] std::string latestVersion() const;

    [[nodiscard]] std::string updateChannel() const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_AUTO_UPDATE_SERVICE_HPP
