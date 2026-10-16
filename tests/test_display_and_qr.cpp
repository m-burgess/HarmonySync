#include "DisplayManager.hpp"
#include "QrCodeImageProvider.hpp"
#include "test_check.hpp"
#include <QColor>
#include <QGuiApplication>
#include <QImage>
#include <QSize>
#include <QString>
#include <QtGlobal>
#include <iostream>
#include <string>
#include <vector>

using namespace HarmonySync::Core;

namespace {

void testFakeScreens() {
    std::cout << "[TEST] Running testFakeScreens..." << std::endl;
    DisplayManager manager([]() {
        return std::vector<ScreenInfo>{
            {"HDMI-1", 1920, 1080, 0, 0, true},
            {"", 1280, 720, 1920, 0, false},
            {"DP-2", 1024, 768, 3200, 0, false},
        };
    });

    manager.detectSystemDisplays();
    const auto& displays = manager.availableDisplays();
    HS_CHECK(displays.size() == 3);

    HS_CHECK(displays[0].id == 1);
    HS_CHECK(displays[0].name == "HDMI-1");
    HS_CHECK(displays[0].isPrimary);
    HS_CHECK(displays[0].assignedRole == DisplayRole::ControlPanel);

    HS_CHECK(displays[1].id == 2);
    HS_CHECK(displays[1].name == "Display 2");
    HS_CHECK(displays[1].width == 1280);
    HS_CHECK(displays[1].height == 720);
    HS_CHECK(displays[1].xOffset == 1920);
    HS_CHECK(!displays[1].isPrimary);
    HS_CHECK(displays[1].assignedRole == DisplayRole::AudienceScreen);

    HS_CHECK(displays[2].yOffset == 0);
    HS_CHECK(displays[2].xOffset == 3200);
    std::cout << "[PASS] testFakeScreens passed." << std::endl;
}

void testNoScreensFallsBackToThreeDisplays() {
    std::cout << "[TEST] Running testNoScreensFallsBackToThreeDisplays..." << std::endl;
    DisplayManager manager([]() { return std::vector<ScreenInfo>{}; });
    manager.detectSystemDisplays();

    const auto& displays = manager.availableDisplays();
    HS_CHECK(displays.size() == 3);
    HS_CHECK(displays[0].isPrimary);
    HS_CHECK(displays[0].assignedRole == DisplayRole::ControlPanel);
    HS_CHECK(displays[1].assignedRole == DisplayRole::AudienceScreen);
    HS_CHECK(displays[2].assignedRole == DisplayRole::ConfidenceMonitor);
    HS_CHECK(manager.getDisplayForRole(DisplayRole::StageScreen) == nullptr);
    std::cout << "[PASS] testNoScreensFallsBackToThreeDisplays passed." << std::endl;
}

void testRoleAssignmentAndClear() {
    std::cout << "[TEST] Running testRoleAssignmentAndClear..." << std::endl;
    DisplayManager manager;
    HS_CHECK(manager.availableDisplays().size() == 1);
    HS_CHECK(manager.availableDisplays()[0].isPrimary);

    HS_CHECK(manager.assignDisplayRole(1, DisplayRole::StageScreen));
    HS_CHECK(manager.getDisplayForRole(DisplayRole::StageScreen)->id == 1);
    HS_CHECK(!manager.assignDisplayRole(99, DisplayRole::StageScreen));

    DisplayManager moved(std::move(manager));
    HS_CHECK(moved.availableDisplays().size() == 1);
    DisplayManager assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.availableDisplays().size() == 1);

    assigned.clearAllDisplays();
    HS_CHECK(assigned.availableDisplays().empty());
    std::cout << "[PASS] testRoleAssignmentAndClear passed." << std::endl;
}

void testQtScreensWithoutApplication() {
    std::cout << "[TEST] Running testQtScreensWithoutApplication..." << std::endl;
    DisplayManager manager;
    manager.detectSystemDisplays();
    HS_CHECK(manager.availableDisplays().size() == 3);
    std::cout << "[PASS] testQtScreensWithoutApplication passed." << std::endl;
}

void testQtScreensWithApplication(int argc, char** argv) {
    std::cout << "[TEST] Running testQtScreensWithApplication..." << std::endl;
    // The offscreen platform exposes exactly one screen on any machine.
    qputenv("QT_QPA_PLATFORM", "offscreen");
    QGuiApplication app(argc, argv);

    DisplayManager manager;
    manager.detectSystemDisplays();
    const auto& displays = manager.availableDisplays();
    HS_CHECK(displays.size() == static_cast<std::size_t>(QGuiApplication::screens().size()));
    HS_CHECK(!displays.empty());
    HS_CHECK(displays[0].isPrimary);
    HS_CHECK(!displays[0].name.empty());
    HS_CHECK(displays[0].width > 0);
    HS_CHECK(displays[0].height > 0);
    std::cout << "[PASS] testQtScreensWithApplication passed." << std::endl;

    std::cout << "[TEST] Running testQrCodeImage..." << std::endl;
    QrCodeImageProvider provider;
    QSize size;
    const QImage image = provider.requestImage(QStringLiteral("harmonysync://pair/4829"), &size, QSize());
    HS_CHECK(!image.isNull());
    HS_CHECK(image.width() == image.height());
    HS_CHECK(image.width() % 10 == 0);
    HS_CHECK(size == image.size());
    // The top-left module belongs to a finder pattern, which is always dark; the 1px gap beyond it is light.
    HS_CHECK(image.pixelColor(2, 2) == QColor(Qt::black));
    HS_CHECK(image.pixelColor(10 + 2, 10 + 2) == QColor(Qt::white));

    QSize unscaledSize;
    const QImage scaled =
        provider.requestImage(QStringLiteral("harmonysync://pair/4829"), &unscaledSize, QSize(64, 64));
    HS_CHECK(scaled.width() == 64);
    HS_CHECK(scaled.height() == 64);
    HS_CHECK(unscaledSize == image.size());

    // The size out-parameter is optional.
    HS_CHECK(!provider.requestImage(QStringLiteral("x"), nullptr, QSize()).isNull());
    std::cout << "[PASS] testQrCodeImage passed." << std::endl;
}

} // namespace

int main(int argc, char** argv) {
    testFakeScreens();
    testNoScreensFallsBackToThreeDisplays();
    testRoleAssignmentAndClear();
    testQtScreensWithoutApplication();
    testQtScreensWithApplication(argc, argv);
    std::cout << "\nALL DISPLAY AND QR UNIT TESTS PASSED" << std::endl;
    return EXIT_SUCCESS;
}
