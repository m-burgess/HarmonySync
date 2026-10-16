#include "ChordTransposer.hpp"
#include <vector>
#include <algorithm>
#include <regex>

namespace HarmonySync::Core {

static const std::vector<std::string> CHROMATIC_SCALE = {"C",  "C#", "D",  "Eb", "E",  "F",
                                                         "F#", "G",  "G#", "A",  "Bb", "B"};

// Returns 0-11 index of the root note. Returns -1 if invalid.
static int getNoteIndex(const std::string& note) {
    for (size_t i = 0; i < CHROMATIC_SCALE.size(); ++i) {
        if (CHROMATIC_SCALE[i] == note) {
            return static_cast<int>(i);
        }
    }
    // Handle flats that map to sharps
    if (note == "Db") {
        return 1;
    }
    if (note == "D#") {
        return 3;
    }
    if (note == "Gb") {
        return 6;
    }
    if (note == "Ab") {
        return 8;
    }
    if (note == "A#") {
        return 10;
    }
    return -1;
}

std::string ChordTransposer::nashvilleToStandard(const std::string& nashville, const std::string& targetKey) {
    if (nashville.empty() || targetKey.empty()) {
        return nashville;
    }

    int rootIdx = getNoteIndex(targetKey);
    if (rootIdx == -1) {
        return nashville; // Invalid key
    }

    // Parse the nashville string, e.g., "1", "6m", "4/1"
    std::regex rx(R"(^([1-7])(.*)$)");
    std::smatch match;

    if (std::regex_search(nashville, match, rx)) {
        int degree = std::stoi(match[1].str());
        std::string modifier = match[2].str();

        // Major scale half-step intervals: W, W, H, W, W, W, H -> 2, 2, 1, 2, 2, 2, 1
        static const int scaleIntervals[] = {0, 2, 4, 5, 7, 9, 11};

        if (degree >= 1 && degree <= 7) {
            int noteIdx = (rootIdx + scaleIntervals[degree - 1]) % 12;
            return CHROMATIC_SCALE[noteIdx] + modifier;
        }
    }

    return nashville;
}

std::string ChordTransposer::suggestCapoKey(const std::string& originalKey) {
    int rootIdx = getNoteIndex(originalKey);
    if (rootIdx == -1) {
        return "C"; // Default to C
    }

    // We want to suggest either C (0) or G (7)
    // Keys that fit C well (Capo 1-5): Db, D, Eb, E, F
    // Keys that fit G well (Capo 1-4): Ab, A, Bb, B
    if (rootIdx >= 1 && rootIdx <= 5) {
        return "C";
    }
    return "G";
}

std::string ChordTransposer::toCagedLeadShape(const std::string& standardChord) {
    if (standardChord.empty()) {
        return standardChord;
    }

    // Very simplistic CAGED mapper for lead guitar > 5th fret using C, A, D shapes.
    // For a real app, this would calculate the fret position.
    // For demo purposes, we map root notes to a suitable shape.
    std::string root;
    if (standardChord.size() > 1 && (standardChord[1] == '#' || standardChord[1] == 'b')) {
        root = standardChord.substr(0, 2);
    } else {
        root = standardChord.substr(0, 1);
    }

    int rootIdx = getNoteIndex(root);
    if (rootIdx == -1) {
        return standardChord;
    }

    std::string shape = "A"; // Default

    // Assign a shape that typically falls around the 5th-10th fret.
    // C shape roots: E(5), F(6), F#(7), G(8), Ab(9), A(10)
    // A shape roots: D(5), Eb(6), E(7), F(8), F#(9), G(10)
    // D shape roots: G(5), Ab(6), A(7), Bb(8), B(9), C(10)

    if (rootIdx >= 7 && rootIdx <= 11) { // G, G#, A, Bb, B
        shape = "D";
    } else if (rootIdx >= 2 && rootIdx <= 6) { // D, Eb, E, F, F#
        shape = "A";
    } else { // C, C#
        shape = "C";
    }

    return standardChord + " [" + shape + "-shape]";
}

} // namespace HarmonySync::Core
