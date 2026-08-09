#ifndef HARMONYSYNC_SONG_LIBRARY_INDEX_SERVICE_HPP
#define HARMONYSYNC_SONG_LIBRARY_INDEX_SERVICE_HPP

#include "SongMap.hpp"
#include <string>
#include <vector>
#include <memory>

namespace HarmonySync::Core {

struct SearchResult {
    SongMap song;
    float matchScore{0.0f};
};

/**
 * @brief Sub-millisecond fuzzy search engine over indexed song titles, lyrics, and key signatures.
 */
class SongLibraryIndexService {
public:
    SongLibraryIndexService();
    ~SongLibraryIndexService();

    SongLibraryIndexService(const SongLibraryIndexService&) = delete;
    SongLibraryIndexService& operator=(const SongLibraryIndexService&) = delete;
    SongLibraryIndexService(SongLibraryIndexService&&) noexcept;
    SongLibraryIndexService& operator=(SongLibraryIndexService&&) noexcept;

    void buildIndex(const std::vector<SongMap>& songs);
    void addOrUpdateSong(const SongMap& song);
    void removeSong(const std::string& songId);

    [[nodiscard]] std::vector<SearchResult> search(const std::string& query, size_t maxResults = 10) const;
    [[nodiscard]] size_t indexedCount() const noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_SONG_LIBRARY_INDEX_SERVICE_HPP
