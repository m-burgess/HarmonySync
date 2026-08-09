#include "ConfigService.hpp"
#include <fstream>
#include <sstream>
#include <regex>
#include <iostream>

namespace HarmonySync::Core {

struct ConfigService::Impl {
    Impl() = default;
};

ConfigService::ConfigService()
    : m_impl(std::make_unique<Impl>())
{}

ConfigService::~ConfigService() = default;

ConfigService::ConfigService(ConfigService&&) noexcept = default;
ConfigService& ConfigService::operator=(ConfigService&&) noexcept = default;

ServiceItemConfig ConfigService::loadConfigFromDirectory(const std::filesystem::path& dirPath) const {
    std::filesystem::path configPath = dirPath / "config.json";
    if (!std::filesystem::exists(configPath)) {
        // Return default configuration
        return ServiceItemConfig{};
    }

    std::ifstream file(configPath);
    if (!file.is_open()) {
        ServiceItemConfig cfg{};
        cfg.isValid = false;
        return cfg;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    return parseConfigJson(buffer.str());
}

ServiceItemConfig ConfigService::parseConfigJson(const std::string& jsonString) const {
    ServiceItemConfig config{};

    // Parse boolean fields: loopImages
    std::regex loopRegex(R"*(["']loopImages["']\s*:\s*(true|false))*", std::regex::icase);
    std::smatch match;
    if (std::regex_search(jsonString, match, loopRegex) && match.size() > 1) {
        config.loopImages = (match[1].str() == "true");
    }

    // Parse boolean fields: autoplayBackgroundVideo
    std::regex autoVideoRegex(R"*(["']autoplayBackgroundVideo["']\s*:\s*(true|false))*", std::regex::icase);
    if (std::regex_search(jsonString, match, autoVideoRegex) && match.size() > 1) {
        config.autoplayBackgroundVideo = (match[1].str() == "true");
    }

    // Parse string field: lyricsLink
    std::regex lyricsRegex(R"*(["']lyricsLink["']\s*:\s*["']([^"']+)["'])*", std::regex::icase);
    if (std::regex_search(jsonString, match, lyricsRegex) && match.size() > 1) {
        config.lyricsLink = match[1].str();
    }

    // Parse youtubeLinks (string or array)
    std::regex ytSingleRegex(R"*(["']youtubeLinks["']\s*:\s*["']([^"']+)["'])*", std::regex::icase);
    if (std::regex_search(jsonString, match, ytSingleRegex) && match.size() > 1) {
        config.youtubeLinks.push_back(match[1].str());
    } else {
        // Match youtubeLinks array elements
        std::regex ytArrayRegex(R"*(["']youtubeLinks["']\s*:\s*\[([^\]]*)\])*", std::regex::icase);
        if (std::regex_search(jsonString, match, ytArrayRegex) && match.size() > 1) {
            std::string arrayContent = match[1].str();
            std::regex linkElemRegex(R"*(["']([^"']+)["'])*");
            auto begin = std::sregex_iterator(arrayContent.begin(), arrayContent.end(), linkElemRegex);
            auto end = std::sregex_iterator();
            for (std::sregex_iterator i = begin; i != end; ++i) {
                std::smatch elemMatch = *i;
                if (elemMatch.size() > 1) {
                    config.youtubeLinks.push_back(elemMatch[1].str());
                }
            }
        }
    }

    return config;
}

std::string ConfigService::generateTemplateJson() const {
    return R"({
  "youtubeLinks": "",
  "lyricsLink": "",
  "loopImages": false,
  "autoplayBackgroundVideo": true
}
)";
}

bool ConfigService::createConfigTemplate(const std::filesystem::path& dirPath) const {
    if (!std::filesystem::exists(dirPath)) {
        return false;
    }

    std::filesystem::path configPath = dirPath / "config.json";
    if (std::filesystem::exists(configPath)) {
        return false; // Do not overwrite existing config file
    }

    std::ofstream file(configPath);
    if (!file.is_open()) {
        return false;
    }

    file << generateTemplateJson();
    return true;
}

} // namespace HarmonySync::Core
