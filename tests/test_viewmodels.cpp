#include "SetlistViewModel.hpp"
#include "AudioMixerViewModel.hpp"
#include "SlideDisplayViewModel.hpp"
#include <iostream>
#include <fstream>
#include <filesystem>
#include <cstdlib>
#include "test_check.hpp"

using namespace HarmonySync::Core;
using namespace HarmonySync::ViewModels;

void testSetlistViewModel() {
    std::cout << "[TEST] Running testSetlistViewModel..." << std::endl;
    SetlistViewModel vm;

    HS_CHECK(vm.titleStd() == "Sunday Service Order");
    HS_CHECK(vm.itemCount() == 0);
    HS_CHECK(vm.currentSongIndex() == -1);
    HS_CHECK(!vm.hasActiveSongMap());

#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.setTitle(QStringLiteral("Youth Night Worship"));
#else
    vm.setTitle("Youth Night Worship");
#endif
    HS_CHECK(vm.titleStd() == "Youth Night Worship");

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
    HS_CHECK(added == true);
    HS_CHECK(vm.itemCount() == 1);
    HS_CHECK(vm.currentSongIndex() == 0);
    HS_CHECK(vm.hasActiveSongMap() == true);

    vm.clearSetlist();
    HS_CHECK(vm.itemCount() == 0);
    HS_CHECK(vm.currentSongIndex() == -1);

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testSetlistViewModel passed." << std::endl;
}

void testLyricNavigation() {
    std::cout << "[TEST] Running testLyricNavigation..." << std::endl;
    SetlistViewModel vm;

    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "vm_song_folder_lyrics";
    std::filesystem::create_directories(tempDir);
    std::ofstream(tempDir / "Reference.wav") << "RIFF....WAVEfmt ";

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

    HS_CHECK(vm.masterVolume() == 1.0f);
    HS_CHECK(vm.pitchShiftSemitones() == 0);
    HS_CHECK(!vm.isPlaying());

    vm.setMasterVolume(0.85f);
    HS_CHECK(vm.masterVolume() == 0.85f);

    vm.setPitchShiftSemitones(3);
    HS_CHECK(vm.pitchShiftSemitones() == 3);

    MediaStem s1("1", "Drums", "d.wav");
    MediaStem s2("2", "Acoustic", "a.wav");
    vm.loadSongStems({s1, s2});
    HS_CHECK(vm.loadedStemCount() == 2);

    vm.play();
    HS_CHECK(vm.isPlaying() == true);

    vm.pause();
    HS_CHECK(!vm.isPlaying());

    vm.toggleStemMute(0); // mute drums
    HS_CHECK(vm.stemIsMuted(0) == true);

    vm.toggleStemSolo(1); // solo acoustic
    HS_CHECK(vm.stemIsSoloed(1) == true);
    
    vm.setStemVolume(0, 0.5f);
    HS_CHECK(vm.stemVolume(0) == 0.5f);

    std::cout << "[PASS] testAudioMixerViewModel passed." << std::endl;
}

void testAudioMixerCrossfading() {
    std::cout << "[TEST] Running testAudioMixerCrossfading..." << std::endl;
    AudioMixerViewModel vm;

    MediaStem s1("1", "Drums", "d.wav");
    vm.loadSongStems({s1});
    vm.play();
    HS_CHECK(vm.isPlaying() == true);
    HS_CHECK(vm.crossfadePosition() == 0.0f);

    MediaStem s2("2", "Acoustic", "a.wav");
    vm.loadNextSongStems({s2});
    
    vm.setCrossfadePosition(0.5f);
    HS_CHECK(vm.crossfadePosition() == 0.5f);
    
    // Simulate end of crossfade
    vm.setCrossfadePosition(1.0f);
    vm.finalizeCrossfade();
    
    // After finalize, crossfade is reset, and next deck is now active
    HS_CHECK(vm.crossfadePosition() == 0.0f);
    
    std::cout << "[PASS] testAudioMixerCrossfading passed." << std::endl;
}


