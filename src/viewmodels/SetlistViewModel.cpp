#include "SetlistViewModel.hpp"
#include "ServiceOrderFolderScanner.hpp"
#include "AILyricSyncService.hpp"
#include <utility>
#include <algorithm>
#include <iostream>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonParseError>
#include <QFile>
#include <filesystem>
#endif

namespace HarmonySync::ViewModels {

struct SetlistViewModel::Impl {
    Core::ServiceOrder serviceOrder;
    std::shared_ptr<Core::FolderService> folderService;
    Core::ServiceOrderFolderScanner scanner;
    AITimestampGenerator aiTimestampGenerator;
    std::string titleStr{"Sunday Service Order"};
    int currentSongIndex{-1};
    bool isLoading{false};
    bool autoLyricsEnabled{false};
    bool isGeneratingTimestamps{false};
    std::string aiSyncProgressMessage;

    int activeLyricIndex{-1};
    std::string activeLyricText;
    std::string nextLyricText;
    std::vector<std::string> lyricBlocks;

    [[nodiscard]] size_t currentSongIndexAsSize() const { return static_cast<size_t>(currentSongIndex); }

    [[nodiscard]] bool hasCurrentSong() const {
        return currentSongIndex >= 0 && currentSongIndexAsSize() < serviceOrder.songs().size();
    }

    void updateLyricBlocks() {
        lyricBlocks.clear();
        if (!hasCurrentSong()) {
            return;
        }

        std::string raw = serviceOrder.songs()[currentSongIndexAsSize()].lyricsContent();
        std::istringstream stream(raw);
        std::string line;
        std::string currentBlock;
        int lineCount = 0;

        auto trim = [](std::string& s) {
            s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](unsigned char ch) { return !std::isspace(ch); }));
            s.erase(std::find_if(s.rbegin(), s.rend(), [](unsigned char ch) { return !std::isspace(ch); }).base(),
                    s.end());
        };

        auto toLower = [](std::string s) {
            std::transform(s.begin(), s.end(), s.begin(), ::tolower);
            return s;
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

            std::string lowerLine = toLower(line);
            if (lowerLine.starts_with("title:") || lowerLine.starts_with("artist:") || lowerLine.starts_with("bpm:") ||
                lowerLine.starts_with("key:") || lowerLine.starts_with("original key:") ||
                lowerLine.starts_with("timing:") || lowerLine.starts_with("length:") ||
                lowerLine.starts_with("chords:") || lowerLine.starts_with("lyricsurl:") ||
                lowerLine.starts_with("backgroundvideo:")) {
                continue;
            }

            if (!line.empty() && line.front() == '[' && line.back() == ']') {
                if (lowerLine.find("chords:") != std::string::npos) {
                    continue;
                }

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

        if (activeLyricIndex >= 0 && static_cast<size_t>(activeLyricIndex) < lyricBlocks.size()) {
            const auto activeIndex = static_cast<size_t>(activeLyricIndex);
            activeLyricText = lyricBlocks[activeIndex];
            // Find next non-header block
            for (size_t i = activeIndex + 1; i < lyricBlocks.size(); ++i) {
                if (!lyricBlocks[i].empty() && lyricBlocks[i].front() != '[') {
                    nextLyricText = lyricBlocks[i];
                    break;
                }
            }
        }
    }

    explicit Impl(std::shared_ptr<Core::FolderService> fs, AITimestampGenerator generator)
        : folderService(std::move(fs))
        , scanner(folderService)
        , aiTimestampGenerator(std::move(generator)) {
        if (!folderService) {
            folderService = std::make_shared<Core::FolderService>();
        }
        if (!aiTimestampGenerator) {
            auto service = std::make_shared<Core::AILyricSyncService>();
            aiTimestampGenerator =
                [service = std::move(service)](
                    const std::string& referencePath, const std::string& multitrackPath, const std::string& lyrics,
                    std::function<void(std::vector<Core::TimedLyricLine>)> onSuccess,
                    std::function<void(std::string)> onError, std::function<void(std::string)> onProgress) {
                    service->generateTimestamps(referencePath, multitrackPath, lyrics, std::move(onSuccess),
                                                std::move(onError), std::move(onProgress));
                };
        }
    }
};

