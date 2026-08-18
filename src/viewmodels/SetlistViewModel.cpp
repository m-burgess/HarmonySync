#include "SetlistViewModel.hpp"
#include "ServiceOrderFolderScanner.hpp"
#include "AILyricSyncService.hpp"
#include <utility>
#include <algorithm>
#include <iostream>

namespace HarmonySync::ViewModels {

struct SetlistViewModel::Impl {
    Core::ServiceOrder serviceOrder;
    std::shared_ptr<Core::FolderService> folderService;
    Core::ServiceOrderFolderScanner scanner;
    std::shared_ptr<Core::AILyricSyncService> aiSyncService = std::make_shared<Core::AILyricSyncService>();
    std::string titleStr{"Sunday Service Order"};
    int currentSongIndex{-1};
    bool isLoading{false};
    bool autoLyricsEnabled{false};
    bool isGeneratingTimestamps{false};

    int activeLyricIndex{-1};
    std::string activeLyricText;
    std::string nextLyricText;
    std::vector<std::string> lyricBlocks;

    void updateLyricBlocks() {
        lyricBlocks.clear();
        if (currentSongIndex < 0 || currentSongIndex >= static_cast<int>(serviceOrder.songs().size())) {
            return;
        }

        std::string raw = serviceOrder.songs()[currentSongIndex].lyricsContent();
        std::istringstream stream(raw);
        std::string line;
        std::string currentBlock;
        int lineCount = 0;

        auto trim = [](std::string& s) {
            s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](unsigned char ch) { return !std::isspace(ch); }));
            s.erase(std::find_if(s.rbegin(), s.rend(), [](unsigned char ch) { return !std::isspace(ch); }).base(), s.end());
        };

        while (std::getline(stream, line)) {
            if (!line.empty() && line.back() == '\r') {
                line.pop_back();
            }
            trim(line);

            if (line.empty()) {
                if (!currentBlock.empty()) {
                    lyricBlocks.push_back(currentBlock);
                    currentBlock.clear();
                    lineCount = 0;
                }
                continue;
            }

            if (!line.empty() && line.front() == '[' && line.back() == ']') {
                if (!currentBlock.empty()) {
                    lyricBlocks.push_back(currentBlock);
                    currentBlock.clear();
                    lineCount = 0;
                }
                lyricBlocks.push_back(line); // Header block
                continue;
            }

            if (currentBlock.empty()) {
                currentBlock = line;
                lineCount = 1;
            } else {
                currentBlock += "\n" + line;
                lineCount++;
            }

            if (lineCount == 2) {
                lyricBlocks.push_back(currentBlock);
                currentBlock.clear();
                lineCount = 0;
            }
        }
        if (!currentBlock.empty()) {
            lyricBlocks.push_back(currentBlock);
        }
    }

    void calculateActiveLyrics() {
        activeLyricText.clear();
        nextLyricText.clear();

        if (activeLyricIndex >= 0 && activeLyricIndex < static_cast<int>(lyricBlocks.size())) {
            activeLyricText = lyricBlocks[activeLyricIndex];
            // Find next non-header block
            for (size_t i = activeLyricIndex + 1; i < lyricBlocks.size(); ++i) {
                if (!lyricBlocks[i].empty() && lyricBlocks[i].front() != '[') {
                    nextLyricText = lyricBlocks[i];
                    break;
                }
            }
        }
    }

    explicit Impl(std::shared_ptr<Core::FolderService> fs)
        : folderService(std::move(fs))
        , scanner(folderService)
    {
        if (!folderService) {
            folderService = std::make_shared<Core::FolderService>();
        }
    }
};

SetlistViewModel::SetlistViewModel(std::shared_ptr<Core::FolderService> folderService)
    : m_impl(std::make_unique<Impl>(std::move(folderService)))
{}

SetlistViewModel::~SetlistViewModel() = default;

#ifdef HARMONYSYNC_QT_AVAILABLE
QString SetlistViewModel::title() const {
    return QString::fromStdString(m_impl->titleStr);
}

void SetlistViewModel::setTitle(const QString& newTitle) {
    std::string str = newTitle.toStdString();
    if (m_impl->titleStr != str) {
        m_impl->titleStr = str;
        emit titleChanged(newTitle);
    }
}
#else
std::string SetlistViewModel::title() const {
    return m_impl->titleStr;
}

void SetlistViewModel::setTitle(const std::string& newTitle) {
    m_impl->titleStr = newTitle;
}
#endif

std::string SetlistViewModel::titleStd() const {
    return m_impl->titleStr;
}

int SetlistViewModel::itemCount() const noexcept {
    return static_cast<int>(m_impl->serviceOrder.songs().size());
}

