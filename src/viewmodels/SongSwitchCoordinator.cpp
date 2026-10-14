#include "SongSwitchCoordinator.hpp"

#ifdef HARMONYSYNC_QT_AVAILABLE

namespace HarmonySync::ViewModels {

SongSwitchCoordinator::SongSwitchCoordinator(SetlistViewModel& setlist,
                                             AudioMixerViewModel& mixer, QObject* parent)
    : QObject(parent), m_setlist(setlist), m_mixer(mixer)
{
    // #220: a new service order always starts stopped, so its first song is cued at 0
    // (the switch keeps the play state). Emitted before the first song is selected.
    connect(&m_setlist, &SetlistViewModel::serviceOrderOpened, &m_mixer, &AudioMixerViewModel::stop);
    connect(&m_setlist, &SetlistViewModel::currentSongIndexChanged, this,
            &SongSwitchCoordinator::onCurrentSongIndexChanged);
    // #187: as soon as a song is current, get the one after it ready.
    connect(&m_mixer, &AudioMixerViewModel::songSwitched, this,
            &SongSwitchCoordinator::preloadSongAfterCurrent);
}

void SongSwitchCoordinator::onCurrentSongIndexChanged(int index) {
    if (index < 0) {
        return;
    }
    const QString videoPath = m_setlist.backgroundVideoPathAt(index);
    m_mixer.setActiveBackgroundVideo(videoPath);
    m_mixer.loadNextBackgroundVideo(videoPath);
    // Switches now if this song was preloaded, otherwise when its decode is ready.
    m_mixer.showSong(m_setlist.stemsAt(index));
}

void SongSwitchCoordinator::preloadSongAfterCurrent() {
    const int next = m_setlist.currentSongIndex() + 1;
    if (next > 0 && next < m_setlist.itemCount()) {
        m_mixer.preloadNextSong(m_setlist.stemsAt(next));
    }
}

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_QT_AVAILABLE
