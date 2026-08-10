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
    vm.toggleStemSolo(1); // solo acoustic

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

int main() {
    try {
        testSetlistViewModel();
        testAudioMixerViewModel();
        testAudioMixerCrossfading();
        testSlideDisplayViewModel();
        std::cout << "\nALL VIEWMODEL UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in viewmodel unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
