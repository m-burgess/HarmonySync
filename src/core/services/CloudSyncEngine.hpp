#ifndef HARMONYSYNC_CLOUD_SYNC_ENGINE_HPP
#define HARMONYSYNC_CLOUD_SYNC_ENGINE_HPP

#include "ServiceOrder.hpp"
#include <string>
#include <memory>

namespace HarmonySync::Core {

enum class SyncState {
    Idle,
    Syncing,
    InSync,
    Conflict,
    Error
};

/**
 * @brief Thread-safe cloud synchronization engine for setlist backups and live team collaboration.
 */
class CloudSyncEngine {
public:
    CloudSyncEngine();
    explicit CloudSyncEngine(const std::string& endpointUrl);
    ~CloudSyncEngine();

    CloudSyncEngine(const CloudSyncEngine&) = delete;
    CloudSyncEngine& operator=(const CloudSyncEngine&) = delete;
    CloudSyncEngine(CloudSyncEngine&&) noexcept;
    CloudSyncEngine& operator=(CloudSyncEngine&&) noexcept;

    bool syncServiceOrder(const ServiceOrder& order);
    [[nodiscard]] SyncState syncState() const noexcept;
    [[nodiscard]] std::string endpointUrl() const;

    void setAutoSyncEnabled(bool enabled) noexcept;
    [[nodiscard]] bool isAutoSyncEnabled() const noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_CLOUD_SYNC_ENGINE_HPP
