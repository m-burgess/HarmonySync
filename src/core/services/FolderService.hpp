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

    /**
     * @brief Save and apply the song's multitrack mix state to mix.json.
     */
    /// Writes via a temp file that replaces mix.json only once fully written (QSaveFile), so an
    /// existing mix.json is never left half-written. Returns false if nothing was saved or the
    /// write could not complete (e.g. folder missing or read-only); mix.json is then unchanged.
    static bool saveMixState(const std::string& folderPath, const std::vector<MediaStem>& stems);
    static void applyMixState(const std::string& folderPath, std::vector<MediaStem>& stems);

    /**
     * @brief Parses a lyrics.txt file in the given folder and generates a song-map.json.
     * @return true if successfully converted and saved, false otherwise.
     */
    static bool convertLyricsToSongMap(const std::filesystem::path& folderPath);

    /**
     * @brief Saves the given SongMap back to its folder's song-map.json file.
     * @return true if successfully saved, false otherwise.
     */
    static bool saveSongMap(const SongMap& songMap);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_FOLDER_SERVICE_HPP
