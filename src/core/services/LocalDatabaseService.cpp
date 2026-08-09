#include "LocalDatabaseService.hpp"
#include <mutex>
#include <unordered_map>

namespace HarmonySync::Core {

struct LocalDatabaseService::Impl {
    std::string dbPath;
    bool open{false};
    std::unordered_map<std::string, SongMap> songStorage;
    std::unordered_map<std::string, ServiceOrder> orderStorage;
    mutable std::mutex mutex;

    explicit Impl(std::string path)
        : dbPath(std::move(path))
    {}
};

LocalDatabaseService::LocalDatabaseService()
    : m_impl(std::make_unique<Impl>(":memory:"))
{}

LocalDatabaseService::LocalDatabaseService(const std::string& dbPath)
    : m_impl(std::make_unique<Impl>(dbPath))
{}

LocalDatabaseService::~LocalDatabaseService() = default;

LocalDatabaseService::LocalDatabaseService(LocalDatabaseService&&) noexcept = default;
LocalDatabaseService& LocalDatabaseService::operator=(LocalDatabaseService&&) noexcept = default;

bool LocalDatabaseService::initializeDatabase() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->open = true;
    return true;
}

bool LocalDatabaseService::isOpen() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->open;
}

bool LocalDatabaseService::saveSongMap(const SongMap& song) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (!m_impl->open) return false;
    m_impl->songStorage[song.id()] = song;
    return true;
}

SongMap LocalDatabaseService::getSongMapById(const std::string& songId) const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    auto it = m_impl->songStorage.find(songId);
    if (it != m_impl->songStorage.end()) {
        return it->second;
    }
    return {};
}

std::vector<SongMap> LocalDatabaseService::getAllSongMaps() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    std::vector<SongMap> result;
    result.reserve(m_impl->songStorage.size());
    for (const auto& [id, song] : m_impl->songStorage) {
        result.push_back(song);
    }
    return result;
}

bool LocalDatabaseService::saveServiceOrder(const ServiceOrder& order) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (!m_impl->open) return false;
    m_impl->orderStorage[order.id()] = order;
    return true;
}

ServiceOrder LocalDatabaseService::getServiceOrderById(const std::string& orderId) const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    auto it = m_impl->orderStorage.find(orderId);
    if (it != m_impl->orderStorage.end()) {
        return it->second;
    }
    return {};
}

} // namespace HarmonySync::Core
