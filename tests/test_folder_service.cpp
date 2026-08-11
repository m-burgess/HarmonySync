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

void testLyricsToSongMapConversion() {
    std::cout << "[TEST] Running testLyricsToSongMapConversion..." << std::endl;
    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "harmonysync_test_lyrics";
    std::filesystem::create_directories(tempDir);

    std::ofstream lyrics(tempDir / "lyrics.txt");
    lyrics << "[Verse 1]\nAmazing grace how sweet the sound\nThat saved a wretch like me\n\n[Chorus]\nGrace grace God's grace\n";
    lyrics.close();

    FolderService folderSvc;
    // loadSongFromFolder should trigger convertLyricsToSongMap internally
    folderSvc.loadSongFromFolder(tempDir);

    std::filesystem::path jsonPath = tempDir / "song-map.json";
    assert(std::filesystem::exists(jsonPath) == true);

    // Basic verification of JSON contents (size should be > 0)
    std::ifstream jsonFile(jsonPath);
    std::string content((std::istreambuf_iterator<char>(jsonFile)), std::istreambuf_iterator<char>());
    assert(content.find("\"Verse 1\"") != std::string::npos);
    assert(content.find("Amazing grace") != std::string::npos);
    assert(content.find("\"Chorus\"") != std::string::npos);

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testLyricsToSongMapConversion passed." << std::endl;
}

int main() {
    try {
        testFolderScanningWithDummyFiles();
        testLyricsToSongMapConversion();
        std::cout << "\nALL FOLDER SERVICE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in folder service unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
