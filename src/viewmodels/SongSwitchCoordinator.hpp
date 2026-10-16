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
    SongSwitchCoordinator(SetlistViewModel& setlist, AudioMixerViewModel& mixer, QObject* parent = nullptr);

private:
    void onCurrentSongIndexChanged(int index);
    void preloadSongAfterCurrent();
    void onSetlistCleared();
    void onSongRemoved(int index);

    SetlistViewModel& m_setlist;
    AudioMixerViewModel& m_mixer;
    void resetShownSong();

    /// Setlist row last shown and the order generation it belongs to (bumped on every
    /// open or clear). A shift only counts as "same song" while a removal of an earlier
    /// row is in flight; matching on position keeps a reprise of the same song switchable.
    int m_shownIndex{-1};
    unsigned m_shownGeneration{0};
    unsigned m_generation{0};
    bool m_removalInFlight{false};
    /// Stem paths of the shown row; guards the case where the shown (last) row itself
    /// was removed and the index fell back to the previous, different song.
    std::vector<std::string> m_shownStems;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_QT_AVAILABLE
#endif // HARMONYSYNC_SONG_SWITCH_COORDINATOR_HPP