int SetlistViewModel::currentSongIndex() const noexcept {
    return m_impl->currentSongIndex;
}

void SetlistViewModel::setCurrentSongIndex(int index) {
    if (index >= -1 && index < itemCount() && m_impl->currentSongIndex != index) {
        m_impl->currentSongIndex = index;
        m_impl->activeLyricIndex = -1;
        m_impl->updateLyricBlocks();
        m_impl->calculateActiveLyrics();

#ifdef HARMONYSYNC_QT_AVAILABLE
        emit currentSongIndexChanged(index);
        emit activeSongMapChanged(hasActiveSongMap());
        emit currentLyricsContentChanged();
        emit activeLyricIndexChanged(m_impl->activeLyricIndex);
        emit activeLyricTextChanged();
        emit nextLyricTextChanged();
        emit playlistUrlChanged();
#endif
    }
}

bool SetlistViewModel::hasActiveSongMap() const noexcept {
    if (m_impl->currentSongIndex >= 0 && m_impl->currentSongIndex < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(m_impl->currentSongIndex)].hasSongMap();
    }
    return false;
}

bool SetlistViewModel::isLoading() const noexcept {
    return m_impl->isLoading;
}

std::vector<Core::MediaStem> SetlistViewModel::stemsAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].stems();
    }
    return {};
}

#ifdef HARMONYSYNC_QT_AVAILABLE
bool SetlistViewModel::openServiceOrderRootFolder(const QString& rootFolderPath) {
    std::string pathStr = rootFolderPath.toStdString();
#else
bool SetlistViewModel::openServiceOrderRootFolder(const std::string& pathStr) {
#endif
    Core::ServiceOrder newOrder = m_impl->scanner.scanServiceOrderDirectory(pathStr);
    if (!newOrder.songs().empty()) {
        m_impl->serviceOrder = std::move(newOrder);
        setTitle(
#ifdef HARMONYSYNC_QT_AVAILABLE
            QString::fromStdString(m_impl->serviceOrder.dateString())
#else
            m_impl->serviceOrder.dateString()
#endif
        );
        m_impl->currentSongIndex = -1;
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit itemCountChanged(itemCount());
#endif
        setCurrentSongIndex(0);
        return true;
    }
    return false;
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString SetlistViewModel::itemNameAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return QString::fromStdString(m_impl->serviceOrder.songs()[static_cast<size_t>(index)].title());
    }
    return QString();
}

bool SetlistViewModel::itemHasSongMapAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].hasSongMap();
    }
    return false;
}

QString SetlistViewModel::backgroundVideoPathAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return QString::fromStdString(m_impl->serviceOrder.songs()[static_cast<size_t>(index)].backgroundVideoPath());
    }
    return QString();
}

bool SetlistViewModel::addSongFolder(const QString& folderPath) {
    std::string pathStr = folderPath.toStdString();
#else
std::string SetlistViewModel::itemNameAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].title();
    }
    return std::string();
}

bool SetlistViewModel::itemHasSongMapAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].hasSongMap();
    }
    return false;
}

std::string SetlistViewModel::backgroundVideoPathAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].backgroundVideoPath();
    }
    return std::string();
}

bool SetlistViewModel::addSongFolder(const std::string& pathStr) {
#endif
    Core::SongMap song = m_impl->folderService->loadSongFromFolder(pathStr);
    if (!song.title().empty()) {
        m_impl->serviceOrder.addSong(song);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit itemCountChanged(itemCount());
#endif
        if (m_impl->currentSongIndex == -1) {
            setCurrentSongIndex(0);
        }
        return true;
    }
    return false;
}

void SetlistViewModel::removeSongAt(int index) {
    if (index >= 0 && index < itemCount()) {
        m_impl->serviceOrder.removeSongAt(static_cast<size_t>(index));
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit itemCountChanged(itemCount());
#endif
        if (m_impl->currentSongIndex >= itemCount()) {
            setCurrentSongIndex(itemCount() - 1);
        }
    }
}

