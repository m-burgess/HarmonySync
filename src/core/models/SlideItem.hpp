#ifndef HARMONYSYNC_SLIDE_ITEM_HPP
#define HARMONYSYNC_SLIDE_ITEM_HPP

#include <string>
#include <memory>

namespace HarmonySync::Core {

enum class SlideType {
    Lyrics,
    Image,
    Video,
    YouTube,
    Header,
    Unknown
};

/**
 * @brief Domain model representing a slide element in a service schedule or presentation deck.
 */
class SlideItem {
public:
    SlideItem();
    SlideItem(std::string slideId, std::string title, SlideType type);
    ~SlideItem();

    SlideItem(const SlideItem& other);
    SlideItem& operator=(const SlideItem& other);
    SlideItem(SlideItem&& other) noexcept;
    SlideItem& operator=(SlideItem&& other) noexcept;

    // Getters
    [[nodiscard]] const std::string& id() const noexcept;
    [[nodiscard]] const std::string& title() const noexcept;
    [[nodiscard]] SlideType type() const noexcept;
    [[nodiscard]] const std::string& contentPath() const noexcept;
    [[nodiscard]] const std::string& thumbnailPath() const noexcept;
    [[nodiscard]] bool loopImages() const noexcept;
    [[nodiscard]] bool autoplayBackgroundVideo() const noexcept;

    // Setters
    void setContentPath(std::string path);
    void setThumbnailPath(std::string path);
    void setLoopImages(bool loop) noexcept;
    void setAutoplayBackgroundVideo(bool autoplay) noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_SLIDE_ITEM_HPP
