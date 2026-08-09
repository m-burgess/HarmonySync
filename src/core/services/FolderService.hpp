#ifndef HARMONYSYNC_FOLDER_SERVICE_HPP
#define HARMONYSYNC_FOLDER_SERVICE_HPP

#include "SongMap.hpp"
#include "SlideItem.hpp"
#include "ConfigService.hpp"
#include <string>
#include <vector>
#include <filesystem>
#include <memory>

namespace HarmonySync::Core {

/**
 * @brief Service responsible for scanning directory trees, detecting song/slide resources, and constructing domain models.
 */
class FolderService {
public:
    FolderService();
    explicit FolderService(std::shared_ptr<ConfigService> configService);
    ~FolderService();

    FolderService(const FolderService&) = delete;
    FolderService& operator=(const FolderService&) = delete;
    FolderService(FolderService&&) noexcept;
    FolderService& operator=(FolderService&&) noexcept;

    /**
     * @brief Scan a folder directory path and generate a populated SongMap model.
     */
    [[nodiscard]] SongMap loadSongFromFolder(const std::filesystem::path& folderPath) const;

    /**
     * @brief Scan a folder for slide image/video elements and construct SlideItem models.
     */
    [[nodiscard]] std::vector<SlideItem> loadSlidesFromFolder(const std::filesystem::path& folderPath) const;

    /**
     * @brief Check if a directory path is a valid song item folder.
     */
    [[nodiscard]] bool isSongFolder(const std::filesystem::path& folderPath) const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_FOLDER_SERVICE_HPP
