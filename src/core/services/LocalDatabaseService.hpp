#ifndef HARMONYSYNC_LOCAL_DATABASE_SERVICE_HPP
#define HARMONYSYNC_LOCAL_DATABASE_SERVICE_HPP

#include "SongMap.hpp"
#include "ServiceOrder.hpp"
#include <string>
#include <vector>
#include <memory>

namespace HarmonySync::Core {

/**
 * @brief RAII SQLite database wrapper providing offline storage for song maps, service schedules, and presentation
 * settings.
 */
class LocalDatabaseService {
public:
    LocalDatabaseService();
    explicit LocalDatabaseService(const std::string& dbPath);
    ~LocalDatabaseService();

    LocalDatabaseService(const LocalDatabaseService&) = delete;
    LocalDatabaseService& operator=(const LocalDatabaseService&) = delete;
    LocalDatabaseService(LocalDatabaseService&&) noexcept;
    LocalDatabaseService& operator=(LocalDatabaseService&&) noexcept;

    bool initializeDatabase();
    [[nodiscard]] bool isOpen() const noexcept;

    // Song Map Persistence
    bool saveSongMap(const SongMap& song);
    [[nodiscard]] SongMap getSongMapById(const std::string& songId) const;
    [[nodiscard]] std::vector<SongMap> getAllSongMaps() const;

    // Service Order Persistence
    bool saveServiceOrder(const ServiceOrder& order);
    [[nodiscard]] ServiceOrder getServiceOrderById(const std::string& orderId) const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_LOCAL_DATABASE_SERVICE_HPP
