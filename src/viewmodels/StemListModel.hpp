#ifndef HARMONYSYNC_STEM_LIST_MODEL_HPP
#define HARMONYSYNC_STEM_LIST_MODEL_HPP

#include <QAbstractListModel>

namespace HarmonySync::ViewModels {

class AudioMixerViewModel;

/**
 * @brief List model of the stems loaded on the active deck (#206).
 *
 * Holds no state and no mute rules: every role is read from AudioMixerViewModel.
 * AudioMixerViewModel owns it and calls resetStems() whenever the loaded stems change
 * and stemChanged() wherever it emits stemStateChanged(index).
 * A category role for #209 can be appended after VolumeRole.
 */
class StemListModel : public QAbstractListModel {
    Q_OBJECT
public:
    enum Role {
        NameRole = Qt::UserRole + 1,
        MutedRole,
        SoloedRole,
        VolumeRole,
    };
    Q_ENUM(Role)

    explicit StemListModel(const AudioMixerViewModel& mixer, QObject* parent = nullptr);

    int rowCount(const QModelIndex& parent = QModelIndex()) const override;
    QVariant data(const QModelIndex& index, int role) const override;
    QHash<int, QByteArray> roleNames() const override;

    // Called by AudioMixerViewModel only.
    void beginResetStems();
    void endResetStems();
    void stemChanged(int row);

private:
    const AudioMixerViewModel& m_mixer;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_STEM_LIST_MODEL_HPP
