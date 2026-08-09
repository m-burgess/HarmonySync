#include "MobileApiClient.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>
#include <thread>
#include <chrono>

using namespace HarmonySync::Core;

void testMobileApiClient() {
    std::cout << "[TEST] Running testMobileApiClient..." << std::endl;
    
    MobileApiClient client;
    assert(client.currentState() == ConnectionState::Disconnected);
    
    // Test Invalid PIN Authentication Failure
    ConnectionState lastState = ConnectionState::Disconnected;
    client.setStateCallback([&lastState](ConnectionState state) {
        lastState = state;
        std::cout << "State changed to: " << static_cast<int>(state) << std::endl;
    });
    
    client.connectToHost("192.168.1.50", 8080, "12"); // Invalid short PIN
    
    // Wait for the mock network loop to process
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    assert(lastState == ConnectionState::AuthenticationFailed);
    
    client.disconnect();
    assert(client.currentState() == ConnectionState::Disconnected);
    
    // Test Successful Connection
    bool eventReceived = false;
    client.setEventCallback([&eventReceived](const std::string& eventName, const std::string& payload) {
        std::cout << "Received Event: " << eventName << " Payload: " << payload << std::endl;
        if (eventName == "SESSION_STARTED") {
            eventReceived = true;
        }
    });
    
    client.connectToHost("192.168.1.50", 8080, "4829"); // Valid 4-digit PIN
    
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    assert(lastState == ConnectionState::Connected);
    assert(client.currentState() == ConnectionState::Connected);
    assert(eventReceived == true);
    
    // Test sending command
    bool commandSent = client.sendCommand("SET_MIXER_VOL", "{\"stemId\": 2, \"volume\": 0.8}");
    assert(commandSent == true);
    
    client.disconnect();
    assert(client.currentState() == ConnectionState::Disconnected);

    std::cout << "[PASS] testMobileApiClient passed." << std::endl;
}

int main() {
    try {
        testMobileApiClient();
        std::cout << "\nALL MOBILE API CLIENT UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in mobile api client unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
