#ifndef HARMONYSYNC_SONG_SWITCH_COORDINATOR_HPP
#define HARMONYSYNC_SONG_SWITCH_COORDINATOR_HPP

#include "AudioMixerViewModel.hpp"
#include "SetlistViewModel.hpp"

#include <string>
#include <vector>

#ifdef HARMONYSYNC_QT_AVAILABLE

namespace HarmonySync::ViewModels {

/**
 * @brief Connects setlist selection to song audio (#187, #220).
 *
 * Moved out of main.cpp so the wiring can be tested. Owns no domain rules: it only
 * tells AudioMixerViewModel which song to show and which song to get ready next.
 */
class SongSwitchCoordinator : public QObject {
    Q_OBJECT
public:
    SongSwitchCoordinator(SetlistViewModel& setlist, AudioMixerViewModel& mixer,
                          QObject* parent = nullptr);

private:
    void onCurrentSongIndexChanged(int index);
    void preloadSongAfterCurrent();
    void onSetlistCleared();
    void onSongRemoved(int index);

    SetlistViewModel& m_setlist;
    AudioMixerViewModel& m_mixer;
    /// File paths of the song last shown, so an index shift does not reload it.
    std::vector<std::string> m_shownSong;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_QT_AVAILABLE
#endif // HARMONYSYNC_SONG_SWITCH_COORDINATOR_HPP
