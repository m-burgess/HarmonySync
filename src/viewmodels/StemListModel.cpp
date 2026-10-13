#include "StemListModel.hpp"
#include "AudioMixerViewModel.hpp"

namespace HarmonySync::ViewModels {

StemListModel::StemListModel(const AudioMixerViewModel& mixer, QObject* parent)
    : QAbstractListModel(parent), m_mixer(mixer) {}

int StemListModel::rowCount(const QModelIndex& parent) const {
    return parent.isValid() ? 0 : m_mixer.loadedStemCount();
}

QVariant StemListModel::data(const QModelIndex& index, int role) const {
    if (!index.isValid() || index.row() < 0 || index.row() >= rowCount()) {
        return {};
    }
    const int row = index.row();
    switch (role) {
    case NameRole:   return m_mixer.stemName(row);
    case MutedRole:  return m_mixer.stemIsMuted(row);
    case SoloedRole: return m_mixer.stemIsSoloed(row);
    case VolumeRole: return m_mixer.stemVolume(row);
    default:         return {};
    }
}

QHash<int, QByteArray> StemListModel::roleNames() const {
    return {
        {NameRole, "name"},
        {MutedRole, "muted"},
        {SoloedRole, "soloed"},
        {VolumeRole, "volume"},
    };
}

void StemListModel::beginResetStems() { beginResetModel(); }
void StemListModel::endResetStems() { endResetModel(); }

void StemListModel::stemChanged(int row) {
    if (row < 0 || row >= rowCount()) return;
    const QModelIndex i = index(row, 0);
    emit dataChanged(i, i, {MutedRole, SoloedRole, VolumeRole});
}

} // namespace HarmonySync::ViewModels
