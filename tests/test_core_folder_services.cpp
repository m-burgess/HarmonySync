#include "ConfigService.hpp"
#include "FolderService.hpp"
#include "ServiceOrderFolderScanner.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"

#include <algorithm>
#include <iostream>
#include <memory>
#include <set>
#include <utility>

using namespace HarmonySync::Core;
namespace fs = std::filesystem;

namespace {

// FolderService: song folders

void testIsSongFolder() {
    FolderService svc;
    TempDir dir;

    HS_CHECK(!svc.isSongFolder(dir.path() / "missing"));

    writeFile(dir.path() / "file.wav", "x");
    HS_CHECK(!svc.isSongFolder(dir.path() / "file.wav"));

    fs::create_directories(dir.path() / "empty");
    HS_CHECK(!svc.isSongFolder(dir.path() / "empty"));

    writeFile(dir.path() / "notes" / "lyrics.txt", "words");
    HS_CHECK(!svc.isSongFolder(dir.path() / "notes"));

    writeFile(dir.path() / "upper" / "Track.WAV", "x");
    HS_CHECK(svc.isSongFolder(dir.path() / "upper"));

    writeFile(dir.path() / "mp3" / "Track.mp3", "x");
    HS_CHECK(svc.isSongFolder(dir.path() / "mp3"));
}

void testLoadSongFromMissingFolderReturnsDefaults() {
    FolderService svc;
    TempDir dir;
    SongMap song = svc.loadSongFromFolder(dir.path() / "nope");
    HS_CHECK(song.id() == "nope");
    HS_CHECK(song.title() == "nope");
    HS_CHECK(song.artist() == "Unknown Artist");
    HS_CHECK(song.stems().empty());
    HS_CHECK(!song.hasSongMap());
}

void testLoadSongStemsPanningAndOrdering() {
    FolderService svc;
    TempDir dir;
    for (const char* name : {"Vocals.wav", "Click.wav", "Guide.mp3", "Split Pad.ogg", "Stereo Keys.flac", "Bass.m4a"}) {
        writeFile(dir.path() / name, "x");
    }
    writeFile(dir.path() / "bg.mp4", "x");
    writeFile(dir.path() / "readme.txt", "notes");
    fs::create_directories(dir.path() / "subdir");

    SongMap song = svc.loadSongFromFolder(dir.path());
    HS_CHECK(song.hasSongMap());
    HS_CHECK(song.stems().size() == 6);
    HS_CHECK(song.lyricsContent() == "notes");
    HS_CHECK(fs::path(song.backgroundVideoPath()).filename() == "bg.mp4");

    const auto& stems = song.stems();
    HS_CHECK(stems[0].name() == "Click");
    HS_CHECK(stems[0].pan() == -1.0f);
    HS_CHECK(stems[1].name() == "Guide");
    HS_CHECK(stems[1].pan() == -1.0f);
    // The rest are alphabetical (case-insensitive).
    HS_CHECK(stems[2].name() == "Bass");
    HS_CHECK(stems[2].pan() == 1.0f);
    HS_CHECK(stems[3].name() == "Split Pad");
    HS_CHECK(stems[3].pan() == 0.0f);
    HS_CHECK(stems[4].name() == "Stereo Keys");
    HS_CHECK(stems[4].pan() == 0.0f);
    HS_CHECK(stems[5].name() == "Vocals");
    for (std::size_t i = 0; i < stems.size(); ++i) {
        HS_CHECK(stems[i].id() == std::to_string(i + 1));
    }
}

void testLoadSongAppliesSavedMixState() {
    FolderService svc;
    TempDir dir;
    writeFile(dir.path() / "Bass.wav", "x");
    writeFile(dir.path() / "Vocals.wav", "x");
    writeFile(dir.path() / "mix.json",
              R"({"stems": {"Bass": {"volume": 0.25, "pan": -0.5, "muted": true, "solo": true, "pitchShift": 2}}})");

    SongMap song = svc.loadSongFromFolder(dir.path());
    HS_CHECK(song.stems().size() == 2);
    const MediaStem& bass = song.stems()[0];
    HS_CHECK(bass.name() == "Bass");
    HS_CHECK(bass.volume() == 0.25f);
    HS_CHECK(bass.pan() == -0.5f);
    HS_CHECK(bass.isMuted());
    HS_CHECK(bass.isSolo());
    HS_CHECK(bass.pitchShiftSemitones() == 2);
    HS_CHECK(song.stems()[1].volume() == 1.0f);
}

void testLoadSongUsesInjectedConfigService() {
    TempDir dir;
    writeFile(dir.path() / "Track.wav", "x");
    FolderService withConfig(std::make_shared<ConfigService>());
    HS_CHECK(withConfig.loadSongFromFolder(dir.path()).stems().size() == 1);

    FolderService withNull(nullptr);
    HS_CHECK(withNull.loadSongFromFolder(dir.path()).stems().size() == 1);
}

void testLoadSongMapJsonFields() {
    FolderService svc;
    TempDir dir;
    writeFile(dir.path() / "song-map.json", R"({
        "title": "Great Song",
        "artist": "The Band",
        "bpm": 98.5,
        "key": "E",
        "timing": "6/8",
        "length": "4:10",
        "lyricsURL": "https://example.test/lyrics",
        "backgroundVideo": "loop.mp4",
        "sections": [
            {"name": "Verse", "chords": "E A", "lines": [
                "plain line",
                {"text": "colon time", "timestamp": "1:02.5", "nextSlideMidiNote": "60", "lightSceneMidiNote": "61"},
                {"text": "plain seconds", "timestamp": "12.5"},
                {"text": "numeric seconds", "timestampSeconds": 20.0},
                {"text": "bad time", "timestamp": "a:b"}
            ]},
            {"lines": ["unnamed"]}
        ],
        "timedLyrics": [
            {"time": "0:05", "text": "string time"},
            {"time": 7.5, "text": "numeric time"},
            {"time": 9.0},
            {"text": "no time"}
        ]
    })");

