#include "FolderService.hpp"
#include <algorithm>
#include <fstream>
#include <sstream>
#include <filesystem>
#include <iostream>

namespace {
double parseTimestamp(const std::string& ts) {
    size_t colon = ts.find(':');
    if (colon == std::string::npos) {
        return std::stod(ts);
    }
    try {
        double m = std::stod(ts.substr(0, colon));
        double s = std::stod(ts.substr(colon + 1));
        return m * 60.0 + s;
    } catch (...) {
        return 0.0;
    }
}

std::string formatTimestamp(double seconds) {
    int m = static_cast<int>(seconds) / 60;
    double s = seconds - (m * 60);
    char buf[32];
    snprintf(buf, sizeof(buf), "%02d:%05.2f", m, s);
    return std::string(buf);
}
} // namespace

#if __has_include(<QJsonDocument>)
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QFile>
#include <QSaveFile>
#endif

namespace HarmonySync::Core {

namespace {

bool isAudioExtension(const std::string& ext) {
    std::string lowerExt = ext;
    std::transform(lowerExt.begin(), lowerExt.end(), lowerExt.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return (lowerExt == ".wav" || lowerExt == ".mp3" || lowerExt == ".ogg" || lowerExt == ".flac" ||
            lowerExt == ".m4a");
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
        : configService(std::make_shared<ConfigService>()) {}

    explicit Impl(std::shared_ptr<ConfigService> cfgSvc)
        : configService(std::move(cfgSvc)) {
        if (!configService) {
            configService = std::make_shared<ConfigService>();
        }
    }
};

FolderService::FolderService()
    : m_impl(std::make_unique<Impl>()) {}

FolderService::FolderService(std::shared_ptr<ConfigService> configService)
    : m_impl(std::make_unique<Impl>(std::move(configService))) {}

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

                if (obj.contains("bpm")) {
                    song.setTempoBpm(obj["bpm"].toDouble());
                }
                if (obj.contains("key")) {
                    std::string key = obj["key"].toString().toStdString();
                    song.setKeys(key, key);
                } else if (obj.contains("originalKey")) { // Fallback for older maps
                    std::string key = obj["originalKey"].toString().toStdString();
                    song.setKeys(key, key);
                }

                if (obj.contains("timing")) {
                    song.setTiming(obj["timing"].toString().toStdString());
                }
                if (obj.contains("length")) {
                    song.setLength(obj["length"].toString().toStdString());
                }
                if (obj.contains("lyricsURL")) {
                    song.setLyricsURL(obj["lyricsURL"].toString().toStdString());
                }

                if (obj.contains("backgroundVideo")) {
                    std::string bgVideo = obj["backgroundVideo"].toString().toStdString();
                    if (!bgVideo.empty()) {
                        std::filesystem::path bgPath = folderPath / bgVideo;
                        song.setBackgroundVideoPath(bgPath.string());
                    }
                }

                if (obj.contains("sections")) {
                    QJsonArray jsonSections = obj["sections"].toArray();
                    std::vector<SongSection> sections;
                    std::string lyricsContent;
                    for (int i = 0; i < jsonSections.size(); ++i) {
                        QJsonObject jsonSection = jsonSections[i].toObject();
                        SongSection section;
                        if (jsonSection.contains("name")) {
                            section.name = jsonSection["name"].toString().toStdString();
                            lyricsContent += "[" + section.name + "]\n";
                        }
                        if (jsonSection.contains("chords")) {
                            section.chords = jsonSection["chords"].toString().toStdString();
                        }
                        if (jsonSection.contains("lines")) {
                            QJsonArray lines = jsonSection["lines"].toArray();
                            for (int j = 0; j < lines.size(); ++j) {
                                SongLine sLine;
                                if (lines[j].isString()) {
                                    sLine.text = lines[j].toString().toStdString();
                                } else if (lines[j].isObject()) {
                                    QJsonObject lObj = lines[j].toObject();
                                    if (lObj.contains("text")) {
                                        sLine.text = lObj["text"].toString().toStdString();
                                    }
                                    if (lObj.contains("timestamp")) {
                                        sLine.timestampSeconds =
                                            parseTimestamp(lObj["timestamp"].toString().toStdString());
                                    } else if (lObj.contains("timestampSeconds")) {
                                        sLine.timestampSeconds = lObj["timestampSeconds"].toDouble();
                                    }
                                    if (lObj.contains("nextSlideMidiNote")) {
                                        sLine.nextSlideMidiNote = lObj["nextSlideMidiNote"].toString().toStdString();
                                    }
                                    if (lObj.contains("lightSceneMidiNote")) {
                                        sLine.lightSceneMidiNote = lObj["lightSceneMidiNote"].toString().toStdString();
                                    }
                                }
                                section.lines.push_back(sLine);
                                lyricsContent += sLine.text + "\n";
                            }
                        }
                        lyricsContent += "\n";
                        sections.push_back(section);
                    }
                    song.setSections(sections);
                    song.setLyricsContent(lyricsContent);
                }

                if (obj.contains("timedLyrics")) {
                    QJsonArray tLyrics = obj["timedLyrics"].toArray();
                    std::vector<TimedLyricLine> timedLines;
                    for (int i = 0; i < tLyrics.size(); ++i) {
                        QJsonObject tLine = tLyrics[i].toObject();
                        if (tLine.contains("time")) {
                            double t = 0.0;
                            if (tLine["time"].isString()) {
                                t = parseTimestamp(tLine["time"].toString().toStdString());
                            } else {
                                t = tLine["time"].toDouble();
                            }
                            if (tLine.contains("text")) {
                                timedLines.push_back({t, tLine["text"].toString().toStdString()});
                            }
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
    std::filesystem::path foundVideoFile;

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

            if (lowerName.find("click") != std::string::npos || lowerName.find("guide") != std::string::npos) {
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
            foundVideoFile = entry.path();
        }
    }

    if (!loadedStems.empty()) {
        auto getPriority = [](const std::string& name) {
            std::string lowerName = name;
            std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
            if (lowerName.find("click") != std::string::npos) {
                return 0;
            }
            if (lowerName.find("guide") != std::string::npos) {
                return 1;
            }
            return 2;
        };

        std::sort(loadedStems.begin(), loadedStems.end(), [&getPriority](const MediaStem& a, const MediaStem& b) {
            int pA = getPriority(a.name());
            int pB = getPriority(b.name());
            if (pA != pB) {
                return pA < pB;
            }

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
    } else if (!foundVideoFile.empty()) {
        // Non-song video folder: route video audio through the mixer/engine with a stereo stem
        // and persist its mix configuration in mix.json while keeping hasSongMap() false.
        MediaStem videoStem("1", foundVideoFile.stem().string(), foundVideoFile.string());
        videoStem.setPan(0.0f);
        videoStem.setVolume(1.0f);
        std::vector<MediaStem> videoStems{std::move(videoStem)};

        applyMixState(folderPath.string(), videoStems);
        if (!std::filesystem::exists(folderPath / "mix.json")) {
            saveMixState(folderPath.string(), videoStems);
        }

        song.addStem(std::move(videoStems[0]));
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

bool FolderService::saveMixState(const std::string& folderPath, const std::vector<MediaStem>& stems) {
#if __has_include(<QJsonDocument>)
    if (folderPath.empty() || stems.empty()) {
        return false;
    }

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
    QSaveFile file(QString::fromStdString(mixPath.string()));
    if (!file.open(QIODevice::WriteOnly)) {
        return false;
    }
    const QByteArray json = doc.toJson(QJsonDocument::Indented);
    if (file.write(json) != json.size()) {
        file.cancelWriting();
        return false;
    }
    return file.commit(); // renames over mix.json only if everything was written
#else
    (void)folderPath;
    (void)stems;
    return false;
#endif
}

void FolderService::applyMixState(const std::string& folderPath, std::vector<MediaStem>& stems) {
#if __has_include(<QJsonDocument>)
    std::filesystem::path mixPath = std::filesystem::path(folderPath) / "mix.json";
    if (!std::filesystem::exists(mixPath)) {
        return;
    }

    QFile file(QString::fromStdString(mixPath.string()));
    if (!file.open(QIODevice::ReadOnly)) {
        return;
    }

    QByteArray data = file.readAll();
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (!doc.isObject()) {
        return;
    }

    QJsonObject rootObj = doc.object();
    QJsonObject stemsObj = rootObj["stems"].toObject();

    for (auto& stem : stems) {
        QString stemName = QString::fromStdString(stem.name());
        if (stemsObj.contains(stemName)) {
            QJsonObject state = stemsObj[stemName].toObject();
            if (state.contains("volume")) {
                stem.setVolume(static_cast<float>(state["volume"].toDouble()));
            }
            if (state.contains("pan")) {
                stem.setPan(static_cast<float>(state["pan"].toDouble()));
            }
            if (state.contains("muted")) {
                stem.setMuted(state["muted"].toBool());
            }
            if (state.contains("solo")) {
                stem.setSolo(state["solo"].toBool());
            }
            if (state.contains("pitchShift")) {
                stem.setPitchShiftSemitones(state["pitchShift"].toInt());
            }
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
    if (!file.is_open()) {
        return false;
    }

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
        line.erase(line.begin(),
                   std::find_if(line.begin(), line.end(), [](unsigned char ch) { return !std::isspace(ch); }));
        line.erase(std::find_if(line.rbegin(), line.rend(), [](unsigned char ch) { return !std::isspace(ch); }).base(),
                   line.end());

        if (line.empty()) {
            continue;
        }

        if (line.starts_with("Title:")) {
            std::string titleStr = line.substr(6);
            titleStr.erase(titleStr.begin(), std::find_if(titleStr.begin(), titleStr.end(),
                                                          [](unsigned char ch) { return !std::isspace(ch); }));
            rootObj["title"] = QString::fromStdString(titleStr);
        } else if (line.starts_with("BPM:")) {
            std::string bpmStr = line.substr(4);
            bpmStr.erase(bpmStr.begin(), std::find_if(bpmStr.begin(), bpmStr.end(),
                                                      [](unsigned char ch) { return !std::isspace(ch); }));
            try {
                rootObj["bpm"] = std::stod(bpmStr);
            } catch (...) { // NOLINT(bugprone-empty-catch): an unparsable BPM line leaves the tempo unset
            }
        } else if (line.starts_with("Original Key:")) {
            std::string keyStr = line.substr(13);
            keyStr.erase(keyStr.begin(), std::find_if(keyStr.begin(), keyStr.end(),
                                                      [](unsigned char ch) { return !std::isspace(ch); }));
            rootObj["originalKey"] = QString::fromStdString(keyStr);
        } else if (line.front() == '[' && line.back() == ']') {
            std::string inner = line.substr(1, line.length() - 2);
            if (inner.starts_with("Chords:")) {
                std::string chordsStr = inner.substr(7);
                chordsStr.erase(chordsStr.begin(), std::find_if(chordsStr.begin(), chordsStr.end(),
                                                                [](unsigned char ch) { return !std::isspace(ch); }));
                currentSection["chords"] = QString::fromStdString(chordsStr);
            } else {
                finalizeSection();
                currentSectionName = QString::fromStdString(inner);
            }
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
    if (songMap.folderPath().empty()) {
        return false;
    }

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

    if (songMap.tempoBpm() > 0) {
        rootObj["bpm"] = songMap.tempoBpm();
    }

    rootObj["timing"] = QString::fromStdString(songMap.timing());
    rootObj["length"] = QString::fromStdString(songMap.length());

    if (!songMap.originalKey().empty()) {
        rootObj["key"] = QString::fromStdString(songMap.originalKey());
    } else {
        rootObj["key"] = "C";
    }

    rootObj["lyricsURL"] = QString::fromStdString(songMap.lyricsURL());

    if (!songMap.backgroundVideoPath().empty()) {
        std::filesystem::path bgPath(songMap.backgroundVideoPath());
        rootObj["backgroundVideo"] = QString::fromStdString(bgPath.filename().string());
    } else {
        rootObj["backgroundVideo"] = "";
    }

    auto timedLines = songMap.timedLyrics();
    if (!timedLines.empty()) {
        QJsonArray timedArray;
        for (const auto& tl : timedLines) {
            QJsonObject lineObj;
            lineObj["time"] = QString::fromStdString(formatTimestamp(tl.timestampSeconds));
            lineObj["text"] = QString::fromStdString(tl.text);
            timedArray.append(lineObj);
        }
        rootObj["timedLyrics"] = timedArray;
    } else {
        rootObj.remove("timedLyrics");
    }

    auto sections = songMap.sections();
    if (!sections.empty()) {
        QJsonArray sectionsArray;
        for (const auto& sec : sections) {
            QJsonObject secObj;
            if (!sec.name.empty()) {
                secObj["name"] = QString::fromStdString(sec.name);
            }
            if (!sec.chords.empty()) {
                secObj["chords"] = QString::fromStdString(sec.chords);
            }

            if (!sec.lines.empty()) {
                QJsonArray linesArray;
                for (const auto& line : sec.lines) {
                    QJsonObject lineObj;
                    lineObj["text"] = QString::fromStdString(line.text);
                    if (line.timestampSeconds > 0) {
                        lineObj["timestamp"] = QString::fromStdString(formatTimestamp(line.timestampSeconds));
                    }
                    if (!line.nextSlideMidiNote.empty()) {
                        lineObj["nextSlideMidiNote"] = QString::fromStdString(line.nextSlideMidiNote);
                    }
                    if (!line.lightSceneMidiNote.empty()) {
                        lineObj["lightSceneMidiNote"] = QString::fromStdString(line.lightSceneMidiNote);
                    }
                    linesArray.append(lineObj);
                }
                secObj["lines"] = linesArray;
            }
            sectionsArray.append(secObj);
        }
        rootObj["sections"] = sectionsArray;
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
