#include "SetlistViewModel.hpp"
#include <iostream>
#include <filesystem>
#include <fstream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::ViewModels;

void testQmlServiceReflow() {
    std::cout << "[TEST] Running testQmlServiceReflow..." << std::endl;

    std::filesystem::path rootDir = std::filesystem::temp_directory_path() / "test_qml_reflow_service";
    std::filesystem::remove_all(rootDir);
    std::filesystem::create_directories(rootDir);

    // 01_Worship_Song (with audio stem) -> hasActiveSongMap = true -> StemMixer visible
    // 02_Announcement_Media (media only) -> hasActiveSongMap = false -> StemMixer collapsed
    std::filesystem::path songPath = rootDir / "01_Worship_Song";
    std::filesystem::path mediaPath = rootDir / "02_Announcement_Media";
    std::filesystem::create_directories(songPath);
    std::filesystem::create_directories(mediaPath);

    {
        std::ofstream wav(songPath / "guitar.wav");
        wav << "AUDIO_DATA";
    }

    {
        std::ofstream img(mediaPath / "announcement.png");
        img << "IMAGE_DATA";
    }

    SetlistViewModel vm;
#ifdef HARMONYSYNC_QT_AVAILABLE
    bool opened = vm.openServiceOrderRootFolder(QString::fromStdString(rootDir.string()));
#else
    bool opened = vm.openServiceOrderRootFolder(rootDir.string());
#endif
    assert(opened == true);
    assert(vm.itemCount() == 2);

    // Select Song Item 0 -> StemMixer should be active
    vm.setCurrentSongIndex(0);
    assert(vm.hasActiveSongMap() == true);

    // Select Media Item 1 -> StemMixer should be hidden/collapsed
    vm.setCurrentSongIndex(1);
    assert(vm.hasActiveSongMap() == false);

    // Clean up
    std::filesystem::remove_all(rootDir);

    std::cout << "[PASS] testQmlServiceReflow passed." << std::endl;
}

int main() {
    try {
        testQmlServiceReflow();
        std::cout << "\nALL SPRINT 23 QML SERVICE REFLOW UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in QML Service Reflow unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
