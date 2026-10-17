#include "AutoUpdateService.hpp"
#include <mutex>
#include <utility>

namespace HarmonySync::Core {

struct AutoUpdateService::Impl {
    std::string channel{"stable"};
    bool updateAvailable{false};
    std::string latestVer{"2.1.0"};
    mutable std::mutex mutex;

    explicit Impl(std::string ch)
        : channel(std::move(ch)) {}
};

AutoUpdateService::AutoUpdateService()
    : m_impl(std::make_unique<Impl>("stable")) {}

AutoUpdateService::AutoUpdateService(const std::string& updateChannel)
    : m_impl(std::make_unique<Impl>(updateChannel)) {}

AutoUpdateService::~AutoUpdateService() = default;

AutoUpdateService::AutoUpdateService(AutoUpdateService&&) noexcept = default;
AutoUpdateService& AutoUpdateService::operator=(AutoUpdateService&&) noexcept = default;

bool AutoUpdateService::checkForUpdates() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->updateAvailable = true;
    return true;
}

bool AutoUpdateService::isUpdateAvailable() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->updateAvailable;
}

std::string AutoUpdateService::latestVersion() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->latestVer;
}

std::string AutoUpdateService::updateChannel() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->channel;
}

} // namespace HarmonySync::Core
