#ifndef HARMONYSYNC_LOCALIZATION_SERVICE_HPP
#define HARMONYSYNC_LOCALIZATION_SERVICE_HPP

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>

namespace HarmonySync::Core {

/**
 * @brief Thread-safe localization service managing dynamic language catalogs and string translations.
 */
class LocalizationService {
public:
    LocalizationService();
    explicit LocalizationService(const std::string& currentLanguageCode);
    ~LocalizationService();

    LocalizationService(const LocalizationService&) = delete;
    LocalizationService& operator=(const LocalizationService&) = delete;
    LocalizationService(LocalizationService&&) noexcept;
    LocalizationService& operator=(LocalizationService&&) noexcept;

    bool setLanguage(const std::string& languageCode);
    [[nodiscard]] std::string currentLanguage() const;

    [[nodiscard]] std::vector<std::string> availableLanguages() const;

    [[nodiscard]] std::string translate(const std::string& textKey) const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_LOCALIZATION_SERVICE_HPP
