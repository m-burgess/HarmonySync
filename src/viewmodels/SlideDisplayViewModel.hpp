#ifndef HARMONYSYNC_SLIDE_DISPLAY_VIEWMODEL_HPP
#define HARMONYSYNC_SLIDE_DISPLAY_VIEWMODEL_HPP

#include "SlideItem.hpp"
#include "FolderService.hpp"
#include <memory>
#include <vector>
#include <string>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel managing presentation slide lists, active slide output, and confidence monitor display bindings.
 */
class SlideDisplayViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(int activeSlideIndex READ activeSlideIndex NOTIFY activeSlideIndexChanged)
    Q_PROPERTY(int slideCount READ slideCount NOTIFY slideCountChanged)
    Q_PROPERTY(QString activeSlideTitle READ activeSlideTitle NOTIFY activeSlideTitleChanged)
    Q_PROPERTY(bool isBlackScreen READ isBlackScreen NOTIFY blackScreenStateChanged)
    Q_PROPERTY(bool isClearScreen READ isClearScreen NOTIFY clearScreenStateChanged)
#endif

public:
    explicit SlideDisplayViewModel(std::shared_ptr<Core::FolderService> folderService = nullptr);
    ~SlideDisplayViewModel();

    SlideDisplayViewModel(const SlideDisplayViewModel&) = delete;
    SlideDisplayViewModel& operator=(const SlideDisplayViewModel&) = delete;

    // Property Accessors
    [[nodiscard]] int activeSlideIndex() const noexcept;
    [[nodiscard]] int slideCount() const noexcept;
#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString activeSlideTitle() const;
#else
    [[nodiscard]] std::string activeSlideTitle() const;
#endif
    [[nodiscard]] std::string activeSlideTitleStd() const;

    [[nodiscard]] bool isBlackScreen() const noexcept;
    [[nodiscard]] bool isClearScreen() const noexcept;
    [[nodiscard]] const std::vector<Core::SlideItem>& slides() const noexcept;

    // Commands
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_INVOKABLE bool loadSlideFolder(const QString& folderPath);
    Q_INVOKABLE void selectSlide(int index);
    Q_INVOKABLE void nextSlide();
    Q_INVOKABLE void previousSlide();
    Q_INVOKABLE void toggleBlackScreen();
    Q_INVOKABLE void toggleClearScreen();
#else
    bool loadSlideFolder(const std::string& folderPath);
    void selectSlide(int index);
    void nextSlide();
    void previousSlide();
    void toggleBlackScreen();
    void toggleClearScreen();
#endif

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void activeSlideIndexChanged(int index);
    void slideCountChanged(int count);
    void activeSlideTitleChanged(const QString& title);
    void blackScreenStateChanged(bool active);
    void clearScreenStateChanged(bool active);
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_SLIDE_DISPLAY_VIEWMODEL_HPP
