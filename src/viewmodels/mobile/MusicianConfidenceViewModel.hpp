#ifndef HARMONYSYNC_MUSICIAN_CONFIDENCE_VIEWMODEL_HPP
#define HARMONYSYNC_MUSICIAN_CONFIDENCE_VIEWMODEL_HPP

#include "MobileApiClient.hpp"
#include <memory>
#include <string>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel bridging live lyrics/confidence monitor data from the network to the QML Stage Lyrics view.
 */
class MusicianConfidenceViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(QString currentSongTitle READ currentSongTitle NOTIFY lyricsUpdated)
    Q_PROPERTY(QString currentLyricLine READ currentLyricLine NOTIFY lyricsUpdated)
    Q_PROPERTY(QString nextLyricLine READ nextLyricLine NOTIFY lyricsUpdated)
    Q_PROPERTY(QString timerText READ timerText NOTIFY timerUpdated)
#endif

public:
    explicit MusicianConfidenceViewModel(std::shared_ptr<Core::MobileApiClient> client = nullptr);
    ~MusicianConfidenceViewModel();

    MusicianConfidenceViewModel(const MusicianConfidenceViewModel&) = delete;
    MusicianConfidenceViewModel& operator=(const MusicianConfidenceViewModel&) = delete;

#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString currentSongTitle() const;
    [[nodiscard]] QString currentLyricLine() const;
    [[nodiscard]] QString nextLyricLine() const;
    [[nodiscard]] QString timerText() const;
#else
    [[nodiscard]] std::string currentSongTitle() const;
    [[nodiscard]] std::string currentLyricLine() const;
    [[nodiscard]] std::string nextLyricLine() const;
    [[nodiscard]] std::string timerText() const;
#endif

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void lyricsUpdated();
    void timerUpdated();
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_MUSICIAN_CONFIDENCE_VIEWMODEL_HPP
