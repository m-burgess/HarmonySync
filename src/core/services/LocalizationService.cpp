#include "LocalizationService.hpp"
#include <mutex>

namespace HarmonySync::Core {

struct LocalizationService::Impl {
    std::string currentLang{"en"};
    std::unordered_map<std::string, std::unordered_map<std::string, std::string>> catalogs;
    mutable std::mutex mutex;

    Impl() {
        // Default EN
        catalogs["en"] = {
            {"APP_TITLE", "HarmonySync Worship Media Engine"},
            {"NAV_MIXER", "Stem Mixer"},
            {"NAV_LYRICS", "Lyrics & Presentation"},
            {"NAV_SETLIST", "Service Order"}
        };
        // Spanish ES
        catalogs["es"] = {
            {"APP_TITLE", "Motor de Medios de Adoración HarmonySync"},
            {"NAV_MIXER", "Mezclador de Pistas"},
            {"NAV_LYRICS", "Letras y Presentación"},
            {"NAV_SETLIST", "Orden de Culto"}
        };
        // French FR
        catalogs["fr"] = {
            {"APP_TITLE", "Moteur de Média de Culte HarmonySync"},
            {"NAV_MIXER", "Mélangeur de Pistes"},
            {"NAV_LYRICS", "Paroles et Présentation"},
            {"NAV_SETLIST", "Ordre de Culte"}
        };
    }
};

LocalizationService::LocalizationService()
    : m_impl(std::make_unique<Impl>())
{}

LocalizationService::LocalizationService(const std::string& currentLanguageCode)
    : m_impl(std::make_unique<Impl>())
{
    setLanguage(currentLanguageCode);
}

LocalizationService::~LocalizationService() = default;

LocalizationService::LocalizationService(LocalizationService&&) noexcept = default;
LocalizationService& LocalizationService::operator=(LocalizationService&&) noexcept = default;

bool LocalizationService::setLanguage(const std::string& languageCode) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (m_impl->catalogs.find(languageCode) != m_impl->catalogs.end()) {
        m_impl->currentLang = languageCode;
        return true;
    }
    return false;
}

std::string LocalizationService::currentLanguage() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->currentLang;
}

std::vector<std::string> LocalizationService::availableLanguages() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return {"en", "es", "fr"};
}

std::string LocalizationService::translate(const std::string& textKey) const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    auto langIt = m_impl->catalogs.find(m_impl->currentLang);
    if (langIt != m_impl->catalogs.end()) {
        auto keyIt = langIt->second.find(textKey);
        if (keyIt != langIt->second.end()) {
            return keyIt->second;
        }
    }
    return textKey;
}

} // namespace HarmonySync::Core
