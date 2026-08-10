#include "FolderService.hpp"
#include <algorithm>
#include <fstream>
#include <sstream>

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

} // namespace HarmonySync::Core