    SongMap song = svc.loadSongFromFolder(dir.path());
    HS_CHECK(song.title() == "Great Song");
    HS_CHECK(song.artist() == "The Band");
    HS_CHECK(song.tempoBpm() == 98.5);
    HS_CHECK(song.originalKey() == "E");
    HS_CHECK(song.currentKey() == "E");
    HS_CHECK(song.timing() == "6/8");
    HS_CHECK(song.length() == "4:10");
    HS_CHECK(song.lyricsURL() == "https://example.test/lyrics");
    HS_CHECK(fs::path(song.backgroundVideoPath()) == dir.path() / "loop.mp4");

    HS_CHECK(song.sections().size() == 2);
    const SongSection& verse = song.sections()[0];
    HS_CHECK(verse.name == "Verse");
    HS_CHECK(verse.chords == "E A");
    HS_CHECK(verse.lines.size() == 5);
    HS_CHECK(verse.lines[0].text == "plain line");
    HS_CHECK(verse.lines[1].timestampSeconds == 62.5);
    HS_CHECK(verse.lines[1].nextSlideMidiNote == "60");
    HS_CHECK(verse.lines[1].lightSceneMidiNote == "61");
    HS_CHECK(verse.lines[2].timestampSeconds == 12.5);
    HS_CHECK(verse.lines[3].timestampSeconds == 20.0);
    HS_CHECK(verse.lines[4].timestampSeconds == 0.0);
    HS_CHECK(song.lyricsContent().find("[Verse]\nplain line\n") != std::string::npos);

    HS_CHECK(song.timedLyrics().size() == 2);
    HS_CHECK(song.timedLyrics()[0].timestampSeconds == 5.0);
    HS_CHECK(song.timedLyrics()[1].timestampSeconds == 7.5);
}

void testLoadSongMapJsonFallbacks() {
    FolderService svc;
    TempDir dir;
    writeFile(dir.path() / "song-map.json", R"({"title": "Old Map", "originalKey": "G", "backgroundVideo": ""})");
    SongMap song = svc.loadSongFromFolder(dir.path());
    HS_CHECK(song.title() == "Old Map");
    HS_CHECK(song.artist() == "Unknown Artist");
    HS_CHECK(song.originalKey() == "G");
    HS_CHECK(song.backgroundVideoPath().empty());

    TempDir untitled;
    writeFile(untitled.path() / "song-map.json", R"({"bpm": 70})");
    SongMap noTitle = svc.loadSongFromFolder(untitled.path());
    HS_CHECK(noTitle.title() == untitled.path().filename().string());
    HS_CHECK(noTitle.tempoBpm() == 70.0);

    TempDir notObject;
    writeFile(notObject.path() / "song-map.json", "[1, 2, 3]");
    HS_CHECK(svc.loadSongFromFolder(notObject.path()).title() == notObject.path().filename().string());
}

