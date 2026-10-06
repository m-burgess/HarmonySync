#include "SetlistViewModel.hpp"
#include "AudioMixerViewModel.hpp"
#include "SlideDisplayViewModel.hpp"
#include <iostream>
#include <fstream>
#include <filesystem>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;
using namespace HarmonySync::ViewModels;

void testSetlistViewModel() {
    std::cout << "[TEST] Running testSetlistViewModel..." << std::endl;
    SetlistViewModel vm;

    assert(vm.titleStd() == "Sunday Service Order");
    assert(vm.itemCount() == 0);
    assert(vm.currentSongIndex() == -1);
    assert(!vm.hasActiveSongMap());

#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.setTitle(QStringLiteral("Youth Night Worship"));
#else
    vm.setTitle("Youth Night Worship");
#endif
    assert(vm.titleStd() == "Youth Night Worship");

    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "vm_song_folder";
    std::filesystem::create_directories(tempDir);

    std::ofstream stem(tempDir / "Click.wav");
    stem << "RIFF....WAVEfmt ";
    stem.close();

#ifdef HARMONYSYNC_QT_AVAILABLE
    bool added = vm.addSongFolder(QString::fromStdString(tempDir.string()));
#else
    bool added = vm.addSongFolder(tempDir.string());
#endif
    assert(added == true);
    assert(vm.itemCount() == 1);
    assert(vm.currentSongIndex() == 0);
    assert(vm.hasActiveSongMap() == true);

    vm.clearSetlist();
    assert(vm.itemCount() == 0);
    assert(vm.currentSongIndex() == -1);

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testSetlistViewModel passed." << std::endl;
}

void testLyricNavigation() {
    std::cout << "[TEST] Running testLyricNavigation..." << std::endl;
    SetlistViewModel vm;

    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "vm_song_folder_lyrics";
    std::filesystem::create_directories(tempDir);

    std::ofstream json(tempDir / "song-map.json");
    json << R"({
        "title": "Lyrics Test",
        "sections": [
            {
                "name": "VERSE 1",
                "lines": ["Line 1", "Line 2"]
            },
            {
                "name": "CHORUS",
                "lines": ["Chorus Line"]
            }
        ]
    })";
    json.close();

#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.addSongFolder(QString::fromStdString(tempDir.string()));
#else
    vm.addSongFolder(tempDir.string());
#endif

    // The lyrics content should be generated:
    // [VERSE 1]\nLine 1\nLine 2\n\n[CHORUS]\nChorus Line\n\n
    // So Blocks should be: "[VERSE 1]", "Line 1\nLine 2", "[CHORUS]", "Chorus Line"
    
    vm.setActiveLyricIndex(1);

#ifdef HARMONYSYNC_QT_AVAILABLE
    if (vm.activeLyricText().toStdString() != "Line 1\nLine 2") throw std::runtime_error("activeLyricText mismatch");
    if (vm.nextLyricText().toStdString() != "Chorus Line") throw std::runtime_error("nextLyricText mismatch");

    vm.setActiveLyricIndex(3);
    if (vm.activeLyricText().toStdString() != "Chorus Line") throw std::runtime_error("activeLyricText mismatch 2");
    if (vm.nextLyricText().toStdString() != "") throw std::runtime_error("nextLyricText mismatch 2");
#else
    if (vm.activeLyricText() != "Line 1\nLine 2") throw std::runtime_error("activeLyricText mismatch");
    if (vm.nextLyricText() != "Chorus Line") throw std::runtime_error("nextLyricText mismatch");

    vm.setActiveLyricIndex(3);
    if (vm.activeLyricText() != "Chorus Line") throw std::runtime_error("activeLyricText mismatch 2");
    if (vm.nextLyricText() != "") throw std::runtime_error("nextLyricText mismatch 2");
#endif

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testLyricNavigation passed." << std::endl;
}

