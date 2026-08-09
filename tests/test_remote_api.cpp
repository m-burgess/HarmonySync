#include "RemoteApiServer.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testRemoteApiServer() {
    std::cout << "[TEST] Running testRemoteApiServer..." << std::endl;

    RemoteApiServer server(8080);
    assert(!server.isRunning());
    assert(server.port() == 8080);

    bool started = server.startServer();
    assert(started == true);
    assert(server.isRunning() == true);

    std::string pin = server.generatePairingPin();
    assert(pin == "7890");

    assert(server.verifyPairingToken("secret_token_7890") == true);
    assert(!server.verifyPairingToken("invalid_token"));

    bool commandExecuted = false;
    std::string recAction, recPayload;
    server.setCommandCallback([&](const std::string& action, const std::string& payload) {
        commandExecuted = true;
        recAction = action;
        recPayload = payload;
    });

    server.simulateRemoteRequest("NEXT_SLIDE", "{}");
    assert(commandExecuted == true);
    assert(recAction == "NEXT_SLIDE");

    server.stopServer();
    assert(!server.isRunning());

    std::cout << "[PASS] testRemoteApiServer passed." << std::endl;
}

int main() {
    try {
        testRemoteApiServer();
        std::cout << "\nALL SPRINT 14 REMOTE API UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Remote API unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
