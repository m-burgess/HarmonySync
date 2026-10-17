#include "SettingsViewModel.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"

#include <QObject>
#include <filesystem>
#include <memory>
#include <string>
#include <vector>

using namespace HarmonySync::ViewModels;

void testSettingsPropertiesAndSignals() {
    TempDir dir;
    auto storage = std::make_shared<HarmonySync::Core::SettingsStorageService>((dir.path() / "settings.json").string());
    int settingsChanges = 0;
    int displayChanges = 0;
    auto displays = std::make_shared<HarmonySync::Core::DisplayManager>([] {
        return std::vector<HarmonySync::Core::ScreenInfo>{{"Control", 1280, 720, 0, 0, true},
                                                          {"Projector", 1920, 1080, 1280, 0, false}};
    });
    SettingsViewModel vm(storage, displays);
    QObject::connect(&vm, &SettingsViewModel::settingsChanged, [&] { ++settingsChanges; });
    QObject::connect(&vm, &SettingsViewModel::availableDisplaysChanged, [&] { ++displayChanges; });

    HS_CHECK(vm.presentationDisplayIndex() == 1);
    HS_CHECK(vm.confidenceDisplayIndex() == 2);
    HS_CHECK(vm.lyricsFontSize() == 48);
    HS_CHECK(vm.lowerThirdFontSize() == 26);
    HS_CHECK(vm.fontFamily() == QStringLiteral("Inter"));
    HS_CHECK(vm.textColorHex() == QStringLiteral("#FFFFFF"));
    HS_CHECK(vm.preServiceMusicUrl().isEmpty());
    HS_CHECK(vm.vAlign() == static_cast<int>(HarmonySync::Core::TextVerticalAlignment::Bottom));
    HS_CHECK(vm.hAlign() == static_cast<int>(HarmonySync::Core::TextHorizontalAlignment::Center));
    HS_CHECK(vm.availableDisplayNames() == QStringList({"Control", "Projector"}));

    vm.setPresentationDisplayIndex(0);
    vm.setConfidenceDisplayIndex(1);
    vm.setLyricsFontSize(60);
    vm.setLowerThirdFontSize(42);
    vm.setFontFamily(QStringLiteral("Noto Sans"));
    vm.setTextColorHex(QStringLiteral("#AABBCC"));
    vm.setPreServiceMusicUrl(QStringLiteral("https://open.spotify.com/playlist/test_vm"));
    vm.setVAlign(static_cast<int>(HarmonySync::Core::TextVerticalAlignment::Top));
    vm.setHAlign(static_cast<int>(HarmonySync::Core::TextHorizontalAlignment::Right));
    vm.setMarginOffsetX(17);
    vm.setMarginOffsetY(-9);
    HS_CHECK(settingsChanges == 11);
    vm.setPresentationDisplayIndex(0);
    vm.setConfidenceDisplayIndex(1);
    vm.setLyricsFontSize(60);
    vm.setLowerThirdFontSize(42);
    vm.setFontFamily(QStringLiteral("Noto Sans"));
    vm.setTextColorHex(QStringLiteral("#AABBCC"));
    vm.setPreServiceMusicUrl(QStringLiteral("https://open.spotify.com/playlist/test_vm"));
    vm.setMarginOffsetX(17);
    vm.setMarginOffsetY(-9);
    HS_CHECK(settingsChanges == 11);
    HS_CHECK(vm.presentationDisplayIndex() == 0);
    HS_CHECK(vm.confidenceDisplayIndex() == 1);
    HS_CHECK(vm.lyricsFontSize() == 60);
    HS_CHECK(vm.lowerThirdFontSize() == 42);
    HS_CHECK(vm.fontFamily() == QStringLiteral("Noto Sans"));
    HS_CHECK(vm.textColorHex() == QStringLiteral("#AABBCC"));
    HS_CHECK(vm.preServiceMusicUrl() == QStringLiteral("https://open.spotify.com/playlist/test_vm"));
    HS_CHECK(vm.vAlign() == static_cast<int>(HarmonySync::Core::TextVerticalAlignment::Top));
    HS_CHECK(vm.hAlign() == static_cast<int>(HarmonySync::Core::TextHorizontalAlignment::Right));
    HS_CHECK(vm.marginOffsetX() == 17);
    HS_CHECK(vm.marginOffsetY() == -9);

    vm.refreshDisplays();
    HS_CHECK(displayChanges == 1);
    HS_CHECK(vm.availableDisplayNames().size() == 2);
    HS_CHECK(!vm.localIpAddress().isEmpty());

    HS_CHECK(vm.saveSettings());
    vm.resetToDefaults();
    HS_CHECK(vm.lyricsFontSize() == 48);
    HS_CHECK(vm.preServiceMusicUrl().isEmpty());
    HS_CHECK(vm.loadSettings());
    HS_CHECK(vm.presentationDisplayIndex() == 0);
    HS_CHECK(vm.confidenceDisplayIndex() == 1);
    HS_CHECK(vm.lyricsFontSize() == 60);
    HS_CHECK(vm.lowerThirdFontSize() == 42);
    HS_CHECK(vm.fontFamily() == QStringLiteral("Noto Sans"));
    HS_CHECK(vm.textColorHex() == QStringLiteral("#AABBCC"));
    HS_CHECK(vm.preServiceMusicUrl() == QStringLiteral("https://open.spotify.com/playlist/test_vm"));
    HS_CHECK(vm.vAlign() == static_cast<int>(HarmonySync::Core::TextVerticalAlignment::Top));
    HS_CHECK(vm.hAlign() == static_cast<int>(HarmonySync::Core::TextHorizontalAlignment::Right));
    HS_CHECK(vm.marginOffsetX() == 17);
    HS_CHECK(vm.marginOffsetY() == -9);
}

int main() {
    testSettingsPropertiesAndSignals();
    return 0;
}
