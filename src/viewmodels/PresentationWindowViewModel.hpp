#ifndef HARMONYSYNC_PRESENTATION_WINDOW_VIEWMODEL_HPP
#define HARMONYSYNC_PRESENTATION_WINDOW_VIEWMODEL_HPP

#include "VideoBackgroundPlayer.hpp"
#include <memory>
#include <string>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel managing audience screen presentation output, video background loops, and chroma key parameters.
 */
class PresentationWindowViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(bool isChromaKeyEnabled READ isChromaKeyEnabled WRITE setChromaKeyEnabled NOTIFY chromaKeyStateChanged)
    Q_PROPERTY(QString keyColorHex READ keyColorHex WRITE setKeyColorHex NOTIFY chromaKeyColorChanged)
    Q_PROPERTY(bool isVideoPlaying READ isVideoPlaying NOTIFY videoStateChanged)
    Q_PROPERTY(QString activeVideoPath READ activeVideoPath NOTIFY videoPathChanged)
#endif

public:
    explicit PresentationWindowViewModel(std::shared_ptr<Media::VideoBackgroundPlayer> videoPlayer = nullptr);
#ifdef HARMONYSYNC_QT_AVAILABLE
    ~PresentationWindowViewModel() override;
#else
    ~PresentationWindowViewModel();
#endif

    PresentationWindowViewModel(const PresentationWindowViewModel&) = delete;
    PresentationWindowViewModel& operator=(const PresentationWindowViewModel&) = delete;

    // Accessors
    [[nodiscard]] bool isChromaKeyEnabled() const noexcept;
    void setChromaKeyEnabled(bool enabled) noexcept;

#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString keyColorHex() const;
    void setKeyColorHex(const QString& colorHex);
    [[nodiscard]] QString activeVideoPath() const;
#else
    [[nodiscard]] std::string keyColorHex() const;
    void setKeyColorHex(const std::string& colorHex);
    [[nodiscard]] std::string activeVideoPath() const;
#endif
    [[nodiscard]] std::string keyColorHexStd() const;
    [[nodiscard]] std::string activeVideoPathStd() const;

    [[nodiscard]] bool isVideoPlaying() const noexcept;

    // Commands
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_INVOKABLE bool loadBackgroundVideo(const QString& videoPath);
    Q_INVOKABLE void playVideo();
    Q_INVOKABLE void pauseVideo();
    Q_INVOKABLE void triggerCrossfade();
#else
    bool loadBackgroundVideo(const std::string& videoPath);
    void playVideo();
    void pauseVideo();
    void triggerCrossfade();
#endif

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void chromaKeyStateChanged(bool enabled);
    void chromaKeyColorChanged(const QString& colorHex);
    void videoStateChanged(bool playing);
    void videoPathChanged(const QString& path);
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_PRESENTATION_WINDOW_VIEWMODEL_HPP
