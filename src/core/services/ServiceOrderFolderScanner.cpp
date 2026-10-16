#include "ServiceOrderFolderScanner.hpp"
#include <algorithm>
#include <vector>
#include <utility>
#if __has_include(<QJsonDocument>)
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QFile>
#endif
#include <vector>
#include <utility>

namespace HarmonySync::Core {

struct ServiceOrderFolderScanner::Impl {
    std::shared_ptr<FolderService> folderService;

    Impl()
        : folderService(std::make_shared<FolderService>()) {}

    explicit Impl(std::shared_ptr<FolderService> fs)
        : folderService(std::move(fs)) {
        if (!folderService) {
            folderService = std::make_shared<FolderService>();
        }
    }
};

ServiceOrderFolderScanner::ServiceOrderFolderScanner()
    : m_impl(std::make_unique<Impl>()) {}

ServiceOrderFolderScanner::ServiceOrderFolderScanner(std::shared_ptr<FolderService> folderService)
    : m_impl(std::make_unique<Impl>(std::move(folderService))) {}

ServiceOrderFolderScanner::~ServiceOrderFolderScanner() = default;

ServiceOrderFolderScanner::ServiceOrderFolderScanner(ServiceOrderFolderScanner&&) noexcept = default;
ServiceOrderFolderScanner& ServiceOrderFolderScanner::operator=(ServiceOrderFolderScanner&&) noexcept = default;

ServiceOrder ServiceOrderFolderScanner::scanServiceOrderDirectory(const std::filesystem::path& rootPath) const {
    ServiceOrder order;
    if (!std::filesystem::exists(rootPath) || !std::filesystem::is_directory(rootPath)) {
        return order;
    }

    std::string rootName = rootPath.filename().string();
    order.setDateString(rootName);

    std::filesystem::path serviceMapPath = rootPath / "service-map.json";
    if (std::filesystem::exists(serviceMapPath)) {
#if __has_include(<QJsonDocument>)
        QFile file(QString::fromStdString(serviceMapPath.string()));
        if (file.open(QIODevice::ReadOnly)) {
            QByteArray data = file.readAll();
            QJsonDocument doc = QJsonDocument::fromJson(data);
            if (doc.isObject()) {
                QJsonObject obj = doc.object();
                if (obj.contains("playlist")) {
                    QJsonObject playlistObj = obj["playlist"].toObject();
                    if (playlistObj.contains("url")) {
                        order.setPlaylistUrl(playlistObj["url"].toString().toStdString());
                    }
                }
            }
        }
#endif
    }

    std::vector<std::filesystem::path> subfolderPaths;
    for (const auto& entry : std::filesystem::directory_iterator(rootPath)) {
        if (entry.is_directory()) {
            subfolderPaths.push_back(entry.path());
        }
    }

    // Natural alphabetical sort for subfolders (e.g. 01_..., 02_...)
    std::sort(subfolderPaths.begin(), subfolderPaths.end(),
              [](const std::filesystem::path& a, const std::filesystem::path& b) {
                  return a.filename().string() < b.filename().string();
              });

    for (const auto& subPath : subfolderPaths) {
        SongMap item = m_impl->folderService->loadSongFromFolder(subPath);
        order.addSong(std::move(item));
    }

    return order;
}

} // namespace HarmonySync::Core
