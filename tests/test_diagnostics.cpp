#include "CrashReporterService.hpp"
#include "AutoUpdateService.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testCrashReporterService() {
    std::cout << "[TEST] Running testCrashReporterService..." << std::endl;

    CrashReporterService reporter("/tmp/test_dumps");
    assert(reporter.dumpDirectory() == "/tmp/test_dumps");

    reporter.recordBreadcrumb("UI", "User clicked audio pitch transpose button");
    auto logs = reporter.breadcrumbs();
    assert(logs.size() == 1);
    assert(logs[0] == "[UI] User clicked audio pitch transpose button");

    bool dumpGen = reporter.generateDump("Simulated assertion failure");
    assert(dumpGen == true);
    assert(reporter.breadcrumbs().size() == 2);

    std::cout << "[PASS] testCrashReporterService passed." << std::endl;
}

void testAutoUpdateService() {
    std::cout << "[TEST] Running testAutoUpdateService..." << std::endl;

    AutoUpdateService updater("stable");
    assert(updater.updateChannel() == "stable");
    assert(!updater.isUpdateAvailable());

    bool checked = updater.checkForUpdates();
    assert(checked == true);
    assert(updater.isUpdateAvailable() == true);
    assert(updater.latestVersion() == "2.1.0");

    std::cout << "[PASS] testAutoUpdateService passed." << std::endl;
}

int main() {
    try {
        testCrashReporterService();
        testAutoUpdateService();
        std::cout << "\nALL SPRINT 20 ENTERPRISE DIAGNOSTICS UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Enterprise Diagnostics unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
