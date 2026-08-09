#include "SettingsViewModel.hpp"
#include <iostream>
#include <filesystem>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::ViewModels;

void testQmlSettingsDialog() {
    std::cout << "[TEST] Running testQmlSettingsDialog..." << std::endl;

    std::string path = (std::filesystem::temp_directory_path() / "test_qml_settings_dialog.json").string();
    std::filesystem::remove(path);

    auto storage = std::make_shared<HarmonySync::Core::SettingsStorageService>(path);
    SettingsViewModel vm(storage);

    // Verify initial values
    assert(vm.presentationDisplayIndex() == 1);
    assert(vm.lyricsFontSize() == 48);

    // Simulate user editing spinboxes in QML SettingsDialog
    vm.setPresentationDisplayIndex(2);
    vm.setConfidenceDisplayIndex(3);
    vm.setLyricsFontSize(64);
    vm.setLowerThirdFontSize(32);
    vm.setMarginOffsetX(20);
    vm.setMarginOffsetY(50);

    // Simulate Save Button click in SettingsDialog
    bool saved = vm.saveSettings();
    assert(saved == true);

    // Reset Defaults in SettingsDialog
    vm.resetToDefaults();
    assert(vm.presentationDisplayIndex() == 1);

    // Load Settings in SettingsDialog
    bool loaded = vm.loadSettings();
    assert(loaded == true);
    assert(vm.presentationDisplayIndex() == 2);
    assert(vm.confidenceDisplayIndex() == 3);
    assert(vm.lyricsFontSize() == 64);
    assert(vm.lowerThirdFontSize() == 32);

    std::filesystem::remove(path);

    std::cout << "[PASS] testQmlSettingsDialog passed." << std::endl;
}

int main() {
    try {
        testQmlSettingsDialog();
        std::cout << "\nALL SPRINT 26 QML SETTINGS DIALOG UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in QML Settings Dialog unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
