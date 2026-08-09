#include "OnlineLyricsFetcher.hpp"
#include <sstream>
#include <regex>
#include <utility>

namespace HarmonySync::Core {

struct OnlineLyricsFetcher::Impl {
    std::shared_ptr<CloudNetworkService> networkService;

    Impl(std::shared_ptr<CloudNetworkService> netSvc)
        : networkService(std::move(netSvc))
    {
        if (!networkService) {
            networkService = std::make_shared<CloudNetworkService>();
        }
    }
};

OnlineLyricsFetcher::OnlineLyricsFetcher(std::shared_ptr<CloudNetworkService> networkService)
    : m_impl(std::make_unique<Impl>(std::move(networkService)))
{}

OnlineLyricsFetcher::~OnlineLyricsFetcher() = default;

std::vector<LyricTimestampedLine> OnlineLyricsFetcher::parseLrcContent(const std::string& lrcText) const {
    std::vector<LyricTimestampedLine> lines;
    std::istringstream stream(lrcText);
    std::string line;
    std::regex lrcRegex(R"(\[(\d{2}):(\d{2})\.(\d{2})\](.*))");

    while (std::getline(stream, line)) {
        std::smatch match;
        if (std::regex_search(line, match, lrcRegex)) {
            int minutes = std::stoi(match[1]);
            int seconds = std::stoi(match[2]);
            int hundredths = std::stoi(match[3]);

            LyricTimestampedLine item;
            item.timestampSeconds = minutes * 60.0 + seconds + hundredths / 100.0;
            item.text = match[4].str();
            lines.push_back(item);
        }
    }
    return lines;
}

std::string OnlineLyricsFetcher::fetchLyrics(const std::string& title, const std::string& artist) const {
    std::string url = "https://api.genius.com/search?q=" + title + " " + artist;
    HttpResponse resp = m_impl->networkService->getSync(url);
    if (resp.success) {
        return resp.body;
    }
    return "";
}

} // namespace HarmonySync::Core
