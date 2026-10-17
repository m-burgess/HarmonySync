#include "AppTheme.hpp"
#include "test_check.hpp"
#include <QColor>
#include <QGuiApplication>
#include <QPalette>
#include <QStyleHints>
#include <cstdlib>
#include <iostream>

using namespace HarmonySync::ViewModels;

namespace {

void testDarkPaletteColors() {
    std::cout << "[TEST] Running testDarkPaletteColors..." << std::endl;
    const QPalette palette = AppTheme::darkPalette();

    // Verify window frame & background colors match Theme.qml (#1e1e1e)
    HS_CHECK(palette.color(QPalette::Active, QPalette::Window) == QColor("#1e1e1e"));
    HS_CHECK(palette.color(QPalette::Inactive, QPalette::Window) == QColor("#1e1e1e"));

    // Verify text colors match Theme.qml (#f4f4f5)
    HS_CHECK(palette.color(QPalette::Active, QPalette::WindowText) == QColor("#f4f4f5"));
    HS_CHECK(palette.color(QPalette::Active, QPalette::Text) == QColor("#f4f4f5"));

    // Verify base (file lists / text inputs) matches Theme.qml (#1e1e1e)
    HS_CHECK(palette.color(QPalette::Active, QPalette::Base) == QColor("#1e1e1e"));

    // Verify alternate base / cards match Theme.qml (#252526)
    HS_CHECK(palette.color(QPalette::Active, QPalette::AlternateBase) == QColor("#252526"));

    // Verify button surfaces match Theme.qml (#252526)
    HS_CHECK(palette.color(QPalette::Active, QPalette::Button) == QColor("#252526"));
    HS_CHECK(palette.color(QPalette::Active, QPalette::ButtonText) == QColor("#f4f4f5"));

    // Verify accent & highlights match Theme.qml (#007acc)
    HS_CHECK(palette.color(QPalette::Active, QPalette::Highlight) == QColor("#007acc"));
    HS_CHECK(palette.color(QPalette::Active, QPalette::HighlightedText) == QColor("#ffffff"));

    // Verify borders and mid match Theme.qml (#3c3c3c)
    HS_CHECK(palette.color(QPalette::Active, QPalette::Mid) == QColor("#3c3c3c"));

    // Verify secondary / placeholder text matches Theme.qml (#a1a1aa)
    HS_CHECK(palette.color(QPalette::Active, QPalette::PlaceholderText) == QColor("#a1a1aa"));

    std::cout << "[PASS] testDarkPaletteColors passed." << std::endl;
}

void testApplyDarkTheme(int argc, char** argv) {
    std::cout << "[TEST] Running testApplyDarkTheme..." << std::endl;
    qputenv("QT_QPA_PLATFORM", "offscreen");
    QGuiApplication app(argc, argv);

    AppTheme::applyDarkTheme(app);

    HS_CHECK(app.palette().color(QPalette::Active, QPalette::Window) == QColor("#1e1e1e"));
    HS_CHECK(app.palette().color(QPalette::Active, QPalette::Base) == QColor("#1e1e1e"));
    HS_CHECK(app.palette().color(QPalette::Active, QPalette::Text) == QColor("#f4f4f5"));
    HS_CHECK(app.palette().color(QPalette::Active, QPalette::Highlight) == QColor("#007acc"));
    HS_CHECK(app.palette().color(QPalette::Active, QPalette::Button) == QColor("#252526"));
    HS_CHECK(app.palette().color(QPalette::Active, QPalette::ButtonText) == QColor("#f4f4f5"));
    HS_CHECK(app.palette().color(QPalette::Active, QPalette::Mid) == QColor("#3c3c3c"));

    std::cout << "[PASS] testApplyDarkTheme passed." << std::endl;
}

} // namespace

int main(int argc, char** argv) {
    testDarkPaletteColors();
    testApplyDarkTheme(argc, argv);
    std::cout << "\nALL THEME PALETTE UNIT TESTS PASSED" << std::endl;
    return EXIT_SUCCESS;
}
