#include "SlideItem.hpp"
#include <utility>

namespace HarmonySync::Core {

struct SlideItem::Impl {
    std::string id;
    std::string title;
    SlideType type{SlideType::Unknown};
    std::string contentPath;
    std::string thumbnailPath;
    bool loopImages{false};
    bool autoplayBackgroundVideo{true};

    Impl() = default;
    Impl(std::string id_, std::string title_, SlideType type_)
        : id(std::move(id_))
        , title(std::move(title_))
        , type(type_)
    {}
};

SlideItem::SlideItem()
    : m_impl(std::make_unique<Impl>())
{}

SlideItem::SlideItem(std::string slideId, std::string title, SlideType type)
    : m_impl(std::make_unique<Impl>(std::move(slideId), std::move(title), type))
{}

SlideItem::~SlideItem() = default;

SlideItem::SlideItem(const SlideItem& other)
    : m_impl(std::make_unique<Impl>(*other.m_impl))
{}

SlideItem& SlideItem::operator=(const SlideItem& other) {
    if (this != &other) {
        *m_impl = *other.m_impl;
    }
    return *this;
}

SlideItem::SlideItem(SlideItem&& other) noexcept = default;

SlideItem& SlideItem::operator=(SlideItem&& other) noexcept = default;

const std::string& SlideItem::id() const noexcept {
    return m_impl->id;
}

const std::string& SlideItem::title() const noexcept {
    return m_impl->title;
}

SlideType SlideItem::type() const noexcept {
    return m_impl->type;
}

const std::string& SlideItem::contentPath() const noexcept {
    return m_impl->contentPath;
}

const std::string& SlideItem::thumbnailPath() const noexcept {
    return m_impl->thumbnailPath;
}

bool SlideItem::loopImages() const noexcept {
    return m_impl->loopImages;
}

bool SlideItem::autoplayBackgroundVideo() const noexcept {
    return m_impl->autoplayBackgroundVideo;
}

void SlideItem::setContentPath(std::string path) {
    m_impl->contentPath = std::move(path);
}

void SlideItem::setThumbnailPath(std::string path) {
    m_impl->thumbnailPath = std::move(path);
}

void SlideItem::setLoopImages(bool loop) noexcept {
    m_impl->loopImages = loop;
}

void SlideItem::setAutoplayBackgroundVideo(bool autoplay) noexcept {
    m_impl->autoplayBackgroundVideo = autoplay;
}

} // namespace HarmonySync::Core