// FolderService: slides

void testLoadSlides() {
    FolderService svc;
    TempDir dir;
    HS_CHECK(svc.loadSlidesFromFolder(dir.path() / "missing").empty());

    writeFile(dir.path() / "a.PNG", "x");
    writeFile(dir.path() / "b.jpg", "x");
    writeFile(dir.path() / "c.webp", "x");
    writeFile(dir.path() / "d.mp4", "x");
    writeFile(dir.path() / "ignored.txt", "x");
    fs::create_directories(dir.path() / "subdir");
    writeFile(dir.path() / "config.json",
              R"({"loopImages": true, "autoplayBackgroundVideo": false, "youtubeLinks": ["https://youtu.be/a"]})");

    auto slides = svc.loadSlidesFromFolder(dir.path());
    HS_CHECK(slides.size() == 5);

    std::set<std::string> titles;
    for (const auto& slide : slides) {
        titles.insert(slide.title());
        if (slide.type() == SlideType::Image) {
            HS_CHECK(slide.loopImages());
        } else if (slide.type() == SlideType::Video) {
            HS_CHECK(!slide.autoplayBackgroundVideo());
        }
    }
    HS_CHECK(titles == (std::set<std::string>{"a", "b", "c", "d", "YouTube Stream"}));

    const SlideItem& youtube = slides.back();
    HS_CHECK(youtube.type() == SlideType::YouTube);
    HS_CHECK(youtube.contentPath() == "https://youtu.be/a");
    HS_CHECK(youtube.id() == "5");
}

// FolderService: mix state

void testMixStateRoundTrip() {
    TempDir dir;
    MediaStem bass("1", "Bass", "/bass.wav");
    bass.setVolume(0.3f);
    bass.setPan(0.5f);
    bass.setMuted(true);
    bass.setSolo(true);
    bass.setPitchShiftSemitones(-3);
    MediaStem vocals("2", "Vocals", "/vocals.wav");

    FolderService::saveMixState(dir.path().string(), {bass, vocals});
    HS_CHECK(fs::exists(dir.path() / "mix.json"));

    std::vector<MediaStem> fresh{MediaStem("1", "Bass", "/bass.wav"), MediaStem("2", "Vocals", "/vocals.wav"),
                                 MediaStem("3", "Unknown", "/unknown.wav")};
    FolderService::applyMixState(dir.path().string(), fresh);
    HS_CHECK(fresh[0].volume() == 0.3f);
    HS_CHECK(fresh[0].pan() == 0.5f);
    HS_CHECK(fresh[0].isMuted());
    HS_CHECK(fresh[0].isSolo());
    HS_CHECK(fresh[0].pitchShiftSemitones() == -3);
    HS_CHECK(fresh[1].volume() == 1.0f);
    HS_CHECK(fresh[2].volume() == 1.0f);
}

void testMixStateEdgeCases() {
    TempDir dir;
    std::vector<MediaStem> stems{MediaStem("1", "Bass", "/bass.wav")};

    FolderService::saveMixState("", stems);
    FolderService::saveMixState(dir.path().string(), {});
    HS_CHECK(!fs::exists(dir.path() / "mix.json"));

    FolderService::applyMixState(dir.path().string(), stems);
    HS_CHECK(stems[0].volume() == 1.0f);

    writeFile(dir.path() / "mix.json", "not json");
    FolderService::applyMixState(dir.path().string(), stems);
    HS_CHECK(stems[0].volume() == 1.0f);

    writeFile(dir.path() / "mix.json", R"({"stems": {"Bass": {}}})");
    FolderService::applyMixState(dir.path().string(), stems);
    HS_CHECK(stems[0].volume() == 1.0f);
}

// FolderService: lyrics conversion

void testConvertLyricsToSongMap() {
    TempDir dir;
    HS_CHECK(!FolderService::convertLyricsToSongMap(dir.path()));

    writeFile(dir.path() / "lyrics.txt",
              "Title:  My Song\nBPM: 90\nOriginal Key: D\n\nintro line\n[Verse 1]\n[Chords: D G]\nfirst line\n  "
              "second line  \n[Chorus]\nBPM: nonsense\nsing it\n");
    HS_CHECK(FolderService::convertLyricsToSongMap(dir.path()));
    HS_CHECK(fs::exists(dir.path() / "song-map.json"));

    FolderService svc;
    SongMap song = svc.loadSongFromFolder(dir.path());
    HS_CHECK(song.title() == "My Song");
    HS_CHECK(song.tempoBpm() == 90.0);
    HS_CHECK(song.originalKey() == "D");
    HS_CHECK(song.sections().size() == 3);
    HS_CHECK(song.sections()[0].name == "Intro");
    HS_CHECK(song.sections()[1].name == "Verse 1");
    HS_CHECK(song.sections()[1].chords == "D G");
    HS_CHECK(song.sections()[1].lines.size() == 2);
    HS_CHECK(song.sections()[1].lines[1].text == "second line");
    HS_CHECK(song.sections()[2].name == "Chorus");

    // An existing song-map.json is never overwritten.
    writeFile(dir.path() / "song-map.json", "{}");
    HS_CHECK(FolderService::convertLyricsToSongMap(dir.path()));
    HS_CHECK(readFile(dir.path() / "song-map.json") == "{}");
}

void testConvertLyricsWithoutLeadingContent() {
    TempDir dir;
    writeFile(dir.path() / "lyrics.txt", "[Verse]\nonly line\n");
    HS_CHECK(FolderService::convertLyricsToSongMap(dir.path()));
    SongMap song = FolderService().loadSongFromFolder(dir.path());
    HS_CHECK(song.sections().size() == 1);
    HS_CHECK(song.sections()[0].name == "Verse");
}

// FolderService: saving song maps

void testSaveSongMapRequiresFolder() {
    HS_CHECK(!FolderService::saveSongMap(SongMap("id", "Title", "Artist")));
}

void testSaveSongMapRoundTrip() {
    TempDir dir;
    writeFile(dir.path() / "song-map.json", R"({"custom": "kept", "timedLyrics": [{"time": 1.0, "text": "stale"}]})");

    SongMap song("id", "Saved Title", "Saved Artist");
    song.setFolderPath(dir.path().string());
    song.setTempoBpm(101.0);
    song.setKeys("A", "A");
    song.setTiming("3/4");
    song.setLength("3:30");
    song.setLyricsURL("https://example.test/l");
    song.setBackgroundVideoPath((dir.path() / "bg.mp4").string());

    SongSection verse;
    verse.name = "Verse";
    verse.chords = "A D";
    verse.lines.push_back(SongLine{"line one", 3.25, "62", "63"});
    verse.lines.push_back(SongLine{"line two", 0.0, "", ""});
    song.setSections({verse, SongSection{}});

    HS_CHECK(FolderService::saveSongMap(song));
    std::string text = readFile(dir.path() / "song-map.json");
    HS_CHECK(text.find("\"custom\": \"kept\"") != std::string::npos);
    HS_CHECK(text.find("stale") == std::string::npos);

    SongMap reloaded = FolderService().loadSongFromFolder(dir.path());
    HS_CHECK(reloaded.title() == "Saved Title");
    HS_CHECK(reloaded.artist() == "Saved Artist");
    HS_CHECK(reloaded.tempoBpm() == 101.0);
    HS_CHECK(reloaded.originalKey() == "A");
    HS_CHECK(reloaded.timing() == "3/4");
    HS_CHECK(reloaded.length() == "3:30");
    HS_CHECK(fs::path(reloaded.backgroundVideoPath()).filename() == "bg.mp4");
    HS_CHECK(reloaded.sections().size() == 2);
    HS_CHECK(reloaded.sections()[0].lines[0].timestampSeconds == 3.25);
    HS_CHECK(reloaded.sections()[0].lines[0].nextSlideMidiNote == "62");
    HS_CHECK(reloaded.sections()[0].lines[0].lightSceneMidiNote == "63");
    HS_CHECK(reloaded.sections()[0].lines[1].timestampSeconds == 0.0);
}

void testSaveSongMapTimedLyricsAndDefaults() {
    TempDir dir;
    SongMap song("id", "Title", "Artist");
    song.setFolderPath(dir.path().string());
    song.setKeys("", "");
    song.setTempoBpm(0.0);
    song.setTimedLyrics({TimedLyricLine{65.5, "late line"}});
    HS_CHECK(FolderService::saveSongMap(song));

    std::string text = readFile(dir.path() / "song-map.json");
    HS_CHECK(text.find("\"key\": \"C\"") != std::string::npos);
    HS_CHECK(text.find("\"bpm\"") == std::string::npos);
    HS_CHECK(text.find("\"backgroundVideo\": \"\"") != std::string::npos);
    HS_CHECK(text.find("01:05.50") != std::string::npos);

    SongMap reloaded = FolderService().loadSongFromFolder(dir.path());
    HS_CHECK(reloaded.timedLyrics().size() == 1);
    HS_CHECK(reloaded.timedLyrics()[0].timestampSeconds == 65.5);
}

void testFolderServiceMove() {
    FolderService a;
    FolderService b(std::move(a));
    FolderService c;
    c = std::move(b);
    TempDir dir;
    HS_CHECK(!c.isSongFolder(dir.path()));
}

// ServiceOrderFolderScanner

void testScannerMissingRoot() {
    ServiceOrderFolderScanner scanner;
    TempDir dir;
    ServiceOrder order = scanner.scanServiceOrderDirectory(dir.path() / "missing");
    HS_CHECK(order.songs().empty());
    HS_CHECK(order.dateString().empty());

    writeFile(dir.path() / "file.txt", "x");
    HS_CHECK(scanner.scanServiceOrderDirectory(dir.path() / "file.txt").songs().empty());
}

void testScannerSortsSubfoldersAndReadsPlaylist() {
    TempDir dir;
    fs::path root = dir.path() / "2026-10-18";
    writeFile(root / "02_Second" / "Track.wav", "x");
    writeFile(root / "01_First" / "Track.wav", "x");
    writeFile(root / "03_Third" / "Track.wav", "x");
    writeFile(root / "loose.txt", "ignored");
    writeFile(root / "service-map.json", R"({"playlist": {"url": "https://example.test/playlist"}})");

    ServiceOrderFolderScanner scanner(std::make_shared<FolderService>());
    ServiceOrder order = scanner.scanServiceOrderDirectory(root);
    HS_CHECK(order.dateString() == "2026-10-18");
    HS_CHECK(order.playlistUrl() == "https://example.test/playlist");
    HS_CHECK(order.songs().size() == 3);
    HS_CHECK(order.songs()[0].title() == "01_First");
    HS_CHECK(order.songs()[1].title() == "02_Second");
    HS_CHECK(order.songs()[2].title() == "03_Third");
}

void testScannerServiceMapVariants() {
    ServiceOrderFolderScanner scanner(nullptr);

    TempDir noPlaylist;
    writeFile(noPlaylist.path() / "service-map.json", R"({"other": 1})");
    HS_CHECK(scanner.scanServiceOrderDirectory(noPlaylist.path()).playlistUrl().empty());

    TempDir noUrl;
    writeFile(noUrl.path() / "service-map.json", R"({"playlist": {}})");
    HS_CHECK(scanner.scanServiceOrderDirectory(noUrl.path()).playlistUrl().empty());

    TempDir notObject;
    writeFile(notObject.path() / "service-map.json", "[]");
    HS_CHECK(scanner.scanServiceOrderDirectory(notObject.path()).playlistUrl().empty());
}

void testScannerMove() {
    ServiceOrderFolderScanner a;
    ServiceOrderFolderScanner b(std::move(a));
    ServiceOrderFolderScanner c;
    c = std::move(b);
    TempDir dir;
    HS_CHECK(c.scanServiceOrderDirectory(dir.path()).songs().empty());
}

} // namespace

int main() {
    testIsSongFolder();
    testLoadSongFromMissingFolderReturnsDefaults();
    testLoadSongStemsPanningAndOrdering();
    testLoadSongAppliesSavedMixState();
    testLoadSongUsesInjectedConfigService();
    testLoadSongMapJsonFields();
    testLoadSongMapJsonFallbacks();
    testLoadSlides();
    testMixStateRoundTrip();
    testMixStateEdgeCases();
    testConvertLyricsToSongMap();
    testConvertLyricsWithoutLeadingContent();
    testSaveSongMapRequiresFolder();
    testSaveSongMapRoundTrip();
    testSaveSongMapTimedLyricsAndDefaults();
    testFolderServiceMove();
    testScannerMissingRoot();
    testScannerSortsSubfoldersAndReadsPlaylist();
    testScannerServiceMapVariants();
    testScannerMove();
    std::cout << "ALL CORE FOLDER SERVICE TESTS PASSED" << std::endl;
    return EXIT_SUCCESS;
}
