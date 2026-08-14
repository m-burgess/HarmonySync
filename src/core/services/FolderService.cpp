#include "FolderService.hpp"
#include <algorithm>
#include <fstream>
#include <sstream>

#if __has_include(<QJsonDocument>)
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QFile>
#endif

namespace HarmonySync::Core {

namespace {

bool isAudioExtension(const std::string& ext) {
    std::string lowerExt = ext;
    std::transform(lowerExt.begin(), lowerExt.end(), lowerExt.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return (lowerExt == ".wav" || lowerExt == ".mp3" || lowerExt == ".ogg" || lowerExt == ".flac" || lowerExt == ".m4a");
}

bool isImageExtension(const std::string& ext) {
    std::string lowerExt = ext;
    std::transform(lowerExt.begin(), lowerExt.end(), lowerExt.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return (lowerExt == ".jpg" || lowerExt == ".jpeg" || lowerExt == ".png" || lowerExt == ".webp");
}

bool isVideoExtension(const std::string& ext) {
    std::string lowerExt = ext;
    std::transform(lowerExt.begin(), lowerExt.end(), lowerExt.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return (lowerExt == ".mp4" || lowerExt == ".mkv" || lowerExt == ".webm" || lowerExt == ".mov");
}

} // namespace

struct FolderService::Impl {
    std::shared_ptr<ConfigService> configService;

    Impl()
        : configService(std::make_shared<ConfigService>())
    {}

    explicit Impl(std::shared_ptr<ConfigService> cfgSvc)
        : configService(std::move(cfgSvc))
    {
        if (!configService) {
            configService = std::make_shared<ConfigService>();
        }
    }
};

FolderService::FolderService()
    : m_impl(std::make_unique<Impl>())
{}

FolderService::FolderService(std::shared_ptr<ConfigService> configService)
    : m_impl(std::make_unique<Impl>(std::move(configService)))
{}

FolderService::~FolderService() = default;

FolderService::FolderService(FolderService&&) noexcept = default;
FolderService& FolderService::operator=(FolderService&&) noexcept = default;

bool FolderService::isSongFolder(const std::filesystem::path& folderPath) const {
    if (!std::filesystem::exists(folderPath) || !std::filesystem::is_directory(folderPath)) {
        return false;
    }

    for (const auto& entry : std::filesystem::directory_iterator(folderPath)) {
        if (entry.is_regular_file() && isAudioExtension(entry.path().extension().string())) {
            return true;
        }
    }
    return false;
}

SongMap FolderService::loadSongFromFolder(const std::filesystem::path& folderPath) const {
    std::string folderName = folderPath.filename().string();
    SongMap song(folderName, folderName, "Unknown Artist");
    song.setFolderPath(folderPath.string());

    if (!std::filesystem::exists(folderPath) || !std::filesystem::is_directory(folderPath)) {
        return song;
    }

    // Convert lyrics if needed
    convertLyricsToSongMap(folderPath);

#if __has_include(<QJsonDocument>)
    std::filesystem::path jsonPath = folderPath / "song-map.json";
    if (std::filesystem::exists(jsonPath)) {
        QFile file(QString::fromStdString(jsonPath.string()));
        if (file.open(QIODevice::ReadOnly)) {
            QByteArray data = file.readAll();
            QJsonDocument doc = QJsonDocument::fromJson(data);
            if (doc.isObject()) {
                QJsonObject obj = doc.object();
                if (obj.contains("title")) {
                    song = SongMap(folderName, obj["title"].toString().toStdString(), 
                                   obj.contains("artist") ? obj["artist"].toString().toStdString() : "Unknown Artist");
                    song.setFolderPath(folderPath.string());
                }
                
                if (obj.contains("backgroundVideo")) {
                    std::string bgVideo = obj["backgroundVideo"].toString().toStdString();
                    if (!bgVideo.empty()) {
                        std::filesystem::path bgPath = folderPath / bgVideo;
                        song.setBackgroundVideoPath(bgPath.string());
                    }
                }

                if (obj.contains("sections")) {
                    QJsonArray sections = obj["sections"].toArray();
                    std::string lyricsContent;
                    for (int i = 0; i < sections.size(); ++i) {
                        QJsonObject section = sections[i].toObject();
                        if (section.contains("name")) {
                            lyricsContent += "[" + section["name"].toString().toStdString() + "]\n";
                        }
                        if (section.contains("lines")) {
                            QJsonArray lines = section["lines"].toArray();
                            for (int j = 0; j < lines.size(); ++j) {
                                lyricsContent += lines[j].toString().toStdString() + "\n";
                            }
                        }
                        lyricsContent += "\n";
                    }
                    song.setLyricsContent(lyricsContent);
                }

                if (obj.contains("timedLyrics")) {
                    QJsonArray tLyrics = obj["timedLyrics"].toArray();
                    std::vector<TimedLyricLine> timedLines;
                    for (int i = 0; i < tLyrics.size(); ++i) {
                        QJsonObject tLine = tLyrics[i].toObject();
                        if (tLine.contains("time") && tLine.contains("text")) {
                            timedLines.push_back({ tLine["time"].toDouble(), tLine["text"].toString().toStdString() });
                        }
                    }
                    song.setTimedLyrics(timedLines);
                }
            }
        }
    }
#endif

    // Load config.json if present
    ServiceItemConfig cfg = m_impl->configService->loadConfigFromDirectory(folderPath);

    int stemCount = 0;
    std::vector<MediaStem> loadedStems;

    for (const auto& entry : std::filesystem::directory_iterator(folderPath)) {
        if (!entry.is_regular_file()) {
            continue;
        }

        std::string ext = entry.path().extension().string();
        std::string stemName = entry.path().stem().string();

        if (isAudioExtension(ext)) {
            stemCount++;
            MediaStem stem(std::to_string(stemCount), stemName, entry.path().string());
            
            // Apply Panning Rules
            std::string lowerName = stemName;
            std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
            
            if (lowerName.find("click") != std::string::npos) {
                stem.setPan(-1.0f);
            } else if (lowerName.find("guide") != std::string::npos) {
                stem.setPan(-1.0f);
            } else if (lowerName.find("split") != std::string::npos || lowerName.find("stereo") != std::string::npos) {
                stem.setPan(0.0f);
            } else {
                stem.setPan(1.0f);
            }
            
            loadedStems.push_back(std::move(stem));
        } else if (stemName == "lyrics" || ext == ".txt") {
            std::ifstream lyricsFile(entry.path());
            if (lyricsFile.is_open()) {
                std::stringstream ss;
                ss << lyricsFile.rdbuf();
                song.setLyricsContent(ss.str());
            }
        } else if (isVideoExtension(ext)) {
            song.setBackgroundVideoPath(entry.path().string());
        }
    }

    if (!loadedStems.empty()) {
        auto getPriority = [](const std::string& name) {
            std::string lowerName = name;
            std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
            if (lowerName.find("click") != std::string::npos) return 0;
            if (lowerName.find("guide") != std::string::npos) return 1;
            return 2;
        };

        std::sort(loadedStems.begin(), loadedStems.end(), [&getPriority](const MediaStem& a, const MediaStem& b) {
            int pA = getPriority(a.name());
            int pB = getPriority(b.name());
            if (pA != pB) return pA < pB;
            
            std::string nameA = a.name();
            std::string nameB = b.name();
            std::transform(nameA.begin(), nameA.end(), nameA.begin(), ::tolower);
            std::transform(nameB.begin(), nameB.end(), nameB.begin(), ::tolower);
            return nameA < nameB;
        });

        // Apply any saved mix state overrides
        applyMixState(folderPath.string(), loadedStems);

        // Reassign IDs and add to song
        for (size_t i = 0; i < loadedStems.size(); ++i) {
            MediaStem finalStem(std::to_string(i + 1), loadedStems[i].name(), loadedStems[i].filePath());
            finalStem.setPan(loadedStems[i].pan());
            finalStem.setVolume(loadedStems[i].volume());
            finalStem.setMuted(loadedStems[i].isMuted());
            finalStem.setSolo(loadedStems[i].isSolo());
            finalStem.setPitchShiftSemitones(loadedStems[i].pitchShiftSemitones());
            song.addStem(std::move(finalStem));
        }
        
        song.setHasSongMap(true);
    }

    return song;
}

std::vector<SlideItem> FolderService::loadSlidesFromFolder(const std::filesystem::path& folderPath) const {
    std::vector<SlideItem> slides;
    if (!std::filesystem::exists(folderPath) || !std::filesystem::is_directory(folderPath)) {
        return slides;
    }

    ServiceItemConfig cfg = m_impl->configService->loadConfigFromDirectory(folderPath);

    int slideCount = 0;
    for (const auto& entry : std::filesystem::directory_iterator(folderPath)) {
        if (!entry.is_regular_file()) {
            continue;
        }

        std::string ext = entry.path().extension().string();
        std::string name = entry.path().stem().string();

        if (isImageExtension(ext)) {
            slideCount++;
            SlideItem item(std::to_string(slideCount), name, SlideType::Image);
            item.setContentPath(entry.path().string());
            item.setLoopImages(cfg.loopImages);
            slides.push_back(std::move(item));
        } else if (isVideoExtension(ext)) {
            slideCount++;
            SlideItem item(std::to_string(slideCount), name, SlideType::Video);
            item.setContentPath(entry.path().string());
            item.setAutoplayBackgroundVideo(cfg.autoplayBackgroundVideo);
            slides.push_back(std::move(item));
        }
    }

    // Add YouTube slide items if present in config
    for (const auto& ytUrl : cfg.youtubeLinks) {
        slideCount++;
        SlideItem ytItem(std::to_string(slideCount), "YouTube Stream", SlideType::YouTube);
        ytItem.setContentPath(ytUrl);
        slides.push_back(std::move(ytItem));
    }

    return slides;
}

void FolderService::saveMixState(const std::string& folderPath, const std::vector<MediaStem>& stems) {
#if __has_include(<QJsonDocument>)
    if (folderPath.empty() || stems.empty()) return;

    QJsonObject stemsObj;
    for (const auto& stem : stems) {
        QJsonObject stemState;
        stemState["volume"] = stem.volume();
        stemState["pan"] = stem.pan();
        stemState["muted"] = stem.isMuted();
        stemState["solo"] = stem.isSolo();
        stemState["pitchShift"] = stem.pitchShiftSemitones();
        
        stemsObj[QString::fromStdString(stem.name())] = stemState;
    }

    QJsonObject rootObj;
    rootObj["stems"] = stemsObj;

    QJsonDocument doc(rootObj);
    std::filesystem::path mixPath = std::filesystem::path(folderPath) / "mix.json";
    
    QFile file(QString::fromStdString(mixPath.string()));
    if (file.open(QIODevice::WriteOnly)) {
        file.write(doc.toJson(QJsonDocument::Indented));
    }
#endif
}

void FolderService::applyMixState(const std::string& folderPath, std::vector<MediaStem>& stems) {
#if __has_include(<QJsonDocument>)
    std::filesystem::path mixPath = std::filesystem::path(folderPath) / "mix.json";
    if (!std::filesystem::exists(mixPath)) return;

    QFile file(QString::fromStdString(mixPath.string()));
    if (!file.open(QIODevice::ReadOnly)) return;

    QByteArray data = file.readAll();
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (!doc.isObject()) return;

    QJsonObject rootObj = doc.object();
    QJsonObject stemsObj = rootObj["stems"].toObject();

    for (auto& stem : stems) {
        QString stemName = QString::fromStdString(stem.name());
        if (stemsObj.contains(stemName)) {
            QJsonObject state = stemsObj[stemName].toObject();
            if (state.contains("volume")) stem.setVolume(static_cast<float>(state["volume"].toDouble()));
            if (state.contains("pan")) stem.setPan(static_cast<float>(state["pan"].toDouble()));
            if (state.contains("muted")) stem.setMuted(state["muted"].toBool());
            if (state.contains("solo")) stem.setSolo(state["solo"].toBool());
            if (state.contains("pitchShift")) stem.setPitchShiftSemitones(state["pitchShift"].toInt());
        }
    }
#endif
}
bool FolderService::convertLyricsToSongMap(const std::filesystem::path& folderPath) {
#if __has_include(<QJsonDocument>)
    std::filesystem::path lyricsPath = folderPath / "lyrics.txt";
    std::filesystem::path jsonPath = folderPath / "song-map.json";

    if (std::filesystem::exists(jsonPath)) {
        return true; // Already converted
    }

    if (!std::filesystem::exists(lyricsPath)) {
        return false; // No lyrics to convert
    }

    std::ifstream file(lyricsPath);
    if (!file.is_open()) return false;

    QJsonObject rootObj;
    QJsonArray sectionsArray;
    
    QJsonObject currentSection;
    QString currentSectionName = "Intro";
    QJsonArray currentLines;
    
    auto finalizeSection = [&]() {
        if (!currentLines.isEmpty() || currentSectionName != "Intro") {
            currentSection["name"] = currentSectionName;
            currentSection["lines"] = currentLines;
            sectionsArray.append(currentSection);
            
            // Reset
            currentSection = QJsonObject();
            currentLines = QJsonArray();
        }
    };

    std::string line;
    while (std::getline(file, line)) {
        // Trim whitespace
        line.erase(line.begin(), std::find_if(line.begin(), line.end(), [](unsigned char ch) { return !std::isspace(ch); }));
        line.erase(std::find_if(line.rbegin(), line.rend(), [](unsigned char ch) { return !std::isspace(ch); }).base(), line.end());

        if (line.empty()) continue;

        if (line.front() == '[' && line.back() == ']') {
            finalizeSection();
            currentSectionName = QString::fromStdString(line.substr(1, line.length() - 2));
        } else {
            currentLines.append(QString::fromStdString(line));
        }
    }
    finalizeSection();

    rootObj["sections"] = sectionsArray;

    QJsonDocument doc(rootObj);
    QFile outFile(QString::fromStdString(jsonPath.string()));
    if (outFile.open(QIODevice::WriteOnly)) {
        outFile.write(doc.toJson(QJsonDocument::Indented));
        return true;
    }
#endif
    return false;
}

bool FolderService::saveSongMap(const SongMap& songMap) {
    if (songMap.folderPath().empty()) return false;
    
    std::filesystem::path jsonPath = std::filesystem::path(songMap.folderPath()) / "song-map.json";
    
#if __has_include(<QJsonDocument>)
    QJsonObject rootObj;
    
    if (std::filesystem::exists(jsonPath)) {
        QFile fileIn(QString::fromStdString(jsonPath.string()));
        if (fileIn.open(QIODevice::ReadOnly)) {
            QByteArray data = fileIn.readAll();
            QJsonDocument doc = QJsonDocument::fromJson(data);
            if (doc.isObject()) {
                rootObj = doc.object();
            }
            fileIn.close();
        }
    }
    
    rootObj["title"] = QString::fromStdString(songMap.title());
    rootObj["artist"] = QString::fromStdString(songMap.artist());
    
    auto timedLines = songMap.timedLyrics();
    if (!timedLines.empty()) {
        QJsonArray timedArray;
        for (const auto& tl : timedLines) {
            QJsonObject lineObj;
            lineObj["time"] = tl.timestampSeconds;
            lineObj["text"] = QString::fromStdString(tl.text);
            timedArray.append(lineObj);
        }
        rootObj["timedLyrics"] = timedArray;
    }

    QJsonDocument outDoc(rootObj);
    QFile fileOut(QString::fromStdString(jsonPath.string()));
    if (fileOut.open(QIODevice::WriteOnly | QIODevice::Text)) {
        fileOut.write(outDoc.toJson(QJsonDocument::Indented));
        fileOut.close();
        return true;
    }
#endif
    return false;
}

} // namespace HarmonySync::Core
