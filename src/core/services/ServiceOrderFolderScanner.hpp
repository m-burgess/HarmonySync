#ifndef HARMONYSYNC_SERVICE_ORDER_FOLDER_SCANNER_HPP
#define HARMONYSYNC_SERVICE_ORDER_FOLDER_SCANNER_HPP

#include "ServiceOrder.hpp"
#include "FolderService.hpp"
#include <filesystem>
#include <memory>
#include <string>

namespace HarmonySync::Core {

/**
 * @brief Scanner service responsible for parsing root service order directories (e.g., from Dropbox or Google Drive),
 * sorting subfolders, and constructing a complete ServiceOrder with song and media-only items.
 */
class ServiceOrderFolderScanner {
public:
    ServiceOrderFolderScanner();
    explicit ServiceOrderFolderScanner(std::shared_ptr<FolderService> folderService);
    ~ServiceOrderFolderScanner();

    ServiceOrderFolderScanner(const ServiceOrderFolderScanner&) = delete;
    ServiceOrderFolderScanner& operator=(const ServiceOrderFolderScanner&) = delete;
    ServiceOrderFolderScanner(ServiceOrderFolderScanner&&) noexcept;
    ServiceOrderFolderScanner& operator=(ServiceOrderFolderScanner&&) noexcept;

    /**
     * @brief Scan a root directory containing item subfolders and construct a populated ServiceOrder.
     */
    [[nodiscard]] ServiceOrder scanServiceOrderDirectory(const std::filesystem::path& rootPath) const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_SERVICE_ORDER_FOLDER_SCANNER_HPP
