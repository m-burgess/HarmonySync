#include "MediaStem.hpp"
#include "SongMap.hpp"
#include "SlideItem.hpp"
#include "ServiceOrder.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testMediaStem() {
    std::cout << "[TEST] Running testMediaStem..." << std::endl;
    MediaStem stem("stem-1", "Drums", "/path/to/drums.wav");

    assert(stem.id() == "stem-1");
    assert(stem.name() == "Drums");
    assert(stem.filePath() == "/path/to/drums.wav");
    assert(stem.volume() == 1.0f);
    assert(!stem.isMuted());
    assert(!stem.isSolo());

    stem.setVolume(0.75f);
    assert(stem.volume() == 0.75f);

    stem.setMuted(true);
    assert(stem.isMuted());

    stem.setPitchShiftSemitones(-2);
    assert(stem.pitchShiftSemitones() == -2);

    // Test copy constructor (Pimpl deep copy)
    MediaStem copiedStem = stem;
    assert(copiedStem.id() == "stem-1");
    assert(copiedStem.volume() == 0.75f);
    assert(copiedStem.isMuted() == true);

    std::cout << "[PASS] testMediaStem passed cleanly." << std::endl;
}

void testSongMap() {
    std::cout << "[TEST] Running testSongMap..." << std::endl;
    SongMap song("song-101", "Amazing Grace", "John Newton");

    assert(song.id() == "song-101");
    assert(song.title() == "Amazing Grace");
    assert(song.artist() == "John Newton");
    assert(!song.hasSongMap());

    song.setKeys("G", "A");
    assert(song.originalKey() == "G");
    assert(song.currentKey() == "A");

    song.setTempoBpm(72.5);
    assert(song.tempoBpm() == 72.5);

    MediaStem vStem("v1", "Vocals", "/audio/vocals.wav");
    song.addStem(vStem);
    assert(song.stems().size() == 1);
    assert(song.stems()[0].name() == "Vocals");

    song.setLyricsContent("Amazing grace how sweet the sound...");
    assert(!song.lyricsContent().empty());

    std::cout << "[PASS] testSongMap passed cleanly." << std::endl;
}

void testServiceOrder() {
    std::cout << "[TEST] Running testServiceOrder..." << std::endl;
    ServiceOrder order("so-2026", "Sunday Morning Service", "2026-08-09");

    assert(order.id() == "so-2026");
    assert(order.title() == "Sunday Morning Service");
    assert(order.dateString() == "2026-08-09");
    assert(order.songs().empty());

    SongMap song1("s1", "Song One", "Artist A");
    SongMap song2("s2", "Song Two", "Artist B");
    order.addSong(song1);
    order.addSong(song2);

    assert(order.songs().size() == 2);
    assert(order.songs()[0].title() == "Song One");
    assert(order.songs()[1].title() == "Song Two");

    order.removeSongAt(0);
    assert(order.songs().size() == 1);
    assert(order.songs()[0].title() == "Song Two");

    std::cout << "[PASS] testServiceOrder passed cleanly." << std::endl;
}

int main() {
    try {
        testMediaStem();
        testSongMap();
        testServiceOrder();
        std::cout << "\nALL MODEL UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in model unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
