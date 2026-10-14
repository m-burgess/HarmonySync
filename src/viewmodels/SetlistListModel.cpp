#include "SetlistListModel.hpp"
#include "SetlistViewModel.hpp"

#ifdef HARMONYSYNC_QT_AVAILABLE

namespace HarmonySync::ViewModels {

SetlistListModel::SetlistListModel(const SetlistViewModel& setlist, QObject* parent)
    : QAbstractListModel(parent), m_setlist(setlist) {}

int SetlistListModel::rowCount(const QModelIndex& parent) const {
    return parent.isValid() ? 0 : m_setlist.itemCount();
}

QVariant SetlistListModel::data(const QModelIndex& index, int role) const {
    if (!index.isValid() || index.row() < 0 || index.row() >= m_setlist.itemCount()) {
        return {};
    }
    switch (role) {
    case NameRole:
    case Qt::DisplayRole:
        return m_setlist.itemNameAt(index.row());
    case HasSongMapRole:
        return m_setlist.itemHasSongMapAt(index.row());
    case IsCurrentRole:
        return m_setlist.currentSongIndex() == index.row();
    default:
        return {};
    }
}

QHash<int, QByteArray> SetlistListModel::roleNames() const {
    return {{NameRole, "name"}, {HasSongMapRole, "hasSongMap"}, {IsCurrentRole, "isCurrent"}};
}

void SetlistListModel::currentRowChanged(int previousRow, int currentRow) {
    for (int row : {previousRow, currentRow}) {
        if (row >= 0 && row < rowCount()) {
            const QModelIndex i = index(row);
            emit dataChanged(i, i, {IsCurrentRole});
        }
    }
}

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_QT_AVAILABLE
