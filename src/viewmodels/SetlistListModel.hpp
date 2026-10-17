#ifndef HARMONYSYNC_SETLIST_LIST_MODEL_HPP
#define HARMONYSYNC_SETLIST_LIST_MODEL_HPP

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QAbstractListModel>)
#include <QAbstractListModel>

namespace HarmonySync::ViewModels {

class SetlistViewModel;

/**
 * @brief Rows of the setlist for QML list views (#219, same pattern as #206).
 *
 * Presentation only: it reads names and flags from SetlistViewModel and owns no domain
 * rules. SetlistViewModel calls the notify functions around each change, so a view
 * rebuilds its rows whenever the contents change, even if the count stays the same.
 */
class SetlistListModel : public QAbstractListModel {
    Q_OBJECT
public:
    enum Role { NameRole = Qt::UserRole + 1, HasSongMapRole, IsCurrentRole };

    explicit SetlistListModel(const SetlistViewModel& setlist, QObject* parent = nullptr);

    int rowCount(const QModelIndex& parent = QModelIndex()) const override;
    QVariant data(const QModelIndex& index, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    // Called by SetlistViewModel around its own changes.
    void beginReplaceAll() { beginResetModel(); }
    void endReplaceAll() { endResetModel(); }
    void beginInsertAt(int row) { beginInsertRows(QModelIndex(), row, row); }
    void endInsert() { endInsertRows(); }
    void beginRemoveAt(int row) { beginRemoveRows(QModelIndex(), row, row); }
    void endRemove() { endRemoveRows(); }
    void currentRowChanged(int previousRow, int currentRow);

private:
    const SetlistViewModel& m_setlist;
};

} // namespace HarmonySync::ViewModels

#endif
#endif // HARMONYSYNC_SETLIST_LIST_MODEL_HPP
