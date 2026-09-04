#ifndef HARMONYSYNC_CHORD_TRANSPOSER_HPP
#define HARMONYSYNC_CHORD_TRANSPOSER_HPP

#include <string>

namespace HarmonySync::Core {

class ChordTransposer {
public:
    /**
     * @brief Translates a Nashville Number System chord (e.g., "1", "6m") to a standard chord string (e.g., "C", "Am").
     * @param nashville The input chord in Nashville Number notation.
     * @param targetKey The root key to transpose into (e.g., "C", "G#").
     * @return The standard chord string.
     */
    static std::string nashvilleToStandard(const std::string& nashville, const std::string& targetKey);

    /**
     * @brief Suggests a Capo key (either C or G) for a given original key.
     * @param originalKey The actual key of the song.
     * @return "C" or "G" depending on which is closest to standard Capo usage.
     */
    static std::string suggestCapoKey(const std::string& originalKey);

    /**
     * @brief Translates a standard chord into its corresponding CAGED shape (C, A, or D) above the 5th fret.
     * @param standardChord The standard chord string (e.g., "G", "F#m").
     * @return A string indicating the shape, e.g., "G (D-shape)".
     */
    static std::string toCagedLeadShape(const std::string& standardChord);
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_CHORD_TRANSPOSER_HPP
