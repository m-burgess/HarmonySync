#ifndef HARMONYSYNC_LOWER_THIRD_OVERLAY_VIEWMODEL_HPP
#define HARMONYSYNC_LOWER_THIRD_OVERLAY_VIEWMODEL_HPP

#include <memory>
#include <string>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel managing broadcast lower third overlays for live stream output.
 */
class LowerThirdOverlayViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(bool isVisible READ isVisible WRITE setVisible NOTIFY visibilityChanged)
    Q_PROPERTY(QString title READ title WRITE setTitle NOTIFY titleChanged)
    Q_PROPERTY(QString subtitle READ subtitle WRITE setSubtitle NOTIFY subtitleChanged)
#endif

public:
    LowerThirdOverlayViewModel();
    ~LowerThirdOverlayViewModel();

    LowerThirdOverlayViewModel(const LowerThirdOverlayViewModel&) = delete;
    LowerThirdOverlayViewModel& operator=(const LowerThirdOverlayViewModel&) = delete;

    [[nodiscard]] bool isVisible() const noexcept;
    void setVisible(bool visible) noexcept;

#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString title() const;
    void setTitle(const QString& title);
    [[nodiscard]] QString subtitle() const;
    void setSubtitle(const QString& subtitle);
#else
    [[nodiscard]] std::string title() const;
    void setTitle(const std::string& title);
    [[nodiscard]] std::string subtitle() const;
    void setSubtitle(const std::string& subtitle);
#endif
    [[nodiscard]] std::string titleStd() const;
    [[nodiscard]] std::string subtitleStd() const;

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void visibilityChanged(bool visible);
    void titleChanged(const QString& title);
    void subtitleChanged(const QString& subtitle);
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_LOWER_THIRD_OVERLAY_VIEWMODEL_HPP