void testAudioMixerViewModel() {
    std::cout << "[TEST] Running testAudioMixerViewModel..." << std::endl;
    AudioMixerViewModel vm;

    assert(vm.masterVolume() == 1.0f);
    assert(vm.pitchShiftSemitones() == 0);
    assert(!vm.isPlaying());

    vm.setMasterVolume(0.85f);
    assert(vm.masterVolume() == 0.85f);

    vm.setPitchShiftSemitones(3);
    assert(vm.pitchShiftSemitones() == 3);

    MediaStem s1("1", "Drums", "d.wav");
    MediaStem s2("2", "Acoustic", "a.wav");
    vm.loadSongStems({s1, s2});
    assert(vm.loadedStemCount() == 2);

    vm.play();
    assert(vm.isPlaying() == true);

    vm.pause();
    assert(!vm.isPlaying());

    vm.toggleStemMute(0); // mute drums
    assert(vm.stemIsMuted(0) == true);

    vm.toggleStemSolo(1); // solo acoustic
    assert(vm.stemIsSoloed(1) == true);
    
    vm.setStemVolume(0, 0.5f);
    assert(vm.stemVolume(0) == 0.5f);

    std::cout << "[PASS] testAudioMixerViewModel passed." << std::endl;
}

void testAudioMixerCrossfading() {
    std::cout << "[TEST] Running testAudioMixerCrossfading..." << std::endl;
    AudioMixerViewModel vm;

    MediaStem s1("1", "Drums", "d.wav");
    vm.loadSongStems({s1});
    vm.play();
    assert(vm.isPlaying() == true);
    assert(vm.crossfadePosition() == 0.0f);

    MediaStem s2("2", "Acoustic", "a.wav");
    vm.loadNextSongStems({s2});
    
    vm.setCrossfadePosition(0.5f);
    assert(vm.crossfadePosition() == 0.5f);
    
    // Simulate end of crossfade
    vm.setCrossfadePosition(1.0f);
    vm.finalizeCrossfade();
    
    // After finalize, crossfade is reset, and next deck is now active
    assert(vm.crossfadePosition() == 0.0f);
    
    std::cout << "[PASS] testAudioMixerCrossfading passed." << std::endl;
}


void testLoadNextSongSwitchesToPreloaded() {
    std::cout << "[TEST] Running testLoadNextSongSwitchesToPreloaded..." << std::endl;
    AudioMixerViewModel vm;

    MediaStem songA("a1", "DrumsA", "song_a_drums.wav");
    MediaStem songB("b1", "DrumsB", "song_b_drums.wav");

    vm.loadSongStems({songA});
    vm.play();
    assert(vm.isPlaying());

    assert(vm.loadNextSongStems({songB}) == true);
    assert(vm.isPlaying());
    assert(vm.loadedStemCount() == 1);
#ifdef HARMONYSYNC_QT_AVAILABLE
    assert(vm.stemName(0).toStdString() == "DrumsB");
#else
    assert(vm.stemName(0) == "DrumsB");
#endif

    std::cout << "[PASS] testLoadNextSongSwitchesToPreloaded passed." << std::endl;
}

void testLoadNextSongWhileStoppedCues() {
    std::cout << "[TEST] Running testLoadNextSongWhileStoppedCues..." << std::endl;
    AudioMixerViewModel vm;

    // #202: opening a service order cues the first song.
    assert(vm.loadNextSongStems({MediaStem("a1", "DrumsA", "song_a_drums.wav")}) == true);
    assert(!vm.isPlaying());
    assert(vm.positionSeconds() == 0.0);

    // Advancing while stopped cues the next song.
    assert(vm.loadNextSongStems({MediaStem("b1", "DrumsB", "song_b_drums.wav")}) == true);
    assert(!vm.isPlaying());
    assert(vm.positionSeconds() == 0.0);
#ifdef HARMONYSYNC_QT_AVAILABLE
    assert(vm.stemName(0).toStdString() == "DrumsB");
#else
    assert(vm.stemName(0) == "DrumsB");
#endif

    std::cout << "[PASS] testLoadNextSongWhileStoppedCues passed." << std::endl;
}

void testAudioMixerInitialization() {
    std::cout << "[TEST] Running testAudioMixerInitialization..." << std::endl;
    AudioMixerViewModel vm;

    assert(vm.loadedStemCount() == 0);

    // Simulate loading a song with many stems to ensure Repeater data is ready
    std::vector<MediaStem> stems;
    for (int i = 0; i < 10; ++i) {
        stems.emplace_back(std::to_string(i), "Stem " + std::to_string(i), "path.wav");
    }

    bool result = vm.loadSongStems(stems);
    assert(result == true);
    
    // Verify properties bound to UI
    assert(vm.loadedStemCount() == 10);
#ifdef HARMONYSYNC_QT_AVAILABLE
    assert(vm.stemName(5).toStdString() == "Stem 5");
#else
    assert(vm.stemName(5) == "Stem 5");
#endif

    std::cout << "[PASS] testAudioMixerInitialization passed." << std::endl;
}

