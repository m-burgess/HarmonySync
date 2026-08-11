#include "SetlistViewModel.hpp"
#include "ServiceOrderFolderScanner.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct SetlistViewModel::Impl {
    Core::ServiceOrder serviceOrder;
    std::shared_ptr<Core::FolderService> folderService;
    Core::ServiceOrderFolderScanner scanner;
    std::string titleStr{"Sunday Service Order"};
    int currentSongIndex{-1};
    bool isLoading{false};

    explicit Impl(std::shared_ptr<Core::FolderService> fs)
        : folderService(std::move(fs))
        , scanner(folderService)
    {
        if (!folderService) {
            folderService = std::make_shared<Core::FolderService>();
        }
    }
};

SetlistViewModel::SetlistViewModel(std::shared_ptr<Core::FolderService> folderService)
    : m_impl(std::make_unique<Impl>(std::move(folderService)))
{}

SetlistViewModel::~SetlistViewModel() = default;

#ifdef HARMONYSYNC_QT_AVAILABLE
QString SetlistViewModel::title() const {
    return QString::fromStdString(m_impl->titleStr);
}

void SetlistViewModel::setTitle(const QString& newTitle) {
    std::string str = newTitle.toStdString();
    if (m_impl->titleStr != str) {
        m_impl->titleStr = str;
        emit titleChanged(newTitle);
    }
}
#else
std::string SetlistViewModel::title() const {
    return m_impl->titleStr;
}

void SetlistViewModel::setTitle(const std::string& newTitle) {
    m_impl->titleStr = newTitle;
}
#endif

std::string SetlistViewModel::titleStd() const {
    return m_impl->titleStr;
}

int SetlistViewModel::itemCount() const noexcept {
    return static_cast<int>(m_impl->serviceOrder.songs().size());
}

int SetlistViewModel::currentSongIndex() const noexcept {
    return m_impl->currentSongIndex;
}

void SetlistViewModel::setCurrentSongIndex(int index) {
    if (index >= -1 && index < itemCount() && m_impl->currentSongIndex != index) {
        m_impl->currentSongIndex = index;
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit currentSongIndexChanged(index);
        emit activeSongMapChanged(hasActiveSongMap());
#endif
    }
}

bool SetlistViewModel::hasActiveSongMap() const noexcept {
    if (m_impl->currentSongIndex >= 0 && m_impl->currentSongIndex < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(m_impl->currentSongIndex)].hasSongMap();
    }
    return false;
}

bool SetlistViewModel::isLoading() const noexcept {
    return m_impl->isLoading;
}

std::vector<Core::MediaStem> SetlistViewModel::stemsAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].stems();
    }
    return {};
}

#ifdef HARMONYSYNC_QT_AVAILABLE
bool SetlistViewModel::openServiceOrderRootFolder(const QString& rootFolderPath) {
    std::string pathStr = rootFolderPath.toStdString();
#else
bool SetlistViewModel::openServiceOrderRootFolder(const std::string& pathStr) {
#endif
    Core::ServiceOrder newOrder = m_impl->scanner.scanServiceOrderDirectory(pathStr);
    if (!newOrder.songs().empty()) {
        m_impl->serviceOrder = std::move(newOrder);
        setTitle(
#ifdef HARMONYSYNC_QT_AVAILABLE
            QString::fromStdString(m_impl->serviceOrder.dateString())
#else
            m_impl->serviceOrder.dateString()
#endif
        );
        m_impl->currentSongIndex = -1;
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit itemCountChanged(itemCount());
#endif
        setCurrentSongIndex(0);
        return true;
    }
    return false;
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString SetlistViewModel::itemNameAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return QString::fromStdString(m_impl->serviceOrder.songs()[static_cast<size_t>(index)].title());
    }
    return QString();
}

bool SetlistViewModel::itemHasSongMapAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].hasSongMap();
    }
    return false;
}

QString SetlistViewModel::backgroundVideoPathAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return QString::fromStdString(m_impl->serviceOrder.songs()[static_cast<size_t>(index)].backgroundVideoPath());
    }
    return QString();
}

bool SetlistViewModel::addSongFolder(const QString& folderPath) {
    std::string pathStr = folderPath.toStdString();
#else
std::string SetlistViewModel::itemNameAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].title();
    }
    return std::string();
}

bool SetlistViewModel::itemHasSongMapAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].hasSongMap();
    }
    return false;
}

std::string SetlistViewModel::backgroundVideoPathAt(int index) const {
    if (index >= 0 && index < itemCount()) {
        return m_impl->serviceOrder.songs()[static_cast<size_t>(index)].backgroundVideoPath();
    }
    return std::string();
}

bool SetlistViewModel::addSongFolder(const std::string& pathStr) {
#endif
    Core::SongMap song = m_impl->folderService->loadSongFromFolder(pathStr);
    if (!song.title().empty()) {
        m_impl->serviceOrder.addSong(song);
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit itemCountChanged(itemCount());
#endif
        if (m_impl->currentSongIndex == -1) {
            setCurrentSongIndex(0);
        }
        return true;
    }
    return false;
}

void SetlistViewModel::removeSongAt(int index) {
    if (index >= 0 && index < itemCount()) {
        m_impl->serviceOrder.removeSongAt(static_cast<size_t>(index));
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit itemCountChanged(itemCount());
#endif
        if (m_impl->currentSongIndex >= itemCount()) {
            setCurrentSongIndex(itemCount() - 1);
        }
    }
}

void SetlistViewModel::clearSetlist() {
    m_impl->serviceOrder.clearAll();
    m_impl->currentSongIndex = -1;
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit itemCountChanged(0);
    emit currentSongIndexChanged(-1);
    emit activeSongMapChanged(false);
#endif
}

} // namespace HarmonySync::ViewModels
