#include "AILyricSyncService.hpp"
#include <iostream>
#include <filesystem>
#include <cassert>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QCoreApplication>
#include <QTimer>
#endif

using namespace HarmonySync::Core;

void testGenerateTimestamps() {
    std::cout << "[TEST] Running testGenerateTimestamps..." << std::endl;
    
    AILyricSyncService service;
    bool successCalled = false;

    auto onSuccess = [&](std::vector<TimedLyricLine> lines) {
        if (lines.empty()) throw std::runtime_error("Empty lines returned");
        if (lines.size() != 2) throw std::runtime_error("Expected 2 lines");
        if (lines[0].text != "Line 1") throw std::runtime_error("Mismatch Line 1");
        if (lines[1].text != "Line 2") throw std::runtime_error("Mismatch Line 2");
        if (lines[0].timestampSeconds != 0.0) throw std::runtime_error("Time 0 mismatch");
        if (lines[1].timestampSeconds != 2.5) throw std::runtime_error("Time 2.5 mismatch");
        successCalled = true;
    };

    auto onError = [](std::string err) {
        throw std::runtime_error("Error callback invoked: " + err);
    };

    service.generateTimestamps("dummy.wav", "Line 1\nLine 2\n", onSuccess, onError);

#ifdef HARMONYSYNC_QT_AVAILABLE
    // Allow event loop to process QProcess output
    QTimer::singleShot(2000, qApp, &QCoreApplication::quit);
    qApp->exec();
#endif

    if (!successCalled) throw std::runtime_error("onSuccess callback was not invoked");
    std::cout << "[PASS] testGenerateTimestamps passed." << std::endl;
}

int main(int argc, char** argv) {
    try {
#ifdef HARMONYSYNC_QT_AVAILABLE
        QCoreApplication app(argc, argv);
#endif
        testGenerateTimestamps();
        std::cout << "\nALL AI LYRIC SYNC UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in ai lyric sync unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
