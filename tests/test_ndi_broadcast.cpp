#include "NdiVideoOutputService.hpp"
#include "LowerThirdOverlayViewModel.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Media;
using namespace HarmonySync::ViewModels;

void testNdiVideoOutputService() {
    std::cout << "[TEST] Running testNdiVideoOutputService..." << std::endl;

    NdiVideoOutputService service("HarmonySync Main Feed");
    assert(!service.isStreaming());
    assert(service.streamName() == "HarmonySync Main Feed");

    bool started = service.startStreaming();
    assert(started == true);
    assert(service.isStreaming() == true);

    service.setResolution(1920, 1080);
    auto res = service.resolution();
    assert(res.first == 1920);
    assert(res.second == 1080);

    service.stopStreaming();
    assert(!service.isStreaming());

    std::cout << "[PASS] testNdiVideoOutputService passed." << std::endl;
}

void testLowerThirdOverlayViewModel() {
    std::cout << "[TEST] Running testLowerThirdOverlayViewModel..." << std::endl;

    LowerThirdOverlayViewModel vm;
    assert(vm.isVisible() == true);
    assert(vm.titleStd() == "Way Maker");
    assert(vm.subtitleStd() == "Sinach");

    vm.setVisible(false);
    assert(!vm.isVisible());

#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.setTitle(QStringLiteral("Great Are You Lord"));
    vm.setSubtitle(QStringLiteral("All Sons & Daughters"));
#else
    vm.setTitle("Great Are You Lord");
    vm.setSubtitle("All Sons & Daughters");
#endif

    assert(vm.titleStd() == "Great Are You Lord");
    assert(vm.subtitleStd() == "All Sons & Daughters");

    std::cout << "[PASS] testLowerThirdOverlayViewModel passed." << std::endl;
}

int main() {
    try {
        testNdiVideoOutputService();
        testLowerThirdOverlayViewModel();
        std::cout << "\nALL SPRINT 18 NDI BROADCAST UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in NDI Broadcast unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