SetlistViewModel::SetlistViewModel(std::shared_ptr<Core::FolderService> folderService,
                                   AITimestampGenerator aiTimestampGenerator)
    : m_impl(std::make_unique<Impl>(std::move(folderService), std::move(aiTimestampGenerator))) {}

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
        emit activeSongMapChanged(hasActiveSongMap());
        emit currentSongIndexChanged(index);
        emit currentLyricsContentChanged();
        emit activeLyricIndexChanged(m_impl->activeLyricIndex);
        emit activeLyricTextChanged();
        emit nextLyricTextChanged();
        emit playlistUrlChanged();
        emit currentSongMapJsonChanged();
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
        const auto& song = m_impl->serviceOrder.songs()[static_cast<size_t>(index)];
        auto stems = song.stems();
        if (!song.folderPath().empty() && !stems.empty()) {
            Core::FolderService::applyMixState(song.folderPath(), stems);
        }
        return stems;
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
        emit serviceOrderOpened();
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
    if (!m_impl->folderService->isSongFolder(pathStr)) {
        return false;
    }
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
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit songRemovalStarted(index);
#endif
        m_impl->serviceOrder.removeSongAt(static_cast<size_t>(index));
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit itemCountChanged(itemCount());
#endif
        if (index < m_impl->currentSongIndex) {
            // An earlier song went: the same song stays selected, one place up.
            --m_impl->currentSongIndex;
#ifdef HARMONYSYNC_QT_AVAILABLE
            emit currentSongIndexChanged(m_impl->currentSongIndex);
#endif
        } else if (m_impl->currentSongIndex >= itemCount()) {
            setCurrentSongIndex(itemCount() - 1);
        }
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit songRemoved(index);
#endif
    }
}

void SetlistViewModel::clearSetlist() {
    m_impl->serviceOrder.clearAll();
    m_impl->currentSongIndex = -1;
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit itemCountChanged(0);
    emit currentSongIndexChanged(-1);
    emit activeSongMapChanged(false);
    emit setlistCleared();
#endif
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString SetlistViewModel::currentLyricsContent() const {
    if (m_impl->currentSongIndex >= 0 && m_impl->currentSongIndex < itemCount()) {
        return QString::fromStdString(
            m_impl->serviceOrder.songs()[static_cast<size_t>(m_impl->currentSongIndex)].lyricsContent());
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
    if (!m_impl->hasCurrentSong() || m_impl->isGeneratingTimestamps) {
        return;
    }

    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndexAsSize()];
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
        if (lowerStem.find("click") != std::string::npos || lowerStem.find("guide") != std::string::npos ||
            lowerStem.find("split") != std::string::npos || lowerStem.find("stereo") != std::string::npos) {
            multitrackAudioPath = stem.filePath();
            break;
        }
    }

    if (referenceAudioPath.empty() || multitrackAudioPath.empty()) {
        std::cerr << "Reference or multitrack stem not found.\n";
        m_impl->aiSyncProgressMessage =
            "Error: Missing 'reference' audio or multitrack stem (Click/Guide/Split/Stereo).";
        emit aiSyncProgressMessageChanged();

        m_impl->isGeneratingTimestamps = true;
        emit isGeneratingTimestampsChanged(true);
        m_impl->isGeneratingTimestamps = false;
        emit isGeneratingTimestampsChanged(false);
        return;
    }

    m_impl->isGeneratingTimestamps = true;
    m_impl->aiSyncProgressMessage = "Initializing AI Sync...";
    emit isGeneratingTimestampsChanged(true);
    emit aiSyncProgressMessageChanged();

    // Construct a pure lyrics string (no metadata, no section headers) to send to AI
    std::string cleanLyrics;
    for (const auto& sec : song.sections()) {
        for (const auto& line : sec.lines) {
            cleanLyrics += line.text + "\n";
        }
    }

    auto onSuccess = [this](std::vector<Core::TimedLyricLine> lines) {
        if (m_impl->hasCurrentSong()) {
            Core::SongMap songCopy = m_impl->serviceOrder.songs()[m_impl->currentSongIndexAsSize()];

            // Map AI output directly into sections
            auto sections = songCopy.sections();
            size_t flatIndex = 0;
            for (auto& sec : sections) {
                for (auto& line : sec.lines) {
                    if (flatIndex < lines.size()) {
                        line.timestampSeconds = lines[flatIndex].timestampSeconds;
                        flatIndex++;
                    }
                }
            }
            songCopy.setSections(sections);
            songCopy.setTimedLyrics({}); // Clear out the deprecated timedLyrics array

            m_impl->serviceOrder.updateSongAt(m_impl->currentSongIndexAsSize(), songCopy);
            if (m_impl->folderService) {
                Core::FolderService::saveSongMap(songCopy);
            }
        }

        m_impl->aiSyncProgressMessage = "Success: Lyrics aligned!";
        emit aiSyncProgressMessageChanged();

        m_impl->isGeneratingTimestamps = false;
        emit isGeneratingTimestampsChanged(false);
    };

    auto onError = [this](const std::string& error) {
        std::cerr << "AI Lyric Sync failed: " << error << '\n';
        m_impl->isGeneratingTimestamps = false;
        m_impl->aiSyncProgressMessage = "Error: " + error;
        emit aiSyncProgressMessageChanged();
        emit isGeneratingTimestampsChanged(false);
    };

    auto onProgress = [this](std::string msg) {
        m_impl->aiSyncProgressMessage = std::move(msg);
        emit aiSyncProgressMessageChanged();
    };

    m_impl->aiTimestampGenerator(referenceAudioPath, multitrackAudioPath, cleanLyrics, std::move(onSuccess),
                                 std::move(onError), std::move(onProgress));
}

