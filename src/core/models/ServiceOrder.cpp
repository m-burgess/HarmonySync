#include "ServiceOrder.hpp"
#include <utility>
#include <stdexcept>

namespace HarmonySync::Core {

struct ServiceOrder::Impl {
    std::string id;
    std::string title;
    std::string dateString;
    std::vector<SongMap> songs;
    std::vector<SlideItem> slides;

    Impl() = default;
    Impl(std::string id_, std::string title_, std::string dateString_)
        : id(std::move(id_))
        , title(std::move(title_))
        , dateString(std::move(dateString_))
    {}
};

ServiceOrder::ServiceOrder()
    : m_impl(std::make_unique<Impl>())
{}

ServiceOrder::ServiceOrder(std::string orderId, std::string title, std::string dateString)
    : m_impl(std::make_unique<Impl>(std::move(orderId), std::move(title), std::move(dateString)))
{}

ServiceOrder::~ServiceOrder() = default;

ServiceOrder::ServiceOrder(const ServiceOrder& other)
    : m_impl(std::make_unique<Impl>(*other.m_impl))
{}

ServiceOrder& ServiceOrder::operator=(const ServiceOrder& other) {
    if (this != &other) {
        *m_impl = *other.m_impl;
    }
    return *this;
}

ServiceOrder::ServiceOrder(ServiceOrder&& other) noexcept = default;

ServiceOrder& ServiceOrder::operator=(ServiceOrder&& other) noexcept = default;

const std::string& ServiceOrder::id() const noexcept {
    return m_impl->id;
}

const std::string& ServiceOrder::title() const noexcept {
    return m_impl->title;
}

const std::string& ServiceOrder::dateString() const noexcept {
    return m_impl->dateString;
}

const std::vector<SongMap>& ServiceOrder::songs() const noexcept {
    return m_impl->songs;
}

const std::vector<SlideItem>& ServiceOrder::slides() const noexcept {
    return m_impl->slides;
}

void ServiceOrder::setTitle(std::string title) {
    m_impl->title = std::move(title);
}

void ServiceOrder::setDateString(std::string dateString) {
    m_impl->dateString = std::move(dateString);
}

void ServiceOrder::addSong(SongMap song) {
    m_impl->songs.push_back(std::move(song));
}

void ServiceOrder::addSlide(SlideItem slide) {
    m_impl->slides.push_back(std::move(slide));
}

void ServiceOrder::removeSongAt(size_t index) {
    if (index < m_impl->songs.size()) {
        m_impl->songs.erase(m_impl->songs.begin() + static_cast<ptrdiff_t>(index));
    }
}

void ServiceOrder::clearAll() noexcept {
    m_impl->songs.clear();
    m_impl->slides.clear();
}

} // namespace HarmonySync::Core
