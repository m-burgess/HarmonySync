#include "SettingsStorageService.hpp"
#include <fstream>
#include <sstream>
#include <mutex>
#include <utility>
#include <filesystem>
#include <cstdlib>

#if __has_include(<QStandardPaths>)
#define HARMONYSYNC_STORAGE_QT
#include <QStandardPaths>
#include <QDir>
#include <QFile>
#include <QSaveFile>
#include <QJsonDocument>
#include <QJsonObject>
#endif

namespace HarmonySync::Core {

namespace {

std::string resolveDefaultSettingsPath() {
#ifdef HARMONYSYNC_STORAGE_QT
    QString configDir = QStandardPaths::writableLocation(QStandardPaths::AppConfigLocation);
    if (configDir.isEmpty()) {
        configDir = QDir::homePath() + "/.config/HarmonySync";
    } else if (!configDir.endsWith("HarmonySync") && !configDir.endsWith("harmonysync")) {
        configDir += "/HarmonySync";
    }
    return (configDir + "/settings.json").toStdString();
#else
    const char* xdg = std::getenv("XDG_CONFIG_HOME");
    std::filesystem::path base;
    if (xdg && *xdg) {
        base = xdg;
    } else {
        const char* home = std::getenv("HOME");
        base = home ? std::filesystem::path(home) / ".config" : std::filesystem::current_path();
    }
    return (base / "HarmonySync" / "settings.json").string();
#endif
}

} // namespace

struct SettingsStorageService::Impl {
    std::string path;
    mutable std::mutex mutex;

    Impl()
        : path(resolveDefaultSettingsPath()) {}

    explicit Impl(std::string p)
        : path(p.empty() ? resolveDefaultSettingsPath() : std::move(p)) {}
};

SettingsStorageService::SettingsStorageService()
    : m_impl(std::make_unique<Impl>()) {}

SettingsStorageService::SettingsStorageService(std::string defaultFilePath)
    : m_impl(std::make_unique<Impl>(std::move(defaultFilePath))) {}

SettingsStorageService::~SettingsStorageService() = default;

SettingsStorageService::SettingsStorageService(SettingsStorageService&&) noexcept = default;
SettingsStorageService& SettingsStorageService::operator=(SettingsStorageService&&) noexcept = default;

bool SettingsStorageService::saveSettings(const AppSettings& settings, const std::string& filePath) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    std::string targetPath = filePath.empty() ? m_impl->path : filePath;

    std::filesystem::path target(targetPath);
    if (targetPath == m_impl->path) {
        std::error_code ec;
        std::filesystem::create_directories(target.parent_path(), ec);
    }

#ifdef HARMONYSYNC_STORAGE_QT
    QSaveFile saveFile(QString::fromStdString(targetPath));
    if (!saveFile.open(QIODevice::WriteOnly)) {
        return false;
    }

    QJsonObject obj;
    obj["presentationDisplay"] = settings.presentationDisplayIndex();
    obj["confidenceDisplay"] = settings.confidenceDisplayIndex();
    obj["resolutionWidth"] = settings.resolutionWidth();
    obj["resolutionHeight"] = settings.resolutionHeight();
    obj["lyricsFontSize"] = settings.lyricsFontSize();
    obj["lowerThirdFontSize"] = settings.lowerThirdFontSize();
    obj["fontFamily"] = QString::fromStdString(settings.fontFamily());
    obj["textColorHex"] = QString::fromStdString(settings.textColorHex());
    obj["vAlign"] = static_cast<int>(settings.verticalAlignment());
    obj["hAlign"] = static_cast<int>(settings.horizontalAlignment());
    obj["marginOffsetX"] = settings.marginOffsetX();
    obj["marginOffsetY"] = settings.marginOffsetY();
    obj["preServiceMusicUrl"] = QString::fromStdString(settings.preServiceMusicUrl());

    QJsonDocument doc(obj);
    saveFile.write(doc.toJson(QJsonDocument::Indented));
    return saveFile.commit();
#else
    std::filesystem::path tmpPath = target;
    tmpPath += ".tmp";

    std::ofstream outFile(tmpPath);
    if (!outFile.is_open()) {
        return false;
    }

    outFile << "{\n"
            << "  \"presentationDisplay\": " << settings.presentationDisplayIndex() << ",\n"
            << "  \"confidenceDisplay\": " << settings.confidenceDisplayIndex() << ",\n"
            << "  \"resolutionWidth\": " << settings.resolutionWidth() << ",\n"
            << "  \"resolutionHeight\": " << settings.resolutionHeight() << ",\n"
            << "  \"lyricsFontSize\": " << settings.lyricsFontSize() << ",\n"
            << "  \"lowerThirdFontSize\": " << settings.lowerThirdFontSize() << ",\n"
            << "  \"fontFamily\": \"" << settings.fontFamily() << "\",\n"
            << "  \"textColorHex\": \"" << settings.textColorHex() << "\",\n"
            << "  \"vAlign\": " << static_cast<int>(settings.verticalAlignment()) << ",\n"
            << "  \"hAlign\": " << static_cast<int>(settings.horizontalAlignment()) << ",\n"
            << "  \"marginOffsetX\": " << settings.marginOffsetX() << ",\n"
            << "  \"marginOffsetY\": " << settings.marginOffsetY() << ",\n"
            << "  \"preServiceMusicUrl\": \"" << settings.preServiceMusicUrl() << "\"\n"
            << "}\n";
    outFile.close();