QString SetlistViewModel::aiSyncProgressMessage() const {
    return QString::fromStdString(m_impl->aiSyncProgressMessage);
}

QString SetlistViewModel::currentSongMapJson() const {
    if (!m_impl->hasCurrentSong()) {
        return QString();
    }

    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndexAsSize()];
    std::string folderPath = song.folderPath();
    if (folderPath.empty()) {
        return QString();
    }

    std::filesystem::path jsonPath = std::filesystem::path(folderPath) / "song-map.json";
    if (std::filesystem::exists(jsonPath)) {
        QFile file(QString::fromStdString(jsonPath.string()));
        if (file.open(QIODevice::ReadOnly)) {
            return QString::fromUtf8(file.readAll());
        }
    }

    // Default template if missing
    std::filesystem::path templatePath = std::filesystem::current_path() / "song-map-template.json";
    if (std::filesystem::exists(templatePath)) {
        QFile templateFile(QString::fromStdString(templatePath.string()));
        if (templateFile.open(QIODevice::ReadOnly)) {
            QString templateStr = QString::fromUtf8(templateFile.readAll());
            templateStr.replace("\"Song Title\"", "\"" + QString::fromStdString(song.title()) + "\"");
            return templateStr;
        }
    }

    return "{\n  \"title\": \"" + QString::fromStdString(song.title()) + "\",\n  \"sections\": []\n}";
}

bool SetlistViewModel::saveSongMapJson(const QString& jsonString) {
    if (!m_impl->hasCurrentSong()) {
        return false;
    }

    QJsonParseError error;
    QJsonDocument doc = QJsonDocument::fromJson(jsonString.toUtf8(), &error);

    if (error.error != QJsonParseError::NoError) {
        // Return false to indicate failure. UI can parse the string again to get exact error.
        return false;
    }

    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndexAsSize()];
    std::string folderPath = song.folderPath();
    if (folderPath.empty()) {
        return false;
    }

    std::filesystem::path jsonPath = std::filesystem::path(folderPath) / "song-map.json";
    QFile file(QString::fromStdString(jsonPath.string()));
    if (file.open(QIODevice::WriteOnly | QIODevice::Text)) {
        file.write(doc.toJson(QJsonDocument::Indented));
        file.close();

        // Reload the song from folder to apply changes
        if (m_impl->folderService) {
            Core::SongMap updatedSong = m_impl->folderService->loadSongFromFolder(folderPath);
            m_impl->serviceOrder.updateSongAt(m_impl->currentSongIndexAsSize(), updatedSong);

            // Trigger updates
            emit titleChanged(QString::fromStdString(updatedSong.title()));
            m_impl->updateLyricBlocks();
            m_impl->calculateActiveLyrics();
            emit currentLyricsContentChanged();
            emit activeLyricTextChanged();
            emit nextLyricTextChanged();
            emit activeSongMapChanged(hasActiveSongMap());
            emit currentSongMapJsonChanged();
        }
        return true;
    }
    return false;
}

