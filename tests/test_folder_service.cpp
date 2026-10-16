#include "FolderService.hpp"
#include <iostream>
#include <fstream>
#include <filesystem>
#include <cassert>
#include <cstdlib>
#include <sstream>
#include <stdexcept>
#include <string>
#include <type_traits>
#include <vector>
#include <unistd.h>

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
    jsonFile.seekg(0, std::ios::end);
    assert(jsonFile.tellg() > 0);
    jsonFile.close();

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testLyricsToSongMapConversion passed." << std::endl;
}

void testJsonParsing() {
    std::cout << "[TEST] Running testJsonParsing..." << std::endl;
    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "harmonysync_test_json";
    std::filesystem::create_directories(tempDir);

    std::ofstream json(tempDir / "song-map.json");
    json << R"({
        "title": "Test Title",
        "artist": "Test Artist",
        "backgroundVideo": "bg.mp4",
        "sections": [
            {
                "name": "Chorus",
                "lines": ["Line 1", "Line 2"]
            }
        ],
        "timedLyrics": [
            { "time": 0.0, "text": "[Chorus]" },
            { "time": 2.5, "text": "Line 1" },
            { "time": 5.0, "text": "Line 2" }
        ]
    })";
    json.close();

    FolderService folderSvc;
    SongMap song = folderSvc.loadSongFromFolder(tempDir);
    
    if (song.title() != "Test Title") throw std::runtime_error("Title mismatch");
    if (song.artist() != "Test Artist") throw std::runtime_error("Artist mismatch");
    if (song.backgroundVideoPath() != (tempDir / "bg.mp4").string()) throw std::runtime_error("Background video mismatch");
    if (song.lyricsContent().find("Line 1") == std::string::npos) throw std::runtime_error("Lyrics mismatch");
    if (song.timedLyrics().size() != 3) throw std::runtime_error("Timed lyrics count mismatch");
    if (song.timedLyrics()[1].timestampSeconds != 2.5) throw std::runtime_error("Timed lyrics time mismatch");
    if (song.timedLyrics()[1].text != "Line 1") throw std::runtime_error("Timed lyrics text mismatch");

    // Test save
    song.setTimedLyrics({
        {0.0, "[Chorus]"},
        {2.5, "Line 1"},
        {5.0, "Line 2"},
        {7.5, "Line 3 added"}
    });
    
    bool saved = FolderService::saveSongMap(song);
    if (!saved) throw std::runtime_error("saveSongMap failed");
    
    SongMap reloaded = folderSvc.loadSongFromFolder(tempDir);
    if (reloaded.timedLyrics().size() != 4) throw std::runtime_error("Reloaded timed lyrics count mismatch");
    if (reloaded.timedLyrics()[3].text != "Line 3 added") throw std::runtime_error("Reloaded timed lyrics text mismatch");

    std::filesystem::remove_all(tempDir);
    std::cout << "[PASS] testJsonParsing passed." << std::endl;
}

namespace {
std::string readAll(const std::filesystem::path& path) {
    std::ifstream in(path, std::ios::binary);
    std::ostringstream out;
    out << in.rdbuf();
    return out.str();
}

/// Calls saveMixState and reports its result; a void saveMixState cannot report failure.
template <typename... Args>
bool saveReported(bool& reported, Args&&... args) {
    if constexpr (std::is_same_v<decltype(FolderService::saveMixState(std::forward<Args>(args)...)), bool>) {
        reported = true;
        return FolderService::saveMixState(std::forward<Args>(args)...);
    } else {
        reported = false;
        FolderService::saveMixState(std::forward<Args>(args)...);
        return true;
    }
}
} // namespace

// saveMixState must say when mix.json could not be written, and must never leave an
// existing mix.json half-written (write to a temp file, then replace).
void testSaveMixStateReportsFailureAndKeepsOldFile() {
    std::cout << "[TEST] Running testSaveMixStateReportsFailureAndKeepsOldFile..." << std::endl;
    namespace fs = std::filesystem;
    const fs::path dir = fs::temp_directory_path() / ("harmonysync_test_mix_save_" + std::to_string(::getpid()));
    fs::remove_all(dir);
    fs::create_directories(dir);
    std::vector<MediaStem> stems = {MediaStem("d", "Drums", (dir / "Drums.wav").string())};
    bool failed = false;
    auto fail = [&failed](const char* what) {
        std::cerr << "FAIL: " << what << std::endl;
        failed = true;
    };

    bool reported = false;
    if (!saveReported(reported, dir.string(), stems)) fail("a save to a writable folder must succeed");
    if (!reported) fail("saveMixState returns void, so callers cannot tell a failed save");

    // Existing mix.json in a folder that is now read-only: the save cannot complete.
    // Root ignores directory permissions, so this case only means something as a normal user.
    if (::geteuid() == 0) {
        std::cout << "[SKIP] read-only folder case: running as root, permissions are not enforced" << std::endl;
    } else {
        stems[0].setMuted(true);
        const std::string before = readAll(dir / "mix.json");
        fs::permissions(dir, fs::perms::owner_read | fs::perms::owner_exec, fs::perm_options::replace);
        const bool savedReadOnly = saveReported(reported, dir.string(), stems);
        const std::string after = readAll(dir / "mix.json");
        fs::permissions(dir, fs::perms::owner_all, fs::perm_options::replace);
        if (savedReadOnly) fail("a save into a read-only folder must return false");
        if (after != before) fail("the existing mix.json was changed by a save that could not complete");
    }

    // Folder that does not exist (unwritable target).
    if (saveReported(reported, (dir / "missing" / "deeper").string(), stems))
        fail("a save into a missing folder must return false");

    fs::remove_all(dir);
    if (failed) throw std::runtime_error("testSaveMixStateReportsFailureAndKeepsOldFile failed");
    std::cout << "[PASS] testSaveMixStateReportsFailureAndKeepsOldFile passed." << std::endl;
}

int main() {
    try {
        testFolderScanningWithDummyFiles();
        testLyricsToSongMapConversion();
        testJsonParsing();
        testSaveMixStateReportsFailureAndKeepsOldFile();
        std::cout << "\nALL FOLDER SERVICE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in folder service unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