void SetlistViewModel::clearSetlist() {
    m_impl->serviceOrder.clearAll();
    m_impl->currentSongIndex = -1;
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit itemCountChanged(0);
    emit currentSongIndexChanged(-1);
    emit activeSongMapChanged(false);
#endif
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString SetlistViewModel::currentLyricsContent() const {
    if (m_impl->currentSongIndex >= 0 && m_impl->currentSongIndex < itemCount()) {
        return QString::fromStdString(m_impl->serviceOrder.songs()[static_cast<size_t>(m_impl->currentSongIndex)].lyricsContent());
    }
    return QString();
}
QString SetlistViewModel::activeLyricText() const {
    return QString::fromStdString(m_impl->activeLyricText);
}
QString SetlistViewModel::nextLyricText() const {
    return QString::fromStdString(m_impl->nextLyricText);
}
QString SetlistViewModel::playlistUrl() const {
    return QString::fromStdString(m_impl->serviceOrder.playlistUrl());
}
void SetlistViewModel::setActiveLyricIndex(int index) {
    if (m_impl->activeLyricIndex != index) {
        m_impl->activeLyricIndex = index;
        m_impl->calculateActiveLyrics();
        emit activeLyricIndexChanged(index);
        emit activeLyricTextChanged();
        emit nextLyricTextChanged();
    }
}
#else
std::string SetlistViewModel::currentLyricsContent() const {
    if (m_impl->currentSongIndex >= 0 && m_impl->currentSongIndex < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(m_impl->currentSongIndex)].lyricsContent();
    }
    return std::string();
}
std::string SetlistViewModel::activeLyricText() const {
    return m_impl->activeLyricText;
}
std::string SetlistViewModel::nextLyricText() const {
    return m_impl->nextLyricText;
}
std::string SetlistViewModel::playlistUrl() const {
    return m_impl->serviceOrder.playlistUrl();
}
void SetlistViewModel::setActiveLyricIndex(int index) {
    if (m_impl->activeLyricIndex != index) {
        m_impl->activeLyricIndex = index;
        m_impl->calculateActiveLyrics();
    }
}
#endif
#ifdef HARMONYSYNC_QT_AVAILABLE
bool SetlistViewModel::autoLyricsEnabled() const noexcept {
    return m_impl->autoLyricsEnabled;
}

void SetlistViewModel::setAutoLyricsEnabled(bool enabled) {
    if (m_impl->autoLyricsEnabled != enabled) {
        m_impl->autoLyricsEnabled = enabled;
        emit autoLyricsEnabledChanged(enabled);
    }
}

bool SetlistViewModel::isGeneratingTimestamps() const noexcept {
    return m_impl->isGeneratingTimestamps;
}

void SetlistViewModel::generateAITimestamps(const QString& referenceStemName) {
    if (m_impl->currentSongIndex < 0 || m_impl->isGeneratingTimestamps) return;
    
    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndex];
    std::string referenceAudioPath;
    std::string multitrackAudioPath;

    // Find the reference track
    for (const auto& stem : song.stems()) {
        std::string lowerStem = stem.name();
        std::transform(lowerStem.begin(), lowerStem.end(), lowerStem.begin(), ::tolower);
        std::string lowerRef = referenceStemName.toStdString();
        std::transform(lowerRef.begin(), lowerRef.end(), lowerRef.begin(), ::tolower);
        if (lowerStem.find(lowerRef) != std::string::npos) {
            referenceAudioPath = stem.filePath();
            break;
        }
    }

    // Find a multitrack (click, guide, split, or stereo) to align against
    for (const auto& stem : song.stems()) {
        std::string lowerStem = stem.name();
        std::transform(lowerStem.begin(), lowerStem.end(), lowerStem.begin(), ::tolower);
        if (lowerStem.find("click") != std::string::npos ||
            lowerStem.find("guide") != std::string::npos ||
            lowerStem.find("split") != std::string::npos ||
            lowerStem.find("stereo") != std::string::npos) {
            multitrackAudioPath = stem.filePath();
            break;
        }
    }
    
    if (referenceAudioPath.empty() || multitrackAudioPath.empty()) {
        std::cerr << "Reference or multitrack stem not found." << std::endl;
        return;
    }

    m_impl->isGeneratingTimestamps = true;
    emit isGeneratingTimestampsChanged(true);

    auto onSuccess = [this](std::vector<Core::TimedLyricLine> lines) {
        m_impl->isGeneratingTimestamps = false;
        if (m_impl->currentSongIndex >= 0) {
            Core::SongMap songCopy = m_impl->serviceOrder.songs()[m_impl->currentSongIndex];
            songCopy.setTimedLyrics(lines);
            m_impl->serviceOrder.updateSongAt(m_impl->currentSongIndex, songCopy);
            if (m_impl->folderService) {
                Core::FolderService::saveSongMap(songCopy);
            }
        }
        emit isGeneratingTimestampsChanged(false);
    };

    auto onError = [this](std::string error) {
        std::cerr << "AI Lyric Sync failed: " << error << std::endl;
        m_impl->isGeneratingTimestamps = false;
        emit isGeneratingTimestampsChanged(false);
    };

    m_impl->aiSyncService->generateTimestamps(referenceAudioPath, multitrackAudioPath, song.lyricsContent(), onSuccess, onError);
}

