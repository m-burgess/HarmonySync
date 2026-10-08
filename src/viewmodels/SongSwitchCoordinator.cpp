#include "SongSwitchCoordinator.hpp"

#ifdef HARMONYSYNC_QT_AVAILABLE

namespace HarmonySync::ViewModels {

SongSwitchCoordinator::SongSwitchCoordinator(SetlistViewModel& setlist,
                                             AudioMixerViewModel& mixer, QObject* parent)
    : QObject(parent), m_setlist(setlist), m_mixer(mixer)
{
    connect(&m_setlist, &SetlistViewModel::currentSongIndexChanged, this,
            &SongSwitchCoordinator::onCurrentSongIndexChanged);
}

void SongSwitchCoordinator::onCurrentSongIndexChanged(int index) {
    if (index < 0) {
        return;
    }
    const QString videoPath = m_setlist.backgroundVideoPathAt(index);
    m_mixer.setActiveBackgroundVideo(videoPath);
    m_mixer.loadNextBackgroundVideo(videoPath);
    m_mixer.loadNextSongStems(m_setlist.stemsAt(index));
}

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_QT_AVAILABLE
