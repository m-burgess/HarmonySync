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
    for (const auto& entry : std::filesystem::directory_iterator(folderPath)) {
        if (!entry.is_regular_file()) {
            continue;
        }

        std::string ext = entry.path().extension().string();
        std::string stemName = entry.path().stem().string();

        if (isAudioExtension(ext)) {
            stemCount++;
            MediaStem stem(std::to_string(stemCount), stemName, entry.path().string());
            song.addStem(std::move(stem));
        } else if (stemName == "lyrics" || ext == ".txt") {
            std::ifstream lyricsFile(entry.path());
            if (lyricsFile.is_open()) {
                std::stringstream ss;
                ss << lyricsFile.rdbuf();
                song.setLyricsContent(ss.str());
            }
        }
    }

    if (stemCount > 0) {
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
