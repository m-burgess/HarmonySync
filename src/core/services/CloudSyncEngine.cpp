#include "CloudSyncEngine.hpp"
#include <mutex>
#include <utility>

namespace HarmonySync::Core {

struct CloudSyncEngine::Impl {
    std::string endpoint{"https://api.harmonysync.org/v2/sync"};
    SyncState state{SyncState::Idle};
    bool autoSync{true};
    mutable std::mutex mutex;

    explicit Impl(std::string url)
        : endpoint(std::move(url))
    {}
};

CloudSyncEngine::CloudSyncEngine()
    : m_impl(std::make_unique<Impl>("https://api.harmonysync.org/v2/sync"))
{}

CloudSyncEngine::CloudSyncEngine(const std::string& endpointUrl)
    : m_impl(std::make_unique<Impl>(endpointUrl))
{}

CloudSyncEngine::~CloudSyncEngine() = default;

CloudSyncEngine::CloudSyncEngine(CloudSyncEngine&&) noexcept = default;
CloudSyncEngine& CloudSyncEngine::operator=(CloudSyncEngine&&) noexcept = default;

bool CloudSyncEngine::syncServiceOrder(const ServiceOrder& order) {
    (void)order;
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->state = SyncState::Syncing;
    // Simulate background REST/WebSocket push
    m_impl->state = SyncState::InSync;
    return true;
}

SyncState CloudSyncEngine::syncState() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->state;
}

std::string CloudSyncEngine::endpointUrl() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->endpoint;
}

void CloudSyncEngine::setAutoSyncEnabled(bool enabled) noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->autoSync = enabled;
}

bool CloudSyncEngine::isAutoSyncEnabled() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->autoSync;
}

} // namespace HarmonySync::Core
