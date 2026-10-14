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
    connect(&m_setlist, &SetlistViewModel::serviceOrderOpened, this, &SongSwitchCoordinator::resetShownSong);
    // removeSongAt emits itemCountChanged, then (for an earlier row) the shifted index,
    // then songRemoved: a drop in count marks a removal until songRemoved arrives.
    m_lastItemCount = m_setlist.itemCount();
    connect(&m_setlist, &SetlistViewModel::itemCountChanged, this, [this](int count) {
        m_removalInFlight = count < m_lastItemCount;
        m_lastItemCount = count;
    });
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
    // Removing an earlier row shifts the shown song up one place; nothing to switch.
    // Anything else (including a reprise of the same song) is a real switch.
    const bool shiftedByRemoval = m_removalInFlight && m_shownGeneration == m_generation &&
                                  m_shownIndex >= 0 && index == m_shownIndex - 1 &&
                                  stemPaths(m_setlist.stemsAt(index)) == m_shownStems;
    m_shownIndex = index;
    m_shownStems = stemPaths(m_setlist.stemsAt(index));
    m_shownGeneration = m_generation;
    if (shiftedByRemoval) {
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

void SongSwitchCoordinator::onSetlistCleared() {
    // #185: nothing is left to play; free the next song, then the current one.
    resetShownSong();
    m_mixer.clearPreloadedSong();
    m_mixer.unloadCurrentSong();
}

void SongSwitchCoordinator::resetShownSong() {
    ++m_generation;
    m_shownIndex = -1;
    m_shownStems.clear();
    m_removalInFlight = false;
}

void SongSwitchCoordinator::onSongRemoved(int /*index*/) {
    m_removalInFlight = false;
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
