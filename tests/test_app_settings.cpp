#include "AppSettings.hpp"
#include "SettingsStorageService.hpp"
#include <iostream>
#include <filesystem>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testAppSettingsModel() {
    std::cout << "[TEST] Running testAppSettingsModel..." << std::endl;

    AppSettings settings;
    assert(settings.presentationDisplayIndex() == 1);
    assert(settings.confidenceDisplayIndex() == 2);
    assert(settings.lyricsFontSize() == 48);
    assert(settings.fontFamily() == "Inter");
    assert(settings.verticalAlignment() == TextVerticalAlignment::Bottom);

    settings.setPresentationDisplayIndex(3);
    settings.setLyricsFontSize(64);
    settings.setFontFamily("Roboto");
    settings.setVerticalAlignment(TextVerticalAlignment::Center);

    assert(settings.presentationDisplayIndex() == 3);
    assert(settings.lyricsFontSize() == 64);
    assert(settings.fontFamily() == "Roboto");
    assert(settings.verticalAlignment() == TextVerticalAlignment::Center);

    settings.resetToDefaults();
    assert(settings.presentationDisplayIndex() == 1);
    assert(settings.lyricsFontSize() == 48);

    std::cout << "[PASS] testAppSettingsModel passed." << std::endl;
}

void testSettingsStorageService() {
    std::cout << "[TEST] Running testSettingsStorageService..." << std::endl;

    std::string testPath = (std::filesystem::temp_directory_path() / "test_settings_save.json").string();
    std::filesystem::remove(testPath);

    SettingsStorageService storage(testPath);
    assert(storage.defaultFilePath() == testPath);

    AppSettings original;
    original.setPresentationDisplayIndex(2);
    original.setLyricsFontSize(56);
    original.setMarginOffsetX(15);
    original.setMarginOffsetY(60);

    bool saved = storage.saveSettings(original, testPath);
    assert(saved == true);

    AppSettings loaded = storage.loadSettings(testPath);
    assert(loaded.presentationDisplayIndex() == 2);
    assert(loaded.lyricsFontSize() == 56);
    assert(loaded.marginOffsetX() == 15);
    assert(loaded.marginOffsetY() == 60);

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
