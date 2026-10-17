#include "SetlistViewModel.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"

#include <QObject>
#include <filesystem>
#include <functional>
#include <memory>
#include <string>
#include <vector>

using namespace HarmonySync::ViewModels;
namespace fs = std::filesystem;

namespace {

fs::path makeSong(const fs::path& root, const std::string& directory, const std::string& title, bool withMap = true) {
    const fs::path folder = root / directory;
    fs::create_directories(folder);
    writeFile(folder / (title + "_Reference.wav"), "audio");
    writeFile(folder / (title + "_Click.wav"), "audio");
    writeFile(folder / (title + "_loop.mp4"), "video");
    if (withMap) {
        writeFile(folder / "song-map.json", R"({
            "title": "Amazing Grace",
            "artist": "Hymn",
            "sections": [
                {"name": "Verse", "lines": [
                    {"text": "Amazing grace", "timestampSeconds": 5.0},
                    {"text": "How sweet", "timestampSeconds": 10.0}
                ]},
                {"name": "Chorus", "lines": [
                    {"text": "Goodness", "timestampSeconds": 20.0}
                ]}
            ]
        })");
    }
    return folder;
}

void testOpenSelectLyricsAndPersistMap() {
    TempDir dir;
    const fs::path root = dir.path() / "Sunday Service";
    const fs::path songFolder = makeSong(root, "01_Song_AmazingGrace", "AmazingGrace");
    fs::create_directories(root / "02_Media_SermonSlides");
    writeFile(root / "service-map.json", R"({"playlist":{"url":"https://example.test/list"}})");

    int timestampRequests = 0;
    std::string referencePath;
    std::string multitrackPath;
    std::string lyricsSent;
    std::function<void(std::vector<HarmonySync::Core::TimedLyricLine>)> onSuccess;
    std::function<void(std::string)> onProgress;
    SetlistViewModel::AITimestampGenerator generator =
        [&](const std::string& reference, const std::string& multitrack, const std::string& lyrics,
            std::function<void(std::vector<HarmonySync::Core::TimedLyricLine>)> success,
            std::function<void(std::string)> error, std::function<void(std::string)> progress) {
            ++timestampRequests;
            referencePath = reference;
            multitrackPath = multitrack;
            lyricsSent = lyrics;
            if (timestampRequests == 1) {
                onSuccess = std::move(success);
                onProgress = std::move(progress);
            } else {
                error("fake failure");
            }
        };
    SetlistViewModel vm(nullptr, std::move(generator));
    int countChanges = 0;
    int indexChanges = 0;
    int opened = 0;
    int cleared = 0;
    QObject::connect(&vm, &SetlistViewModel::itemCountChanged, [&](int) { ++countChanges; });
    QObject::connect(&vm, &SetlistViewModel::currentSongIndexChanged, [&](int) { ++indexChanges; });
    QObject::connect(&vm, &SetlistViewModel::serviceOrderOpened, [&] { ++opened; });
    QObject::connect(&vm, &SetlistViewModel::setlistCleared, [&] { ++cleared; });

    HS_CHECK(vm.itemCount() == 0);
    HS_CHECK(vm.currentSongIndex() == -1);
    HS_CHECK(!vm.isLoading());
    HS_CHECK(!vm.hasActiveSongMap());
    HS_CHECK(vm.stemsAt(-1).empty());
    HS_CHECK(vm.itemNameAt(0).isEmpty());
    HS_CHECK(!vm.itemHasSongMapAt(0));
    HS_CHECK(vm.backgroundVideoPathAt(0).isEmpty());
    HS_CHECK(vm.currentLyricsContent().isEmpty());
    HS_CHECK(!vm.saveSongMapJson(QStringLiteral("{}")));
    HS_CHECK(!vm.openServiceOrderRootFolder(QString::fromStdString((dir.path() / "missing").string())));
    HS_CHECK(vm.itemCount() == 0);

    HS_CHECK(vm.openServiceOrderRootFolder(QString::fromStdString(root.string())));
    HS_CHECK(vm.itemCount() == 2);
    HS_CHECK(countChanges == 1);
    HS_CHECK(opened == 1);
    HS_CHECK(vm.title() == QStringLiteral("Sunday Service"));
    HS_CHECK(vm.currentSongIndex() == 0);
    HS_CHECK(vm.hasActiveSongMap());
    HS_CHECK(vm.itemNameAt(0) == QStringLiteral("Amazing Grace"));
    HS_CHECK(vm.itemHasSongMapAt(0));
    HS_CHECK(fs::path(vm.backgroundVideoPathAt(0).toStdString()) == songFolder / "AmazingGrace_loop.mp4");
    HS_CHECK(vm.stemsAt(0).size() == 2);
    HS_CHECK(vm.playlistUrl() == QStringLiteral("https://example.test/list"));
    HS_CHECK(vm.currentLyricsContent().contains(QStringLiteral("Amazing grace")));

    vm.setCurrentSongIndex(-2);
    vm.setCurrentSongIndex(2);
    vm.setCurrentSongIndex(0);
    HS_CHECK(vm.currentSongIndex() == 0);
    vm.setActiveLyricIndex(0);
    HS_CHECK(vm.activeLyricText() == QStringLiteral("[Verse]"));
    HS_CHECK(vm.nextLyricText() == QStringLiteral("Amazing grace\nHow sweet"));
    vm.setActiveLyricIndex(1);
    HS_CHECK(vm.activeLyricText() == QStringLiteral("Amazing grace\nHow sweet"));
    HS_CHECK(vm.nextLyricText() == QStringLiteral("Goodness"));
    vm.setAutoLyricsEnabled(true);
    HS_CHECK(vm.autoLyricsEnabled());
    vm.setActiveLyricIndex(1);
    vm.syncToPlaybackPosition(2.0);
    HS_CHECK(vm.activeLyricIndex() == 1);
    vm.syncToPlaybackPosition(5.0);
    HS_CHECK(vm.activeLyricIndex() == 1);
    vm.syncToPlaybackPosition(20.0);
    HS_CHECK(vm.activeLyricIndex() == 3);
    vm.setAutoLyricsEnabled(false);
    HS_CHECK(!vm.autoLyricsEnabled());

    vm.generateAITimestamps();
    HS_CHECK(timestampRequests == 1);
    HS_CHECK(vm.isGeneratingTimestamps());
    vm.generateAITimestamps();
    HS_CHECK(timestampRequests == 1);
    onProgress("Aligning verse");
    HS_CHECK(vm.aiSyncProgressMessage() == QStringLiteral("Aligning verse"));
    onSuccess({{7.0, "Amazing grace"}, {12.0, "How sweet"}, {22.0, "Goodness"}});
    HS_CHECK(fs::path(referencePath).filename() == "AmazingGrace_Reference.wav");
    HS_CHECK(fs::path(multitrackPath).filename() == "AmazingGrace_Click.wav");
    HS_CHECK(lyricsSent == "Amazing grace\nHow sweet\nGoodness\n");
    HS_CHECK(!vm.isGeneratingTimestamps());
    HS_CHECK(vm.aiSyncProgressMessage() == QStringLiteral("Success: Lyrics aligned!"));
    const std::string timestampedMap = readFile(songFolder / "song-map.json");
    HS_CHECK(timestampedMap.find("00:07.00") != std::string::npos);

    vm.generateAITimestamps();
    HS_CHECK(timestampRequests == 2);
    HS_CHECK(!vm.isGeneratingTimestamps());
    HS_CHECK(vm.aiSyncProgressMessage() == QStringLiteral("Error: fake failure"));

    HS_CHECK(!vm.saveSongMapJson(QStringLiteral("not json")));
    HS_CHECK(vm.saveSongMapJson(
        QStringLiteral(R"({"title":"Saved Grace","sections":[{"name":"Verse","lines":["Saved lyric"]}]})")));
    HS_CHECK(vm.itemNameAt(0) == QStringLiteral("Saved Grace"));
    HS_CHECK(vm.currentLyricsContent().contains(QStringLiteral("Saved lyric")));
    HS_CHECK(vm.currentSongMapJson().contains(QStringLiteral("Saved Grace")));
    HS_CHECK(indexChanges >= 1);

    vm.setCurrentSongIndex(1);
    HS_CHECK(vm.currentSongIndex() == 1);
    HS_CHECK(!vm.hasActiveSongMap());
    HS_CHECK(vm.stemsAt(1).empty());
    HS_CHECK(vm.currentLyricsContent().isEmpty());
    vm.setAutoLyricsEnabled(true);
    vm.syncToPlaybackPosition(60.0);
    HS_CHECK(vm.activeLyricIndex() == -1);
    vm.generateAITimestamps();
    HS_CHECK(timestampRequests == 2);
    HS_CHECK(!vm.isGeneratingTimestamps());
    HS_CHECK(vm.aiSyncProgressMessage().startsWith(QStringLiteral("Error: Missing")));
    vm.setAutoLyricsEnabled(false);
    vm.setCurrentSongIndex(0);
    const int previousIndex = vm.currentSongIndex();
    vm.removeSongAt(-1);
    vm.removeSongAt(2);
    HS_CHECK(vm.currentSongIndex() == previousIndex);
    vm.setCurrentSongIndex(1);
    vm.removeSongAt(0);
    HS_CHECK(vm.itemCount() == 1);
    HS_CHECK(vm.currentSongIndex() == 0);
    vm.removeSongAt(0);
    HS_CHECK(vm.itemCount() == 0);
    HS_CHECK(vm.currentSongIndex() == -1);
    vm.clearSetlist();
    HS_CHECK(cleared == 1);
    HS_CHECK(vm.itemCount() == 0);
}

void testAddSongFolderAndTitleSignals() {
    TempDir dir;
    const fs::path song = makeSong(dir.path(), "SongFolder", "SongFolder", false);
    SetlistViewModel vm;
    int titles = 0;
    int counts = 0;
    QObject::connect(&vm, &SetlistViewModel::titleChanged, [&](const QString&) { ++titles; });
    QObject::connect(&vm, &SetlistViewModel::itemCountChanged, [&](int) { ++counts; });
    HS_CHECK(vm.addSongFolder(QString::fromStdString(song.string())));
    HS_CHECK(vm.itemCount() == 1);
    HS_CHECK(vm.currentSongIndex() == 0);
    HS_CHECK(vm.itemNameAt(0) == QStringLiteral("SongFolder"));
    HS_CHECK(counts == 1);
    vm.setTitle(QStringLiteral("Custom"));
    vm.setTitle(QStringLiteral("Custom"));
    HS_CHECK(vm.title() == QStringLiteral("Custom"));
    HS_CHECK(titles == 1);
    HS_CHECK(!vm.addSongFolder(QString::fromStdString((dir.path() / "missing").string())));
}

void testAILyricSyncPrioritizesGuideOrSplitTrack() {
    TempDir dir;
    const fs::path root = dir.path() / "service";
    fs::create_directories(root);
    const fs::path songFolder = root / "01_Worship_Song";
    fs::create_directories(songFolder);

    writeFile(songFolder / "lyrics.txt", "Line 1\nLine 2\n");
    writeFile(songFolder / "Song_Reference.wav", "RIFF....WAVEfmt ");
    writeFile(songFolder / "Song_Click.wav", "RIFF....WAVEfmt ");
    writeFile(songFolder / "Song_Guide.wav", "RIFF....WAVEfmt ");

    std::string capturedMultitrack;
    SetlistViewModel::AITimestampGenerator generator =
        [&](const std::string& /*ref*/, const std::string& multi, const std::string& /*lyrics*/,
            std::function<void(std::vector<HarmonySync::Core::TimedLyricLine>)> success,
            std::function<void(std::string)> /*error*/,
            std::function<void(std::string)> /*progress*/) {
        capturedMultitrack = multi;
        if (success) {
            success({{0.0, "Line 1"}, {5.0, "Line 2"}});
        }
    };

    SetlistViewModel vm(nullptr, std::move(generator));
    HS_CHECK(vm.openServiceOrderRootFolder(QString::fromStdString(root.string())));
    vm.setCurrentSongIndex(0);
    vm.generateAITimestamps();

    // Must prioritize Guide or Split over Click for accurate count-in offset
    HS_CHECK(fs::path(capturedMultitrack).filename() == "Song_Guide.wav");
}

void testAILyricSyncFiltersMetadataFromLyrics() {
    TempDir dir;
    const fs::path root = dir.path() / "service";
    fs::create_directories(root);
    const fs::path songFolder = root / "01_Egypt";
    fs::create_directories(songFolder);

    writeFile(songFolder / "song-map.json", R"({
        "title": "Egypt",
        "sections": [
            {
                "name": "Intro",
                "lines": [
                    {"text": "Title: Egypt"},
                    {"text": "Key: D♭"},
                    {"text": "Tempo: 76 BPM"},
                    {"text": "Time Signature: 4/4"}
                ]
            },
            {
                "name": "Verse 1",
                "lines": [
                    {"text": "I won't forget, the wonder of how You brought"}
                ]
            }
        ]
    })");
    writeFile(songFolder / "Song_Reference.wav", "RIFF....WAVEfmt ");
    writeFile(songFolder / "Song_Guide.wav", "RIFF....WAVEfmt ");

    std::string passedLyrics;
    SetlistViewModel::AITimestampGenerator generator =
        [&](const std::string& /*ref*/, const std::string& /*multi*/, const std::string& lyrics,
            std::function<void(std::vector<HarmonySync::Core::TimedLyricLine>)> success,
            std::function<void(std::string)> /*error*/,
            std::function<void(std::string)> /*progress*/) {
        passedLyrics = lyrics;
        if (success) {
            success({{82.5, "I won't forget, the wonder of how You brought"}});
        }
    };

    SetlistViewModel vm(nullptr, std::move(generator));
    HS_CHECK(vm.openServiceOrderRootFolder(QString::fromStdString(root.string())));
    vm.setCurrentSongIndex(0);
    vm.generateAITimestamps();

    // The clean lyrics passed to the AI must not contain metadata lines
    HS_CHECK(passedLyrics.find("Key: D♭") == std::string::npos);
    HS_CHECK(passedLyrics.find("Tempo: 76 BPM") == std::string::npos);
    HS_CHECK(passedLyrics.find("Time Signature: 4/4") == std::string::npos);
    HS_CHECK(passedLyrics.find("I won't forget") != std::string::npos);

    // The metadata lines in Intro must NOT have received lyric timestamps
    HarmonySync::Core::FolderService folderService;
    auto reloaded = folderService.loadSongFromFolder(songFolder);
    HS_CHECK(reloaded.sections().size() >= 2);
    for (const auto& line : reloaded.sections()[0].lines) {
        HS_CHECK(line.timestampSeconds == 0.0);
    }
    // Only the actual lyric line in Verse 1 gets the timestamp
    HS_CHECK(reloaded.sections()[1].lines[0].timestampSeconds == 82.5);
}

} // namespace

int main() {
    testOpenSelectLyricsAndPersistMap();
    testAddSongFolderAndTitleSignals();
    testAILyricSyncPrioritizesGuideOrSplitTrack();
    testAILyricSyncFiltersMetadataFromLyrics();
    return 0;
}