    std::filesystem::rename(tmpPath, target, ec);
    return !ec;
#endif
}

AppSettings SettingsStorageService::loadSettings(const std::string& filePath) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    std::string targetPath = filePath.empty() ? m_impl->path : filePath;

    AppSettings settings;
#ifdef HARMONYSYNC_STORAGE_QT
    QFile file(QString::fromStdString(targetPath));
    if (!file.open(QIODevice::ReadOnly)) {
        return settings;
    }
    QByteArray data = file.readAll();
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (!doc.isObject()) {
        return settings;
    }
    QJsonObject obj = doc.object();
    if (obj.contains("presentationDisplay")) {
        settings.setPresentationDisplayIndex(obj["presentationDisplay"].toInt());
    }
    if (obj.contains("confidenceDisplay")) {
        settings.setConfidenceDisplayIndex(obj["confidenceDisplay"].toInt());
    }
    if (obj.contains("resolutionWidth") && obj.contains("resolutionHeight")) {
        settings.setResolution(obj["resolutionWidth"].toInt(), obj["resolutionHeight"].toInt());
    }
    if (obj.contains("lyricsFontSize")) {
        settings.setLyricsFontSize(obj["lyricsFontSize"].toInt());
    }
    if (obj.contains("lowerThirdFontSize")) {
        settings.setLowerThirdFontSize(obj["lowerThirdFontSize"].toInt());
    }
    if (obj.contains("fontFamily")) {
        settings.setFontFamily(obj["fontFamily"].toString().toStdString());
    }
    if (obj.contains("textColorHex")) {
        settings.setTextColorHex(obj["textColorHex"].toString().toStdString());
    }
    if (obj.contains("vAlign")) {
        settings.setVerticalAlignment(static_cast<TextVerticalAlignment>(obj["vAlign"].toInt()));
    }
    if (obj.contains("hAlign")) {
        settings.setHorizontalAlignment(static_cast<TextHorizontalAlignment>(obj["hAlign"].toInt()));
    }
    if (obj.contains("marginOffsetX")) {
        settings.setMarginOffsetX(obj["marginOffsetX"].toInt());
    }
    if (obj.contains("marginOffsetY")) {
        settings.setMarginOffsetY(obj["marginOffsetY"].toInt());
    }
    if (obj.contains("preServiceMusicUrl")) {
        settings.setPreServiceMusicUrl(obj["preServiceMusicUrl"].toString().toStdString());
    }
    return settings;
#else
    std::ifstream inFile(targetPath);
    if (!inFile.is_open()) {
        return settings;
    }

    std::string line;
    auto parseStringVal = [](const std::string& l) -> std::string {
        auto colon = l.find(':');
        if (colon == std::string::npos) return "";
        auto firstQuote = l.find('"', colon);
        if (firstQuote == std::string::npos) return "";
        auto secondQuote = l.find('"', firstQuote + 1);
        if (secondQuote == std::string::npos) return "";
        return l.substr(firstQuote + 1, secondQuote - firstQuote - 1);
    };
    auto parseIntVal = [](const std::string& l) -> int {
        auto colon = l.find(':');
        if (colon == std::string::npos) return 0;
        try {
            return std::stoi(l.substr(colon + 1));
        } catch (...) {
            return 0;
        }
    };

    while (std::getline(inFile, line)) {
        if (line.find("\"presentationDisplay\":") != std::string::npos) {
            settings.setPresentationDisplayIndex(parseIntVal(line));
        } else if (line.find("\"confidenceDisplay\":") != std::string::npos) {
            settings.setConfidenceDisplayIndex(parseIntVal(line));
        } else if (line.find("\"resolutionWidth\":") != std::string::npos) {
            settings.setResolution(parseIntVal(line), settings.resolutionHeight());
        } else if (line.find("\"resolutionHeight\":") != std::string::npos) {
            settings.setResolution(settings.resolutionWidth(), parseIntVal(line));
        } else if (line.find("\"lyricsFontSize\":") != std::string::npos) {
            settings.setLyricsFontSize(parseIntVal(line));
        } else if (line.find("\"lowerThirdFontSize\":") != std::string::npos) {
            settings.setLowerThirdFontSize(parseIntVal(line));
        } else if (line.find("\"fontFamily\":") != std::string::npos) {
            settings.setFontFamily(parseStringVal(line));
        } else if (line.find("\"textColorHex\":") != std::string::npos) {
            settings.setTextColorHex(parseStringVal(line));
        } else if (line.find("\"vAlign\":") != std::string::npos) {
            settings.setVerticalAlignment(static_cast<TextVerticalAlignment>(parseIntVal(line)));
        } else if (line.find("\"hAlign\":") != std::string::npos) {
            settings.setHorizontalAlignment(static_cast<TextHorizontalAlignment>(parseIntVal(line)));
        } else if (line.find("\"marginOffsetX\":") != std::string::npos) {
            settings.setMarginOffsetX(parseIntVal(line));
        } else if (line.find("\"marginOffsetY\":") != std::string::npos) {
            settings.setMarginOffsetY(parseIntVal(line));
        } else if (line.find("\"preServiceMusicUrl\":") != std::string::npos) {
            settings.setPreServiceMusicUrl(parseStringVal(line));
        }
    }
    return settings;
#endif
}

std::string SettingsStorageService::defaultFilePath() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->path;
}

} // namespace HarmonySync::Core
