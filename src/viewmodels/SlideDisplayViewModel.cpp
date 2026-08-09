#include "SlideDisplayViewModel.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct SlideDisplayViewModel::Impl {
    std::vector<Core::SlideItem> slides;
    std::shared_ptr<Core::FolderService> folderService;
    int activeSlideIndex{-1};
    bool blackScreen{false};
    bool clearScreen{false};

    explicit Impl(std::shared_ptr<Core::FolderService> fs)
        : folderService(std::move(fs))
    {
        if (!folderService) {
            folderService = std::make_shared<Core::FolderService>();
        }
    }
};

SlideDisplayViewModel::SlideDisplayViewModel(std::shared_ptr<Core::FolderService> folderService)
    : m_impl(std::make_unique<Impl>(std::move(folderService)))
{}

SlideDisplayViewModel::~SlideDisplayViewModel() = default;

int SlideDisplayViewModel::activeSlideIndex() const noexcept {
    return m_impl->activeSlideIndex;
}

int SlideDisplayViewModel::slideCount() const noexcept {
    return static_cast<int>(m_impl->slides.size());
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString SlideDisplayViewModel::activeSlideTitle() const {
    if (m_impl->activeSlideIndex >= 0 && m_impl->activeSlideIndex < slideCount()) {
        return QString::fromStdString(m_impl->slides[static_cast<size_t>(m_impl->activeSlideIndex)].title());
    }
    return {};
}
#else
std::string SlideDisplayViewModel::activeSlideTitle() const {
    if (m_impl->activeSlideIndex >= 0 && m_impl->activeSlideIndex < slideCount()) {
        return m_impl->slides[static_cast<size_t>(m_impl->activeSlideIndex)].title();
    }
    return {};
}
#endif

std::string SlideDisplayViewModel::activeSlideTitleStd() const {
    if (m_impl->activeSlideIndex >= 0 && m_impl->activeSlideIndex < slideCount()) {
        return m_impl->slides[static_cast<size_t>(m_impl->activeSlideIndex)].title();
    }
    return {};
}

bool SlideDisplayViewModel::isBlackScreen() const noexcept {
    return m_impl->blackScreen;
}

bool SlideDisplayViewModel::isClearScreen() const noexcept {
    return m_impl->clearScreen;
}

const std::vector<Core::SlideItem>& SlideDisplayViewModel::slides() const noexcept {
    return m_impl->slides;
}

#ifdef HARMONYSYNC_QT_AVAILABLE
bool SlideDisplayViewModel::loadSlideFolder(const QString& folderPath) {
    std::string pathStr = folderPath.toStdString();
#else
bool SlideDisplayViewModel::loadSlideFolder(const std::string& pathStr) {
#endif
    m_impl->slides = m_impl->folderService->loadSlidesFromFolder(pathStr);
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit slideCountChanged(slideCount());
#endif
    if (!m_impl->slides.empty()) {
        selectSlide(0);
        return true;
    }
    return false;
}

void SlideDisplayViewModel::selectSlide(int index) {
    if (index >= 0 && index < slideCount() && m_impl->activeSlideIndex != index) {
        m_impl->activeSlideIndex = index;
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit activeSlideIndexChanged(index);
        emit activeSlideTitleChanged(activeSlideTitle());
#endif
    }
}

void SlideDisplayViewModel::nextSlide() {
    if (m_impl->activeSlideIndex + 1 < slideCount()) {
        selectSlide(m_impl->activeSlideIndex + 1);
    }
}

void SlideDisplayViewModel::previousSlide() {
    if (m_impl->activeSlideIndex - 1 >= 0) {
        selectSlide(m_impl->activeSlideIndex - 1);
    }
}

void SlideDisplayViewModel::toggleBlackScreen() {
    m_impl->blackScreen = !m_impl->blackScreen;
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit blackScreenStateChanged(m_impl->blackScreen);
#endif
}

void SlideDisplayViewModel::toggleClearScreen() {
    m_impl->clearScreen = !m_impl->clearScreen;
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit clearScreenStateChanged(m_impl->clearScreen);
#endif
}

} // namespace HarmonySync::ViewModels
