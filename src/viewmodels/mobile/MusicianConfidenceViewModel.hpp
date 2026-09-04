#ifndef HARMONYSYNC_MUSICIAN_CONFIDENCE_VIEWMODEL_HPP
#define HARMONYSYNC_MUSICIAN_CONFIDENCE_VIEWMODEL_HPP

#include "MobileApiClient.hpp"
#include <memory>
#include <string>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#include <QVariantList>
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
    
    // New properties for Transposition & Structure
    Q_PROPERTY(bool capoEnabled READ capoEnabled WRITE setCapoEnabled NOTIFY transpositionSettingsChanged)
    Q_PROPERTY(bool cagedEnabled READ cagedEnabled WRITE setCagedEnabled NOTIFY transpositionSettingsChanged)
    Q_PROPERTY(QString selectedKey READ selectedKey WRITE setSelectedKey NOTIFY transpositionSettingsChanged)
    Q_PROPERTY(QString originalKey READ originalKey NOTIFY songMapUpdated)
    Q_PROPERTY(QVariantList songStructure READ songStructure NOTIFY songMapUpdated)
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
    
    [[nodiscard]] bool capoEnabled() const;
    void setCapoEnabled(bool enabled);
    
    [[nodiscard]] bool cagedEnabled() const;
    void setCagedEnabled(bool enabled);
    
    [[nodiscard]] QString selectedKey() const;
    void setSelectedKey(const QString& key);
    
    [[nodiscard]] QString originalKey() const;
    [[nodiscard]] QVariantList songStructure() const;
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
    void songMapUpdated();
    void transpositionSettingsChanged();
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_MUSICIAN_CONFIDENCE_VIEWMODEL_HPP