void testLoadNextSongSwitchesToPreloaded() {
    std::cout << "[TEST] Running testLoadNextSongSwitchesToPreloaded..." << std::endl;
    AudioMixerViewModel vm;

    MediaStem songA("a1", "DrumsA", "song_a_drums.wav");
    MediaStem songB("b1", "DrumsB", "song_b_drums.wav");

    vm.loadSongStems({songA});
    vm.play();
    HS_CHECK(vm.isPlaying());

    HS_CHECK(vm.loadNextSongStems({songB}) == true);
    HS_CHECK(vm.isPlaying());
    HS_CHECK(vm.loadedStemCount() == 1);
#ifdef HARMONYSYNC_QT_AVAILABLE
    HS_CHECK(vm.stemName(0).toStdString() == "DrumsB");
#else
    HS_CHECK(vm.stemName(0) == "DrumsB");
#endif

    std::cout << "[PASS] testLoadNextSongSwitchesToPreloaded passed." << std::endl;
}

void testLoadNextSongWhileStoppedCues() {
    std::cout << "[TEST] Running testLoadNextSongWhileStoppedCues..." << std::endl;
    AudioMixerViewModel vm;

    // #202: opening a service order cues the first song.
    HS_CHECK(vm.loadNextSongStems({MediaStem("a1", "DrumsA", "song_a_drums.wav")}) == true);
    HS_CHECK(!vm.isPlaying());
    HS_CHECK(vm.positionSeconds() == 0.0);

    // Advancing while stopped cues the next song.
    HS_CHECK(vm.loadNextSongStems({MediaStem("b1", "DrumsB", "song_b_drums.wav")}) == true);
    HS_CHECK(!vm.isPlaying());
    HS_CHECK(vm.positionSeconds() == 0.0);
#ifdef HARMONYSYNC_QT_AVAILABLE
    HS_CHECK(vm.stemName(0).toStdString() == "DrumsB");
#else
    HS_CHECK(vm.stemName(0) == "DrumsB");
#endif

    std::cout << "[PASS] testLoadNextSongWhileStoppedCues passed." << std::endl;
}

void testAudioMixerInitialization() {
    std::cout << "[TEST] Running testAudioMixerInitialization..." << std::endl;
    AudioMixerViewModel vm;

    HS_CHECK(vm.loadedStemCount() == 0);

    // Simulate loading a song with many stems to ensure Repeater data is ready
    std::vector<MediaStem> stems;
    for (int i = 0; i < 10; ++i) {
        stems.emplace_back(std::to_string(i), "Stem " + std::to_string(i), "path.wav");
    }

    bool result = vm.loadSongStems(stems);
    HS_CHECK(result == true);
    
    // Verify properties bound to UI
    HS_CHECK(vm.loadedStemCount() == 10);
#ifdef HARMONYSYNC_QT_AVAILABLE
    HS_CHECK(vm.stemName(5).toStdString() == "Stem 5");
#else
    HS_CHECK(vm.stemName(5) == "Stem 5");
#endif

    std::cout << "[PASS] testAudioMixerInitialization passed." << std::endl;
}

void testBackgroundVideoUpdate() {
    std::cout << "[TEST] Running testBackgroundVideoUpdate..." << std::endl;
    AudioMixerViewModel vm;
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.setActiveBackgroundVideo(QStringLiteral("test_bg.mp4"));
    HS_CHECK(vm.activeBackgroundVideo().toStdString() == "test_bg.mp4");
#else
    vm.setActiveBackgroundVideo("test_bg.mp4");
    HS_CHECK(vm.activeBackgroundVideo() == "test_bg.mp4");
#endif
    
    std::cout << "[PASS] testBackgroundVideoUpdate passed." << std::endl;
}

void testSlideDisplayViewModel() {
    std::cout << "[TEST] Running testSlideDisplayViewModel..." << std::endl;
    SlideDisplayViewModel vm;

    HS_CHECK(vm.activeSlideIndex() == -1);
    HS_CHECK(vm.slideCount() == 0);
    HS_CHECK(!vm.isBlackScreen());

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
    HS_CHECK(loaded == true);
    HS_CHECK(vm.slideCount() == 2);
    HS_CHECK(vm.activeSlideIndex() == 0);

    vm.nextSlide();
    HS_CHECK(vm.activeSlideIndex() == 1);

    vm.previousSlide();
    HS_CHECK(vm.activeSlideIndex() == 0);

    vm.toggleBlackScreen();
    HS_CHECK(vm.isBlackScreen() == true);

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testSlideDisplayViewModel passed." << std::endl;
}

void testAILyricSyncIntegration() {
    std::cout << "[TEST] Running testAILyricSyncIntegration..." << std::endl;
    SetlistViewModel vm;
    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "hs_test_ai_sync";
    std::filesystem::create_directories(tempDir);
    std::ofstream(tempDir / "Reference.wav") << "RIFF....WAVEfmt ";
    
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
