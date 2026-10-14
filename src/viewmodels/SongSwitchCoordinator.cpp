#include "SongSwitchCoordinator.hpp"

#ifdef HARMONYSYNC_QT_AVAILABLE

namespace HarmonySync::ViewModels {

namespace {
std::vector<std::string> stemPaths(const std::vector<Core::MediaStem>& stems) {
    std::vector<std::string> paths;
    for (const auto& stem : stems) paths.push_back(stem.filePath());
    return paths;
}
} // namespace

SongSwitchCoordinator::SongSwitchCoordinator(SetlistViewModel& setlist,
                                             AudioMixerViewModel& mixer, QObject* parent)
    : QObject(parent), m_setlist(setlist), m_mixer(mixer)
{
    // #220: a new service order always starts stopped, so its first song is cued at 0
    // (the switch keeps the play state). Emitted before the first song is selected.
    // #185: drop the old order's next song first, so it is never held alongside the new one.
    connect(&m_setlist, &SetlistViewModel::serviceOrderOpened, this, [this] { m_shownSong.clear(); });
    connect(&m_setlist, &SetlistViewModel::serviceOrderOpened, &m_mixer, &AudioMixerViewModel::clearPreloadedSong);
    connect(&m_setlist, &SetlistViewModel::serviceOrderOpened, &m_mixer, &AudioMixerViewModel::stop);
    connect(&m_setlist, &SetlistViewModel::setlistCleared, this, &SongSwitchCoordinator::onSetlistCleared);
    connect(&m_setlist, &SetlistViewModel::songRemoved, this, &SongSwitchCoordinator::onSongRemoved);
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
    // Removing an earlier song shifts the index of the same song; nothing to switch.
    const auto key = stemPaths(m_setlist.stemsAt(index));
    if (!key.empty() && key == m_shownSong) {
        return;
    }
    m_shownSong = key;
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

void SongSwitchCoordinator::onSetlistCleared() {
    // #185: nothing is left to play; free the next song, then the current one.
    m_shownSong.clear();
    m_mixer.clearPreloadedSong();
    m_mixer.unloadCurrentSong();
}

void SongSwitchCoordinator::onSongRemoved(int /*index*/) {
    const int current = m_setlist.currentSongIndex();
    // A switch to the current song may still be waiting on its decode; keep it.
    if (current >= 0 && m_mixer.isPreloadedSong(m_setlist.stemsAt(current))) {
        return;
    }
    const int next = current + 1;
    if (next > 0 && next < m_setlist.itemCount() && m_mixer.isPreloadedSong(m_setlist.stemsAt(next))) {
        return; // the next song is still the preloaded one
    }
    // #185: the preloaded song was removed (or moved): drop it and get the new next one ready.
    // A pending advance is the user's choice and survives a removal.
    m_mixer.clearPreloadedSongKeepingPendingAdvance();
    preloadSongAfterCurrent();
}

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_QT_AVAILABLE
