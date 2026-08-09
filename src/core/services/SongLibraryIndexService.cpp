#include "SongLibraryIndexService.hpp"
#include <algorithm>
#include <cctype>
#include <mutex>

namespace HarmonySync::Core {

static std::string toLower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return s;
}

struct SongLibraryIndexService::Impl {
    std::vector<SongMap> indexedSongs;
    mutable std::mutex mutex;
};

SongLibraryIndexService::SongLibraryIndexService()
    : m_impl(std::make_unique<Impl>())
{}

SongLibraryIndexService::~SongLibraryIndexService() = default;

SongLibraryIndexService::SongLibraryIndexService(SongLibraryIndexService&&) noexcept = default;
SongLibraryIndexService& SongLibraryIndexService::operator=(SongLibraryIndexService&&) noexcept = default;

void SongLibraryIndexService::buildIndex(const std::vector<SongMap>& songs) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->indexedSongs = songs;
}

void SongLibraryIndexService::addOrUpdateSong(const SongMap& song) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    auto it = std::find_if(m_impl->indexedSongs.begin(), m_impl->indexedSongs.end(), [&](const SongMap& s) {
        return s.id() == song.id();
    });
    if (it != m_impl->indexedSongs.end()) {
        *it = song;
    } else {
        m_impl->indexedSongs.push_back(song);
    }
}

void SongLibraryIndexService::removeSong(const std::string& songId) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->indexedSongs.erase(
        std::remove_if(m_impl->indexedSongs.begin(), m_impl->indexedSongs.end(), [&](const SongMap& s) {
            return s.id() == songId;
        }),
        m_impl->indexedSongs.end()
    );
}

std::vector<SearchResult> SongLibraryIndexService::search(const std::string& query, size_t maxResults) const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    std::string lowerQuery = toLower(query);
    std::vector<SearchResult> results;

    if (lowerQuery.empty()) return results;

    for (const auto& song : m_impl->indexedSongs) {
        std::string lowerTitle = toLower(song.title());
        std::string lowerArtist = toLower(song.artist());

        float score = 0.0f;
        if (lowerTitle == lowerQuery) {
            score = 1.0f;
        } else if (lowerTitle.find(lowerQuery) != std::string::npos) {
            score = 0.8f;
        } else if (lowerArtist.find(lowerQuery) != std::string::npos) {
            score = 0.6f;
        }

        if (score > 0.0f) {
            results.push_back({song, score});
        }
    }

    std::sort(results.begin(), results.end(), [](const SearchResult& a, const SearchResult& b) {
        return a.matchScore > b.matchScore;
    });

    if (results.size() > maxResults) {
        results.resize(maxResults);
    }

    return results;
}

size_t SongLibraryIndexService::indexedCount() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->indexedSongs.size();
}

} // namespace HarmonySync::Core
