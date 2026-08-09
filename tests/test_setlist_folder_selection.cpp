#include "SetlistViewModel.hpp"
#include <iostream>
#include <filesystem>
#include <fstream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::ViewModels;

void testSetlistFolderSelection() {
    std::cout << "[TEST] Running testSetlistFolderSelection..." << std::endl;

    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "test_setlist_selection_dir";
    std::filesystem::remove_all(tempDir);
    std::filesystem::create_directories(tempDir);

    // Create 2 subfolders
    std::filesystem::path songSub = tempDir / "01_Song_AmazingGrace";
    std::filesystem::path mediaSub = tempDir / "02_Media_SermonSlides";
    std::filesystem::create_directories(songSub);
    std::filesystem::create_directories(mediaSub);

    {
        std::ofstream wav(songSub / "audio.wav");
        wav << "AUDIO";
    }

    {
        std::ofstream img(mediaSub / "slide.png");
        img << "IMAGE";
    }

    SetlistViewModel vm;
    assert(!vm.hasActiveSongMap());

#ifdef HARMONYSYNC_QT_AVAILABLE
    bool opened = vm.openServiceOrderRootFolder(QString::fromStdString(tempDir.string()));
#else
    bool opened = vm.openServiceOrderRootFolder(tempDir.string());
#endif
    assert(opened == true);
    assert(vm.itemCount() == 2);

    // Index 0: 01_Song_AmazingGrace (has song map)
    vm.setCurrentSongIndex(0);
    assert(vm.currentSongIndex() == 0);
    assert(vm.hasActiveSongMap() == true);
    assert(vm.itemHasSongMapAt(0) == true);

    // Index 1: 02_Media_SermonSlides (media only, NO song map)
    vm.setCurrentSongIndex(1);
    assert(vm.currentSongIndex() == 1);
    assert(vm.hasActiveSongMap() == false);
    assert(vm.itemHasSongMapAt(1) == false);

    // Cleanup
    std::filesystem::remove_all(tempDir);

    std::cout << "[PASS] testSetlistFolderSelection passed." << std::endl;
}

int main() {
    try {
        testSetlistFolderSelection();
        std::cout << "\nALL SPRINT 22 SETLIST FOLDER SELECTION UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Setlist Folder Selection unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
