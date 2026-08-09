#include "FolderService.hpp"
#include <iostream>
#include <fstream>
#include <filesystem>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testFolderScanningWithDummyFiles() {
    std::cout << "[TEST] Running testFolderScanningWithDummyFiles..." << std::endl;
    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "harmonysync_test_song";
    std::filesystem::create_directories(tempDir);

    // Create dummy stem wav files
    std::ofstream wav1(tempDir / "Drums.wav");
    wav1 << "RIFF....WAVEfmt ";
    wav1.close();

    std::ofstream wav2(tempDir / "Vocals.wav");
    wav2 << "RIFF....WAVEfmt ";
    wav2.close();

    // Create dummy lyrics file
    std::ofstream lyrics(tempDir / "lyrics.txt");
    lyrics << "Amazing grace how sweet the sound";
    lyrics.close();

    FolderService folderSvc;
    assert(folderSvc.isSongFolder(tempDir) == true);

    SongMap song = folderSvc.loadSongFromFolder(tempDir);
    assert(song.hasSongMap() == true);
    assert(song.stems().size() == 2);
    assert(!song.lyricsContent().empty());

    // Clean up temporary directory
    std::filesystem::remove_all(tempDir);

    std::cout << "[PASS] testFolderScanningWithDummyFiles passed." << std::endl;
}

int main() {
    try {
        testFolderScanningWithDummyFiles();
        std::cout << "\nALL FOLDER SERVICE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in folder service unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
