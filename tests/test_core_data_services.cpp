#include "ChordTransposer.hpp"
#include "ConfigService.hpp"
#include "LocalDatabaseService.hpp"
#include "LocalizationService.hpp"
#include "SettingsStorageService.hpp"
#include "SongLibraryIndexService.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"

#include <algorithm>
#include <iostream>
#include <utility>

using namespace HarmonySync::Core;

namespace {

// ConfigService

void testConfigParsesBooleansAndLyricsLink() {
    ConfigService svc;
    ServiceItemConfig cfg = svc.parseConfigJson(
        R"({"loopImages": true, "autoplayBackgroundVideo": false, "lyricsLink": "https://example.test/l"})");
    HS_CHECK(cfg.loopImages);
    HS_CHECK(!cfg.autoplayBackgroundVideo);
    HS_CHECK(cfg.lyricsLink == "https://example.test/l");
    HS_CHECK(cfg.youtubeLinks.empty());
    HS_CHECK(cfg.isValid);
}

void testConfigParsesYoutubeLinkForms() {
    ConfigService svc;

    ServiceItemConfig single = svc.parseConfigJson(R"({"youtubeLinks": "https://youtu.be/a"})");
    HS_CHECK(single.youtubeLinks.size() == 1);
    HS_CHECK(single.youtubeLinks[0] == "https://youtu.be/a");

    ServiceItemConfig array = svc.parseConfigJson(R"({"youtubeLinks": ["https://youtu.be/a", 'https://youtu.be/b']})");
    HS_CHECK(array.youtubeLinks.size() == 2);
    HS_CHECK(array.youtubeLinks[1] == "https://youtu.be/b");

    ServiceItemConfig none = svc.parseConfigJson("{}");
    HS_CHECK(none.youtubeLinks.empty());
    HS_CHECK(!none.loopImages);
    HS_CHECK(none.autoplayBackgroundVideo);
}

void testConfigTemplateRoundTripsToDefaults() {
    ConfigService svc;
    std::string tpl = svc.generateTemplateJson();
    HS_CHECK(tpl.find("youtubeLinks") != std::string::npos);
    ServiceItemConfig cfg = svc.parseConfigJson(tpl);
    HS_CHECK(cfg.youtubeLinks.empty());
    HS_CHECK(!cfg.loopImages);
    HS_CHECK(cfg.autoplayBackgroundVideo);
}

void testConfigLoadFromDirectory() {
    ConfigService svc;
    TempDir dir;

    ServiceItemConfig missing = svc.loadConfigFromDirectory(dir.path());
    HS_CHECK(missing.isValid);
    HS_CHECK(!missing.loopImages);

    writeFile(dir.path() / "config.json", R"({"loopImages": true})");
    HS_CHECK(svc.loadConfigFromDirectory(dir.path()).loopImages);
}

void testConfigCreateTemplate() {
    ConfigService svc;
    TempDir dir;

    HS_CHECK(!svc.createConfigTemplate(dir.path() / "does-not-exist"));
    HS_CHECK(svc.createConfigTemplate(dir.path()));
    HS_CHECK(readFile(dir.path() / "config.json") == svc.generateTemplateJson());

    writeFile(dir.path() / "config.json", "custom");
    HS_CHECK(!svc.createConfigTemplate(dir.path()));
    HS_CHECK(readFile(dir.path() / "config.json") == "custom");
}

void testConfigMove() {
    ConfigService a;
    ConfigService b(std::move(a));
    ConfigService c;
    c = std::move(b);
    HS_CHECK(c.parseConfigJson(R"({"loopImages": true})").loopImages);
}

// SettingsStorageService

void testSettingsStoragePaths() {
    SettingsStorageService defaults;
    HS_CHECK(defaults.defaultFilePath() == "/tmp/harmonysync_settings.json");

    SettingsStorageService custom("/tmp/custom_settings.json");
    HS_CHECK(custom.defaultFilePath() == "/tmp/custom_settings.json");
}

void testSettingsStorageRoundTripUsesDefaultPath() {
    TempDir dir;
    std::string path = (dir.path() / "settings.json").string();
    SettingsStorageService storage(path);

    AppSettings original;
    original.setPresentationDisplayIndex(3);
    original.setConfidenceDisplayIndex(4);
    original.setLyricsFontSize(60);
    original.setLowerThirdFontSize(30);
    original.setMarginOffsetX(11);
    original.setMarginOffsetY(22);
    HS_CHECK(storage.saveSettings(original));

    AppSettings loaded = storage.loadSettings();
    HS_CHECK(loaded.presentationDisplayIndex() == 3);
    HS_CHECK(loaded.confidenceDisplayIndex() == 4);
    HS_CHECK(loaded.lyricsFontSize() == 60);
    HS_CHECK(loaded.lowerThirdFontSize() == 30);
    HS_CHECK(loaded.marginOffsetX() == 11);
    HS_CHECK(loaded.marginOffsetY() == 22);
}

void testSettingsStorageWritesAllFields() {
    TempDir dir;
    std::string path = (dir.path() / "settings.json").string();
    SettingsStorageService storage;

    AppSettings settings;
    settings.setResolution(1280, 720);
    settings.setFontFamily("Roboto");
    settings.setTextColorHex("#00FF00");
    settings.setVerticalAlignment(TextVerticalAlignment::Top);
    settings.setHorizontalAlignment(TextHorizontalAlignment::Right);
    HS_CHECK(storage.saveSettings(settings, path));

    std::string text = readFile(path);
    HS_CHECK(text.find("\"resolutionWidth\": 1280") != std::string::npos);
    HS_CHECK(text.find("\"resolutionHeight\": 720") != std::string::npos);
    HS_CHECK(text.find("\"fontFamily\": \"Roboto\"") != std::string::npos);
    HS_CHECK(text.find("\"textColorHex\": \"#00FF00\"") != std::string::npos);
    HS_CHECK(text.find("\"vAlign\": 0") != std::string::npos);
    HS_CHECK(text.find("\"hAlign\": 2") != std::string::npos);
}

void testSettingsStorageFailureModes() {
    TempDir dir;
    SettingsStorageService storage;

    HS_CHECK(!storage.saveSettings(AppSettings(), (dir.path() / "missing-dir" / "s.json").string()));

    AppSettings fallback = storage.loadSettings((dir.path() / "absent.json").string());
    HS_CHECK(fallback.lyricsFontSize() == 48);
}

void testSettingsStorageMove() {
    SettingsStorageService a("/tmp/moved_settings.json");
    SettingsStorageService b(std::move(a));
    SettingsStorageService c;
    c = std::move(b);
    HS_CHECK(c.defaultFilePath() == "/tmp/moved_settings.json");
}

// LocalDatabaseService

void testDatabaseRequiresInitialization() {
    LocalDatabaseService db;
    HS_CHECK(!db.isOpen());
    HS_CHECK(!db.saveSongMap(SongMap("s1", "One", "A")));
    HS_CHECK(!db.saveServiceOrder(ServiceOrder("o1", "Order", "2026-01-01")));
    HS_CHECK(db.getSongMapById("s1").id().empty());
    HS_CHECK(db.getAllSongMaps().empty());

    HS_CHECK(db.initializeDatabase());
    HS_CHECK(db.isOpen());
}

void testDatabaseSongsAndOrders() {
    LocalDatabaseService db("/tmp/unused.db");
    HS_CHECK(db.initializeDatabase());

    HS_CHECK(db.saveSongMap(SongMap("s1", "One", "A")));
    HS_CHECK(db.saveSongMap(SongMap("s2", "Two", "B")));
    HS_CHECK(db.saveSongMap(SongMap("s1", "One Updated", "A")));
    HS_CHECK(db.getAllSongMaps().size() == 2);
    HS_CHECK(db.getSongMapById("s1").title() == "One Updated");
    HS_CHECK(db.getSongMapById("missing").id().empty());

    HS_CHECK(db.saveServiceOrder(ServiceOrder("o1", "Sunday", "2026-01-01")));
    HS_CHECK(db.getServiceOrderById("o1").title() == "Sunday");
    HS_CHECK(db.getServiceOrderById("missing").id().empty());
}

void testDatabaseMove() {
    LocalDatabaseService a;
    HS_CHECK(a.initializeDatabase());
    LocalDatabaseService b(std::move(a));
    HS_CHECK(b.isOpen());
    LocalDatabaseService c;
    c = std::move(b);
    HS_CHECK(c.isOpen());
}

// SongLibraryIndexService

SongMap makeSong(const std::string& id, const std::string& title, const std::string& artist) {
    return SongMap(id, title, artist);
}

void testIndexSearchScoring() {
    SongLibraryIndexService index;
    index.buildIndex({makeSong("1", "Amazing Grace", "John Newton"), makeSong("2", "Grace Alone", "Artist"),
                      makeSong("3", "Other Song", "Grace Band"), makeSong("4", "Unrelated", "Nobody")});
    HS_CHECK(index.indexedCount() == 4);

    auto exact = index.search("amazing grace");
    HS_CHECK(exact.size() == 1);
    HS_CHECK(exact[0].matchScore == 1.0f);

    auto results = index.search("GRACE");
    HS_CHECK(results.size() == 3);
    HS_CHECK(results[0].song.id() == "2" || results[0].song.id() == "1");
    HS_CHECK(results[0].matchScore == 0.8f);
    HS_CHECK(results[2].song.id() == "3");
    HS_CHECK(results[2].matchScore == 0.6f);

    HS_CHECK(index.search("zzz").empty());
    HS_CHECK(index.search("").empty());
    HS_CHECK(index.search("grace", 2).size() == 2);
}

void testIndexMutation() {
    SongLibraryIndexService index;
    HS_CHECK(index.indexedCount() == 0);

    index.addOrUpdateSong(makeSong("1", "First", "A"));
    index.addOrUpdateSong(makeSong("2", "Second", "B"));
    index.addOrUpdateSong(makeSong("1", "Renamed", "A"));
    HS_CHECK(index.indexedCount() == 2);
    HS_CHECK(index.search("renamed").size() == 1);
    HS_CHECK(index.search("first").empty());

    index.removeSong("2");
    index.removeSong("missing");
    HS_CHECK(index.indexedCount() == 1);
}

void testIndexMove() {
    SongLibraryIndexService a;
    a.addOrUpdateSong(makeSong("1", "First", "A"));
    SongLibraryIndexService b(std::move(a));
    SongLibraryIndexService c;
    c = std::move(b);
    HS_CHECK(c.indexedCount() == 1);
}

// LocalizationService

void testLocalizationLanguages() {
    LocalizationService svc;
    HS_CHECK(svc.currentLanguage() == "en");
    HS_CHECK(svc.translate("NAV_MIXER") == "Stem Mixer");
    HS_CHECK(svc.translate("UNKNOWN_KEY") == "UNKNOWN_KEY");

    HS_CHECK(svc.setLanguage("es"));
    HS_CHECK(svc.currentLanguage() == "es");
    HS_CHECK(svc.translate("NAV_MIXER") == "Mezclador de Pistas");

    HS_CHECK(svc.setLanguage("fr"));
    HS_CHECK(svc.translate("NAV_SETLIST") == "Ordre de Culte");

    HS_CHECK(!svc.setLanguage("xx"));
    HS_CHECK(svc.currentLanguage() == "fr");

    auto langs = svc.availableLanguages();
    HS_CHECK(langs == (std::vector<std::string>{"en", "es", "fr"}));
}

void testLocalizationConstructorAndMove() {
    LocalizationService spanish("es");
    HS_CHECK(spanish.currentLanguage() == "es");

    LocalizationService invalid("xx");
    HS_CHECK(invalid.currentLanguage() == "en");

    LocalizationService moved(std::move(spanish));
    LocalizationService assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.currentLanguage() == "es");
}

// ChordTransposer

void testNashvilleToStandard() {
    HS_CHECK(ChordTransposer::nashvilleToStandard("1", "C") == "C");
    HS_CHECK(ChordTransposer::nashvilleToStandard("5", "G") == "D");
    HS_CHECK(ChordTransposer::nashvilleToStandard("4", "G") == "C");
    HS_CHECK(ChordTransposer::nashvilleToStandard("7", "C") == "B");
    HS_CHECK(ChordTransposer::nashvilleToStandard("6m", "C") == "Am");
    HS_CHECK(ChordTransposer::nashvilleToStandard("2", "Db") == "Eb");

    // Invalid input is returned unchanged.
    HS_CHECK(ChordTransposer::nashvilleToStandard("", "C").empty());
    HS_CHECK(ChordTransposer::nashvilleToStandard("1", "") == "1");
    HS_CHECK(ChordTransposer::nashvilleToStandard("1", "H") == "1");
    HS_CHECK(ChordTransposer::nashvilleToStandard("8", "C") == "8");
    HS_CHECK(ChordTransposer::nashvilleToStandard("x", "C") == "x");
}

void testNashvilleAcceptsEnharmonicKeys() {
    HS_CHECK(ChordTransposer::nashvilleToStandard("1", "D#") == "Eb");
    HS_CHECK(ChordTransposer::nashvilleToStandard("1", "Gb") == "F#");
    HS_CHECK(ChordTransposer::nashvilleToStandard("1", "Ab") == "G#");
    HS_CHECK(ChordTransposer::nashvilleToStandard("1", "A#") == "Bb");
}

void testSuggestCapoKey() {
    HS_CHECK(ChordTransposer::suggestCapoKey("D") == "C");
    HS_CHECK(ChordTransposer::suggestCapoKey("Db") == "C");
    HS_CHECK(ChordTransposer::suggestCapoKey("F") == "C");
    HS_CHECK(ChordTransposer::suggestCapoKey("F#") == "G");
    HS_CHECK(ChordTransposer::suggestCapoKey("A") == "G");
    HS_CHECK(ChordTransposer::suggestCapoKey("B") == "G");
    HS_CHECK(ChordTransposer::suggestCapoKey("invalid") == "C");
}

void testCagedLeadShape() {
    HS_CHECK(ChordTransposer::toCagedLeadShape("").empty());
    HS_CHECK(ChordTransposer::toCagedLeadShape("G") == "G [D-shape]");
    HS_CHECK(ChordTransposer::toCagedLeadShape("Am") == "Am [D-shape]");
    HS_CHECK(ChordTransposer::toCagedLeadShape("Bb") == "Bb [D-shape]");
    HS_CHECK(ChordTransposer::toCagedLeadShape("F#m") == "F#m [A-shape]");
    HS_CHECK(ChordTransposer::toCagedLeadShape("E") == "E [A-shape]");
    HS_CHECK(ChordTransposer::toCagedLeadShape("C") == "C [C-shape]");
    HS_CHECK(ChordTransposer::toCagedLeadShape("Db") == "Db [C-shape]");
    HS_CHECK(ChordTransposer::toCagedLeadShape("X") == "X");
}

} // namespace

int main() {
    testConfigParsesBooleansAndLyricsLink();
    testConfigParsesYoutubeLinkForms();
    testConfigTemplateRoundTripsToDefaults();
    testConfigLoadFromDirectory();
    testConfigCreateTemplate();
    testConfigMove();
    testSettingsStoragePaths();
    testSettingsStorageRoundTripUsesDefaultPath();
    testSettingsStorageWritesAllFields();
    testSettingsStorageFailureModes();
    testSettingsStorageMove();
    testDatabaseRequiresInitialization();
    testDatabaseSongsAndOrders();
    testDatabaseMove();
    testIndexSearchScoring();
    testIndexMutation();
    testIndexMove();
    testLocalizationLanguages();
    testLocalizationConstructorAndMove();
    testNashvilleToStandard();
    testNashvilleAcceptsEnharmonicKeys();
    testSuggestCapoKey();
    testCagedLeadShape();
    std::cout << "ALL CORE DATA SERVICE TESTS PASSED" << std::endl;
    return EXIT_SUCCESS;
}
