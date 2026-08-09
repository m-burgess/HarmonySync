#include "MusicianSessionViewModel.hpp"
#include "MusicianConfidenceViewModel.hpp"
#include "MobileApiClient.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>
#include <thread>
#include <chrono>

using namespace HarmonySync::ViewModels;
using namespace HarmonySync::Core;

void testMusicianSessionViewModel() {
    std::cout << "[TEST] Running testMusicianSessionViewModel..." << std::endl;
    
    auto apiClient = std::make_shared<MobileApiClient>();
    MusicianSessionViewModel vm(apiClient);
    
    assert(vm.hostIp() == "192.168.1.50");
    vm.setHostIp("10.0.0.1");
    assert(vm.hostIp() == "10.0.0.1");
    
    vm.setPairingPin("1234");
    assert(vm.pairingPin() == "1234");
    
    assert(vm.isConnected() == false);
    assert(vm.isConnecting() == false);
    
    vm.connectToHost();
    
    // Allow thread time to update state
    std::this_thread::sleep_for(std::chrono::milliseconds(300));
    assert(vm.isConnected() == true);
    
    vm.disconnectFromHost();
    
    std::cout << "[PASS] testMusicianSessionViewModel passed." << std::endl;
}

void testMusicianConfidenceViewModel() {
    std::cout << "[TEST] Running testMusicianConfidenceViewModel..." << std::endl;
    
    auto apiClient = std::make_shared<MobileApiClient>();
    
    // Simulate setting event callback via view model setup
    MusicianConfidenceViewModel vm(apiClient);
    
    assert(vm.currentSongTitle() == "Waiting for Host...");
    assert(vm.currentLyricLine() == "");
    
    std::cout << "[PASS] testMusicianConfidenceViewModel passed." << std::endl;
}

int main() {
    try {
        testMusicianSessionViewModel();
        testMusicianConfidenceViewModel();
        std::cout << "\nALL MOBILE VIEWMODELS UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in mobile viewmodels unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
