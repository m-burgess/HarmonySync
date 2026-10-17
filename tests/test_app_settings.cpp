#include "AppSettings.hpp"
#include "SettingsStorageService.hpp"
#include "test_check.hpp"
#include <iostream>
#include <filesystem>
#include <cstdlib>

using namespace HarmonySync::Core;

void testAppSettingsModel() {
    std::cout << "[TEST] Running testAppSettingsModel..." << std::endl;

    AppSettings settings;
    HS_CHECK(settings.presentationDisplayIndex() == 1);
    HS_CHECK(settings.confidenceDisplayIndex() == 2);
    HS_CHECK(settings.lyricsFontSize() == 48);
    HS_CHECK(settings.fontFamily() == "Inter");
    HS_CHECK(settings.verticalAlignment() == TextVerticalAlignment::Bottom);
    HS_CHECK(settings.preServiceMusicUrl().empty());

    settings.setPresentationDisplayIndex(3);
    settings.setLyricsFontSize(64);
    settings.setFontFamily("Roboto");
    settings.setVerticalAlignment(TextVerticalAlignment::Center);
    settings.setPreServiceMusicUrl("https://open.spotify.com/playlist/test1234");

    HS_CHECK(settings.presentationDisplayIndex() == 3);
    HS_CHECK(settings.lyricsFontSize() == 64);
    HS_CHECK(settings.fontFamily() == "Roboto");
    HS_CHECK(settings.verticalAlignment() == TextVerticalAlignment::Center);
    HS_CHECK(settings.preServiceMusicUrl() == "https://open.spotify.com/playlist/test1234");

    settings.resetToDefaults();
    HS_CHECK(settings.presentationDisplayIndex() == 1);
    HS_CHECK(settings.lyricsFontSize() == 48);
    HS_CHECK(settings.preServiceMusicUrl().empty());

    std::cout << "[PASS] testAppSettingsModel passed." << std::endl;
}

void testSettingsStorageService() {
    std::cout << "[TEST] Running testSettingsStorageService..." << std::endl;

    // Verify default storage path is in user persistent config, not volatile /tmp
    SettingsStorageService defaultStorage;
    HS_CHECK(defaultStorage.defaultFilePath().find("/tmp") == std::string::npos);
    HS_CHECK(defaultStorage.defaultFilePath().find("HarmonySync") != std::string::npos);

    std::string testPath = (std::filesystem::temp_directory_path() / "test_settings_save.json").string();
    std::filesystem::remove(testPath);

    SettingsStorageService storage(testPath);
    HS_CHECK(storage.defaultFilePath() == testPath);

    AppSettings original;
    original.setPresentationDisplayIndex(2);
    original.setConfidenceDisplayIndex(3);
    original.setLyricsFontSize(56);
    original.setLowerThirdFontSize(28);
    original.setFontFamily("Ubuntu");
    original.setTextColorHex("#FFCC00");
    original.setVerticalAlignment(TextVerticalAlignment::Top);
    original.setHorizontalAlignment(TextHorizontalAlignment::Left);
    original.setResolution(3840, 2160);
    original.setMarginOffsetX(15);
    original.setMarginOffsetY(60);
    original.setPreServiceMusicUrl("https://youtube.com/playlist?list=worship123");

    bool saved = storage.saveSettings(original, testPath);
    HS_CHECK(saved == true);

    AppSettings loaded = storage.loadSettings(testPath);
    HS_CHECK(loaded.presentationDisplayIndex() == 2);
    HS_CHECK(loaded.confidenceDisplayIndex() == 3);
    HS_CHECK(loaded.lyricsFontSize() == 56);
    HS_CHECK(loaded.lowerThirdFontSize() == 28);
    HS_CHECK(loaded.fontFamily() == "Ubuntu");
    HS_CHECK(loaded.textColorHex() == "#FFCC00");
    HS_CHECK(loaded.verticalAlignment() == TextVerticalAlignment::Top);
    HS_CHECK(loaded.horizontalAlignment() == TextHorizontalAlignment::Left);
    HS_CHECK(loaded.resolutionWidth() == 3840);
    HS_CHECK(loaded.resolutionHeight() == 2160);
    HS_CHECK(loaded.marginOffsetX() == 15);
    HS_CHECK(loaded.marginOffsetY() == 60);
    HS_CHECK(loaded.preServiceMusicUrl() == "https://youtube.com/playlist?list=worship123");

    std::filesystem::remove(testPath);

    std::cout << "[PASS] testSettingsStorageService passed." << std::endl;
}

int main() {
    try {
        testAppSettingsModel();
        testSettingsStorageService();
        std::cout << "\nALL SPRINT 24 APP SETTINGS UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in App Settings unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
