#ifndef HARMONYSYNC_SETLIST_VIEWMODEL_HPP
#define HARMONYSYNC_SETLIST_VIEWMODEL_HPP

#include "ServiceOrder.hpp"
#include "FolderService.hpp"
#include <memory>
#include <string>
#include <vector>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel bridging C++ ServiceOrder domain model to QML presentation layer.
 */
class SetlistViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(QString title READ title WRITE setTitle NOTIFY titleChanged)
    Q_PROPERTY(int itemCount READ itemCount NOTIFY itemCountChanged)
    Q_PROPERTY(int currentSongIndex READ currentSongIndex WRITE setCurrentSongIndex NOTIFY currentSongIndexChanged)
    Q_PROPERTY(bool hasActiveSongMap READ hasActiveSongMap NOTIFY activeSongMapChanged)
    Q_PROPERTY(bool isLoading READ isLoading NOTIFY loadingStateChanged)
    Q_PROPERTY(QString currentLyricsContent READ currentLyricsContent NOTIFY currentLyricsContentChanged)
    Q_PROPERTY(QString activeLyricText READ activeLyricText NOTIFY activeLyricTextChanged)
    Q_PROPERTY(QString nextLyricText READ nextLyricText NOTIFY nextLyricTextChanged)
    Q_PROPERTY(QString playlistUrl READ playlistUrl NOTIFY playlistUrlChanged)
    Q_PROPERTY(int activeLyricIndex READ activeLyricIndex WRITE setActiveLyricIndex NOTIFY activeLyricIndexChanged)
    Q_PROPERTY(bool autoLyricsEnabled READ autoLyricsEnabled WRITE setAutoLyricsEnabled NOTIFY autoLyricsEnabledChanged)
    Q_PROPERTY(bool isGeneratingTimestamps READ isGeneratingTimestamps NOTIFY isGeneratingTimestampsChanged)
    Q_PROPERTY(QString aiSyncProgressMessage READ aiSyncProgressMessage NOTIFY aiSyncProgressMessageChanged)
    Q_PROPERTY(QString currentSongMapJson READ currentSongMapJson NOTIFY currentSongMapJsonChanged)
#endif

public:
    explicit SetlistViewModel(std::shared_ptr<Core::FolderService> folderService = nullptr);
    ~SetlistViewModel();

    SetlistViewModel(const SetlistViewModel&) = delete;
    SetlistViewModel& operator=(const SetlistViewModel&) = delete;

    // Property Accessors
#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString title() const;
    void setTitle(const QString& newTitle);
#else
    [[nodiscard]] std::string title() const;
    void setTitle(const std::string& newTitle);
#endif
    [[nodiscard]] std::string titleStd() const;

    [[nodiscard]] int itemCount() const noexcept;
    [[nodiscard]] int currentSongIndex() const noexcept;
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_INVOKABLE void setCurrentSongIndex(int index);
#else
    void setCurrentSongIndex(int index);
#endif

    [[nodiscard]] bool hasActiveSongMap() const noexcept;
    [[nodiscard]] bool isLoading() const noexcept;

    // Commands callable from QML View
    // C++ strictly typed methods
    [[nodiscard]] std::vector<Core::MediaStem> stemsAt(int index) const;

#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_INVOKABLE bool openServiceOrderRootFolder(const QString& rootFolderPath);
    Q_INVOKABLE bool addSongFolder(const QString& folderPath);
    Q_INVOKABLE QString itemNameAt(int index) const;
    Q_INVOKABLE bool itemHasSongMapAt(int index) const;
    Q_INVOKABLE QString backgroundVideoPathAt(int index) const;
    Q_INVOKABLE void removeSongAt(int index);
    Q_INVOKABLE void clearSetlist();

    [[nodiscard]] QString currentLyricsContent() const;
    [[nodiscard]] QString activeLyricText() const;
    [[nodiscard]] QString nextLyricText() const;
    [[nodiscard]] QString playlistUrl() const;
    [[nodiscard]] int activeLyricIndex() const noexcept;
    Q_INVOKABLE void setActiveLyricIndex(int index);

    [[nodiscard]] bool autoLyricsEnabled() const noexcept;
    Q_INVOKABLE void setAutoLyricsEnabled(bool enabled);
    [[nodiscard]] bool isGeneratingTimestamps() const noexcept;
    Q_INVOKABLE void generateAITimestamps(const QString& referenceStemName = "reference");
    Q_INVOKABLE void syncToPlaybackPosition(double positionSeconds);
    
    [[nodiscard]] QString aiSyncProgressMessage() const;
    [[nodiscard]] QString currentSongMapJson() const;
    Q_INVOKABLE bool saveSongMapJson(const QString& jsonString);
#else
    bool openServiceOrderRootFolder(const std::string& rootFolderPath);
    bool addSongFolder(const std::string& folderPath);
    std::string itemNameAt(int index) const;
    bool itemHasSongMapAt(int index) const;
    std::string backgroundVideoPathAt(int index) const;
    void removeSongAt(int index);
    void clearSetlist();

    [[nodiscard]] std::string currentLyricsContent() const;
    [[nodiscard]] std::string activeLyricText() const;
    [[nodiscard]] std::string nextLyricText() const;
    [[nodiscard]] int activeLyricIndex() const noexcept;
    void setActiveLyricIndex(int index);

    [[nodiscard]] bool autoLyricsEnabled() const noexcept;
    void setAutoLyricsEnabled(bool enabled);
    [[nodiscard]] bool isGeneratingTimestamps() const noexcept;
    void generateAITimestamps(const std::string& referenceStemName = "reference");
    void syncToPlaybackPosition(double positionSeconds);

    [[nodiscard]] std::string currentSongMapJson() const;
    bool saveSongMapJson(const std::string& jsonString);
#endif

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void titleChanged(const QString& newTitle);
    void itemCountChanged(int count);
    void currentSongIndexChanged(int index);
    /// A new service order replaced the setlist. Emitted before its first song is selected (#220).
    void serviceOrderOpened();
    /// The setlist was cleared (#185). Emitted after itemCountChanged(0).
    void setlistCleared();
    /// The song at index was removed (#185). Emitted after the setlist is updated.
    void songRemoved(int index);
    void activeSongMapChanged(bool hasMap);
    void loadingStateChanged(bool loading);
    void currentLyricsContentChanged();
    void activeLyricTextChanged();
    void nextLyricTextChanged();
    void playlistUrlChanged();
    void activeLyricIndexChanged(int index);
    void autoLyricsEnabledChanged(bool enabled);
    void isGeneratingTimestampsChanged(bool generating);
    void aiSyncProgressMessageChanged();
    void currentSongMapJsonChanged();
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_SETLIST_VIEWMODEL_HPP