void SetlistViewModel::syncToPlaybackPosition(double positionSeconds) {
    if (!m_impl->autoLyricsEnabled || !m_impl->hasCurrentSong()) {
        return;
    }

    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndexAsSize()];
    const auto& timedLyrics = song.timedLyrics();
    if (!timedLyrics.empty()) {
        int timedIndex = -1;
        for (size_t i = 0; i < timedLyrics.size(); ++i) {
            if (timedLyrics[i].timestampSeconds <= positionSeconds) {
                timedIndex = static_cast<int>(i);
            } else {
                break;
            }
        }

        if (timedIndex >= 0) {
            const std::string& targetText = timedLyrics[static_cast<size_t>(timedIndex)].text;
            int mappedBlockIndex = -1;
            for (size_t b = 0; b < m_impl->lyricBlocks.size(); ++b) {
                if (m_impl->lyricBlocks[b] == targetText ||
                    m_impl->lyricBlocks[b].find(targetText) != std::string::npos) {
                    mappedBlockIndex = static_cast<int>(b);
                    break;
                }
            }

            if (mappedBlockIndex >= 0 && mappedBlockIndex != m_impl->activeLyricIndex) {
                setActiveLyricIndex(mappedBlockIndex);
            }
        }
        return;
    }

    auto sections = song.sections();
    if (sections.empty()) {
        return;
    }

    // Create a flat array of timestamps mapping to the raw lyric lines
    std::vector<double> flatTimestamps;
    for (const auto& sec : sections) {
        for (const auto& line : sec.lines) {
            flatTimestamps.push_back(line.timestampSeconds);
        }
    }

    if (flatTimestamps.empty()) {
        return;
    }

    int timedIndex = -1;
    for (size_t i = 0; i < flatTimestamps.size(); ++i) {
        if (flatTimestamps[i] <= positionSeconds && flatTimestamps[i] > 0.0) {
            timedIndex = static_cast<int>(i);
        } else if (flatTimestamps[i] > positionSeconds) {
            break;
        }
    }

    if (timedIndex >= 0) {
        int currentTimedIdx = 0;
        int mappedBlockIndex = -1;
        for (size_t b = 0; b < m_impl->lyricBlocks.size(); ++b) {
            if (m_impl->lyricBlocks[b].size() >= 2 && m_impl->lyricBlocks[b].front() == '[' &&
                m_impl->lyricBlocks[b].back() == ']') {
                continue;
            }
            int linesInBlock = 0;
            std::istringstream stream(m_impl->lyricBlocks[b]);
            std::string line;
            while (std::getline(stream, line)) {
                if (!line.empty()) {
                    linesInBlock++;
                }
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
    if (!m_impl->hasCurrentSong() || m_impl->isGeneratingTimestamps)
        return;

    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndexAsSize()];
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
        if (lowerStem.find("click") != std::string::npos || lowerStem.find("guide") != std::string::npos ||
            lowerStem.find("split") != std::string::npos || lowerStem.find("stereo") != std::string::npos) {
            multitrackAudioPath = stem.filePath();
            break;
        }
    }

    if (referenceAudioPath.empty() || multitrackAudioPath.empty())
        return;

    m_impl->isGeneratingTimestamps = true;

    auto onSuccess = [this](std::vector<Core::TimedLyricLine> lines) {
        m_impl->isGeneratingTimestamps = false;
        if (m_impl->hasCurrentSong()) {
            Core::SongMap songCopy = m_impl->serviceOrder.songs()[m_impl->currentSongIndexAsSize()];
            songCopy.setTimedLyrics(lines);
            m_impl->serviceOrder.updateSongAt(m_impl->currentSongIndexAsSize(), songCopy);
            if (m_impl->folderService) {
                Core::FolderService::saveSongMap(songCopy);
            }
        }
    };

    auto onError = [this](std::string error) { m_impl->isGeneratingTimestamps = false; };

    m_impl->aiTimestampGenerator(referenceAudioPath, multitrackAudioPath, song.lyricsContent(), std::move(onSuccess),
                                 std::move(onError), nullptr);
}

std::string SetlistViewModel::currentSongMapJson() const {
    return "";
}

bool SetlistViewModel::saveSongMapJson(const std::string& jsonString) {
    return false;
}

void SetlistViewModel::syncToPlaybackPosition(double positionSeconds) {
    if (!m_impl->autoLyricsEnabled || !m_impl->hasCurrentSong())
        return;

    auto& song = m_impl->serviceOrder.songs()[m_impl->currentSongIndexAsSize()];
    auto timedLyrics = song.timedLyrics();
    if (timedLyrics.empty())
        return;

    int timedIndex = -1;
    for (size_t i = 0; i < timedLyrics.size(); ++i) {
        if (timedLyrics[i].timestampSeconds <= positionSeconds) {
            timedIndex = static_cast<int>(i);
        } else {
            break;
        }
    }

    if (timedIndex >= 0) {
        const std::string& targetText = timedLyrics[static_cast<size_t>(timedIndex)].text;
        int mappedBlockIndex = -1;
        for (size_t b = 0; b < m_impl->lyricBlocks.size(); ++b) {
            if (m_impl->lyricBlocks[b] == targetText || m_impl->lyricBlocks[b].find(targetText) != std::string::npos) {
                mappedBlockIndex = static_cast<int>(b);
                break;
            }
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
