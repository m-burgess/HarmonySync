#ifndef HARMONYSYNC_ONLINE_LYRICS_FETCHER_HPP
#define HARMONYSYNC_ONLINE_LYRICS_FETCHER_HPP

#include "CloudNetworkService.hpp"
#include <string>
#include <vector>
#include <memory>

namespace HarmonySync::Core {

struct LyricTimestampedLine {
    double timestampSeconds{0.0};
    std::string text;
};

/**
 * @brief Online lyrics fetcher service parsing LRC timestamped lyrics and Genius cloud APIs.
 */
class OnlineLyricsFetcher {
public:
    explicit OnlineLyricsFetcher(std::shared_ptr<CloudNetworkService> networkService = nullptr);
    ~OnlineLyricsFetcher();

    OnlineLyricsFetcher(const OnlineLyricsFetcher&) = delete;
    OnlineLyricsFetcher& operator=(const OnlineLyricsFetcher&) = delete;

    [[nodiscard]] std::vector<LyricTimestampedLine> parseLrcContent(const std::string& lrcText) const;
    [[nodiscard]] std::string fetchLyrics(const std::string& title, const std::string& artist) const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_ONLINE_LYRICS_FETCHER_HPP
