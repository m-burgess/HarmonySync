#ifndef HARMONYSYNC_SERVICE_ORDER_HPP
#define HARMONYSYNC_SERVICE_ORDER_HPP

#include "SongMap.hpp"
#include "SlideItem.hpp"
#include <string>
#include <vector>
#include <memory>

namespace HarmonySync::Core {

/**
 * @brief Aggregate root model representing a complete worship service schedule.
 */
class ServiceOrder {
public:
    ServiceOrder();
    ServiceOrder(std::string orderId, std::string title, std::string dateString);
    ~ServiceOrder();

    ServiceOrder(const ServiceOrder& other);
    ServiceOrder& operator=(const ServiceOrder& other);
    ServiceOrder(ServiceOrder&& other) noexcept;
    ServiceOrder& operator=(ServiceOrder&& other) noexcept;

    // Getters
    [[nodiscard]] const std::string& id() const noexcept;
    [[nodiscard]] const std::string& title() const noexcept;
    [[nodiscard]] const std::string& dateString() const noexcept;
    [[nodiscard]] const std::vector<SongMap>& songs() const noexcept;
    [[nodiscard]] const std::vector<SlideItem>& slides() const noexcept;
    [[nodiscard]] const std::string& playlistUrl() const noexcept;

    // Modifiers
    void setTitle(std::string title);
    void setDateString(std::string dateString);
    void addSong(SongMap song);
    void updateSongAt(size_t index, const SongMap& song);
    void addSlide(SlideItem slide);
    void removeSongAt(size_t index);
    void setPlaylistUrl(std::string url);
    void clearAll() noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_SERVICE_ORDER_HPP
