#include "DisplayManager.hpp"
#include "ConfidenceMonitorViewModel.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;
using namespace HarmonySync::ViewModels;

void testDisplayManager() {
    std::cout << "[TEST] Running testDisplayManager..." << std::endl;
    DisplayManager manager;

    // By default, 1 primary monitor is available
    assert(manager.availableDisplays().size() == 1);
    assert(manager.getDisplayForRole(DisplayRole::ControlPanel) != nullptr);

    DisplayInfo secondary;
    secondary.id = 2;
    secondary.name = "Audience Projector";
    secondary.width = 1920;
    secondary.height = 1080;
    secondary.xOffset = 1920;
    secondary.yOffset = 0;
    secondary.isPrimary = false;
    secondary.assignedRole = DisplayRole::AudienceScreen;

    manager.addDisplay(secondary);
    assert(manager.availableDisplays().size() == 2);

    const DisplayInfo* audience = manager.getDisplayForRole(DisplayRole::AudienceScreen);
    assert(audience != nullptr);
    assert(audience->name == "Audience Projector");
    assert(audience->xOffset == 1920);

    bool assigned = manager.assignDisplayRole(2, DisplayRole::ConfidenceMonitor);
    assert(assigned == true);
    assert(manager.getDisplayForRole(DisplayRole::ConfidenceMonitor)->id == 2);

    std::cout << "[PASS] testDisplayManager passed." << std::endl;
}

void testConfidenceMonitorViewModel() {
    std::cout << "[TEST] Running testConfidenceMonitorViewModel..." << std::endl;
    ConfidenceMonitorViewModel vm;

    assert(vm.currentLyricLineStd().empty());
    assert(vm.timerSecondsRemaining() == 0);

    vm.setLyricLines("Amazing grace how sweet the sound", "That saved a wretch like me");
    assert(vm.currentLyricLineStd() == "Amazing grace how sweet the sound");
    assert(vm.nextLyricLineStd() == "That saved a wretch like me");

    vm.setTimerSecondsRemaining(180);
    assert(vm.timerSecondsRemaining() == 180);

    std::cout << "[PASS] testConfidenceMonitorViewModel passed." << std::endl;
}

int main() {
    try {
        testDisplayManager();
        testConfidenceMonitorViewModel();
        std::cout << "\nALL DISPLAY MANAGER UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in display manager unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