void testBackgroundVideoUpdate() {
    std::cout << "[TEST] Running testBackgroundVideoUpdate..." << std::endl;
    AudioMixerViewModel vm;
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.setActiveBackgroundVideo(QStringLiteral("test_bg.mp4"));
    assert(vm.activeBackgroundVideo().toStdString() == "test_bg.mp4");
#else
    vm.setActiveBackgroundVideo("test_bg.mp4");
    assert(vm.activeBackgroundVideo() == "test_bg.mp4");
#endif
    
    std::cout << "[PASS] testBackgroundVideoUpdate passed." << std::endl;
}

void testSlideDisplayViewModel() {
    std::cout << "[TEST] Running testSlideDisplayViewModel..." << std::endl;
    SlideDisplayViewModel vm;

    assert(vm.activeSlideIndex() == -1);
    assert(vm.slideCount() == 0);
    assert(!vm.isBlackScreen());

    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "vm_slide_folder";
    std::filesystem::create_directories(tempDir);

    std::ofstream img1(tempDir / "Slide1.jpg");
    img1 << "JPEG...";
    img1.close();

    std::ofstream img2(tempDir / "Slide2.png");
    img2 << "PNG...";
    img2.close();

#ifdef HARMONYSYNC_QT_AVAILABLE
    bool loaded = vm.loadSlideFolder(QString::fromStdString(tempDir.string()));
#else
    bool loaded = vm.loadSlideFolder(tempDir.string());
#endif
    assert(loaded == true);
    assert(vm.slideCount() == 2);
    assert(vm.activeSlideIndex() == 0);

    vm.nextSlide();
    assert(vm.activeSlideIndex() == 1);

    vm.previousSlide();
    assert(vm.activeSlideIndex() == 0);

    vm.toggleBlackScreen();
    assert(vm.isBlackScreen() == true);

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testSlideDisplayViewModel passed." << std::endl;
}

void testAILyricSyncIntegration() {
    std::cout << "[TEST] Running testAILyricSyncIntegration..." << std::endl;
    SetlistViewModel vm;
    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "hs_test_ai_sync";
    std::filesystem::create_directories(tempDir);
    
    std::ofstream json(tempDir / "song-map.json");
    json << R"({
        "title": "Sync Test",
        "sections": [ { "name": "VERSE", "lines": ["L1", "L2"] } ],
        "timedLyrics": [
            { "time": 0.0, "text": "[VERSE]" },
            { "time": 2.0, "text": "L1" },
            { "time": 4.0, "text": "L2" }
        ]
    })";
    json.close();
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.addSongFolder(QString::fromStdString(tempDir.string()));
#else
    vm.addSongFolder(tempDir.string());
#endif

#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.setAutoLyricsEnabled(true);
    vm.syncToPlaybackPosition(1.5);
    if (vm.activeLyricIndex() != 0) throw std::runtime_error("Playback sync failed 1.5");
    
    vm.syncToPlaybackPosition(2.5);
    if (vm.activeLyricIndex() != 1) throw std::runtime_error("Playback sync failed 2.5");
    
    vm.syncToPlaybackPosition(4.5);
    if (vm.activeLyricIndex() != 1) throw std::runtime_error("Playback sync failed 4.5");
#else
    vm.setAutoLyricsEnabled(true);
    vm.syncToPlaybackPosition(1.5);
    if (vm.activeLyricIndex() != 0) throw std::runtime_error("Playback sync failed 1.5");
    
    vm.syncToPlaybackPosition(2.5);
    if (vm.activeLyricIndex() != 1) throw std::runtime_error("Playback sync failed 2.5");
    
    vm.syncToPlaybackPosition(4.5);
    if (vm.activeLyricIndex() != 1) throw std::runtime_error("Playback sync failed 4.5");
#endif

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testAILyricSyncIntegration passed." << std::endl;
}

int main() {
    try {
        testSetlistViewModel();
        testLyricNavigation();
        testAudioMixerViewModel();
        testAudioMixerCrossfading();
        testLoadNextSongSwitchesToPreloaded();
        testLoadNextSongWhileStoppedCues();
        testAudioMixerInitialization();
        testBackgroundVideoUpdate();
        testSlideDisplayViewModel();
        testAILyricSyncIntegration();
        std::cout << "\nALL VIEWMODEL UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in viewmodel unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
