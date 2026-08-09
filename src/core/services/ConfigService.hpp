#ifndef HARMONYSYNC_CONFIG_SERVICE_HPP
#define HARMONYSYNC_CONFIG_SERVICE_HPP

#include <string>
#include <vector>
#include <memory>
#include <filesystem>

namespace HarmonySync::Core {

/**
 * @brief Configuration data structure for service items (parsed from config.json).
 */
struct ServiceItemConfig {
    std::vector<std::string> youtubeLinks;
    std::string lyricsLink;
    bool loopImages{false};
    bool autoplayBackgroundVideo{true};
    bool isValid{true};
};

/**
 * @brief Service responsible for parsing, validating, and generating config.json files for service items.
 */
class ConfigService {
public:
    ConfigService();
    ~ConfigService();

    ConfigService(const ConfigService&) = delete;
    ConfigService& operator=(const ConfigService&) = delete;
    ConfigService(ConfigService&&) noexcept;
    ConfigService& operator=(ConfigService&&) noexcept;

    /**
     * @brief Load and parse config.json from a given directory path.
     */
    [[nodiscard]] ServiceItemConfig loadConfigFromDirectory(const std::filesystem::path& dirPath) const;

    /**
     * @brief Parse config JSON string into ServiceItemConfig struct.
     */
    [[nodiscard]] ServiceItemConfig parseConfigJson(const std::string& jsonString) const;

    /**
     * @brief Generate a default template config.json string.
     */
    [[nodiscard]] std::string generateTemplateJson() const;

    /**
     * @brief Save a default config template file to specified directory if it doesn't exist.
     */
    bool createConfigTemplate(const std::filesystem::path& dirPath) const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_CONFIG_SERVICE_HPP