void SetlistViewModel::syncToPlaybackPosition(double positionSeconds) {
    if (!m_impl->autoLyricsEnabled || m_impl->currentSongIndex < 0) return;
    
    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndex];
    auto timedLyrics = song.timedLyrics();
    if (timedLyrics.empty()) return;

    int timedIndex = -1;
    for (size_t i = 0; i < timedLyrics.size(); ++i) {
        if (timedLyrics[i].timestampSeconds <= positionSeconds) {
            timedIndex = static_cast<int>(i);
        } else {
            break;
        }
    }
    
    if (timedIndex >= 0) {
        if (timedIndex != m_impl->activeLyricIndex) {
            setActiveLyricIndex(timedIndex);
        }
    }
}
#else
bool SetlistViewModel::autoLyricsEnabled() const noexcept {
    return m_impl->autoLyricsEnabled;
}

void SetlistViewModel::setAutoLyricsEnabled(bool enabled) {
    m_impl->autoLyricsEnabled = enabled;
}

bool SetlistViewModel::isGeneratingTimestamps() const noexcept {
    return m_impl->isGeneratingTimestamps;
}

void SetlistViewModel::generateAITimestamps(const std::string& referenceStemName) {
    if (m_impl->currentSongIndex < 0 || m_impl->isGeneratingTimestamps) return;
    
    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndex];
    std::string referenceAudioPath;
    std::string multitrackAudioPath;

    for (const auto& stem : song.stems()) {
        std::string lowerStem = stem.name();
        std::transform(lowerStem.begin(), lowerStem.end(), lowerStem.begin(), ::tolower);
        std::string lowerRef = referenceStemName;
        std::transform(lowerRef.begin(), lowerRef.end(), lowerRef.begin(), ::tolower);
        if (lowerStem.find(lowerRef) != std::string::npos) {
            referenceAudioPath = stem.filePath();
            break;
        }
    }
    
    for (const auto& stem : song.stems()) {
        std::string lowerStem = stem.name();
        std::transform(lowerStem.begin(), lowerStem.end(), lowerStem.begin(), ::tolower);
        if (lowerStem.find("click") != std::string::npos ||
            lowerStem.find("guide") != std::string::npos ||
            lowerStem.find("split") != std::string::npos ||
            lowerStem.find("stereo") != std::string::npos) {
            multitrackAudioPath = stem.filePath();
            break;
        }
    }

    if (referenceAudioPath.empty() || multitrackAudioPath.empty()) return;

    m_impl->isGeneratingTimestamps = true;

    auto onSuccess = [this](std::vector<Core::TimedLyricLine> lines) {
        m_impl->isGeneratingTimestamps = false;
        if (m_impl->currentSongIndex >= 0) {
            Core::SongMap songCopy = m_impl->serviceOrder.songs()[m_impl->currentSongIndex];
            songCopy.setTimedLyrics(lines);
            m_impl->serviceOrder.updateSongAt(m_impl->currentSongIndex, songCopy);
            if (m_impl->folderService) {
                Core::FolderService::saveSongMap(songCopy);
            }
        }
    };

    auto onError = [this](std::string error) {
        m_impl->isGeneratingTimestamps = false;
    };

    m_impl->aiSyncService->generateTimestamps(referenceAudioPath, multitrackAudioPath, song.lyricsContent(), onSuccess, onError);
}

void SetlistViewModel::syncToPlaybackPosition(double positionSeconds) {
    if (!m_impl->autoLyricsEnabled || m_impl->currentSongIndex < 0) return;
    
    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndex];
    auto timedLyrics = song.timedLyrics();
    if (timedLyrics.empty()) return;

    int timedIndex = -1;
    for (size_t i = 0; i < timedLyrics.size(); ++i) {
        if (timedLyrics[i].timestampSeconds <= positionSeconds) {
            timedIndex = static_cast<int>(i);
        } else {
            break;
        }
    }
    
    if (timedIndex >= 0) {
        int currentTimedIdx = 0;
        int mappedBlockIndex = -1;
        for (size_t b = 0; b < m_impl->lyricBlocks.size(); ++b) {
            int linesInBlock = 0;
            std::istringstream stream(m_impl->lyricBlocks[b]);
            std::string line;
            while (std::getline(stream, line)) {
                if (!line.empty()) linesInBlock++;
            }
            if (timedIndex >= currentTimedIdx && timedIndex < currentTimedIdx + linesInBlock) {
                mappedBlockIndex = static_cast<int>(b);
                break;
            }
            currentTimedIdx += linesInBlock;
        }

        if (mappedBlockIndex >= 0 && mappedBlockIndex != m_impl->activeLyricIndex) {
            setActiveLyricIndex(mappedBlockIndex);
        }
    }
}
#endif

int SetlistViewModel::activeLyricIndex() const noexcept {
    return m_impl->activeLyricIndex;
}

} // namespace HarmonySync::ViewModels
