#include "DmxController.hpp"
#include "EventTriggerEngine.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Media;

void testDmxControllerArtNetPacket() {
    std::cout << "[TEST] Running testDmxControllerArtNetPacket..." << std::endl;
    DmxController dmx;

    assert(dmx.channelValue(1) == 0);
    dmx.setChannelValue(1, 255); // Full intensity channel 1
    dmx.setChannelValue(10, 128); // 50% intensity channel 10

    assert(dmx.channelValue(1) == 255);
    assert(dmx.channelValue(10) == 128);

    auto packet = dmx.buildArtDmxPacket(0);
    assert(packet.size() == 18 + 512);

    // Verify ArtNet Header: "Art-Net\0"
    assert(packet[0] == 'A');
    assert(packet[1] == 'r');
    assert(packet[2] == 't');
    assert(packet[7] == '\0');

    // Verify OpCode 0x5000 (ArtDmx)
    assert(packet[8] == 0x00);
    assert(packet[9] == 0x50);

    // Verify channel values in payload
    assert(packet[18 + 0] == 255); // channel 1
    assert(packet[18 + 9] == 128); // channel 10

    std::cout << "[PASS] testDmxControllerArtNetPacket passed." << std::endl;
}

void testEventTriggerEngine() {
    std::cout << "[TEST] Running testEventTriggerEngine..." << std::endl;
    EventTriggerEngine engine;

    TimelineCue cue1{5.0, "Chorus Light Burst", 1, 255, 2, false};
    TimelineCue cue2{15.0, "Bridge Fade", 2, 128, 4, false};
    engine.addCue(cue1);
    engine.addCue(cue2);

    assert(engine.cues().size() == 2);

    // Position 2.0s -> No cues should fire
    auto fired1 = engine.evaluateCuesAtPosition(2.0);
    assert(fired1.empty());

    // Position 6.0s -> Cue 1 (5.0s) should fire
    auto fired2 = engine.evaluateCuesAtPosition(6.0);
    assert(fired2.size() == 1);
    assert(fired2[0].cueName == "Chorus Light Burst");

    // Position 6.0s again -> No new cues should fire (fired flag active)
    auto fired3 = engine.evaluateCuesAtPosition(6.0);
    assert(fired3.empty());

    // Position 20.0s -> Cue 2 (15.0s) should fire
    auto fired4 = engine.evaluateCuesAtPosition(20.0);
    assert(fired4.size() == 1);
    assert(fired4[0].cueName == "Bridge Fade");

    std::cout << "[PASS] testEventTriggerEngine passed." << std::endl;
}

int main() {
    try {
        testDmxControllerArtNetPacket();
        testEventTriggerEngine();
        std::cout << "\nALL AUTOMATION UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in automation unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
