#include "SettingsViewModel.hpp"
#include <iostream>
#include <filesystem>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::ViewModels;

void testSettingsViewModel() {
    std::cout << "[TEST] Running testSettingsViewModel..." << std::endl;

    std::string testPath = (std::filesystem::temp_directory_path() / "test_settings_vm.json").string();
    std::filesystem::remove(testPath);

    auto storage = std::make_shared<HarmonySync::Core::SettingsStorageService>(testPath);
    SettingsViewModel vm(storage);

    assert(vm.presentationDisplayIndex() == 1);
    assert(vm.lyricsFontSize() == 48);

    vm.setPresentationDisplayIndex(2);
    vm.setLyricsFontSize(60);
    vm.setMarginOffsetY(50);

    assert(vm.presentationDisplayIndex() == 2);
    assert(vm.lyricsFontSize() == 60);
    assert(vm.marginOffsetY() == 50);

    bool saved = vm.saveSettings();
    assert(saved == true);

    vm.resetToDefaults();
    assert(vm.lyricsFontSize() == 48);

    bool loaded = vm.loadSettings();
    assert(loaded == true);
    assert(vm.presentationDisplayIndex() == 2);
    assert(vm.lyricsFontSize() == 60);

    std::filesystem::remove(testPath);

    std::cout << "[PASS] testSettingsViewModel passed." << std::endl;
}

int main() {
    try {
        testSettingsViewModel();
        std::cout << "\nALL SPRINT 25 SETTINGS VIEWMODEL UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Settings ViewModel unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
