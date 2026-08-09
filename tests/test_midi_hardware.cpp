#include "MidiHardwareDevice.hpp"
#include "MidiMappingViewModel.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Media;
using namespace HarmonySync::ViewModels;

void testMidiHardwareDevice() {
    std::cout << "[TEST] Running testMidiHardwareDevice..." << std::endl;

    MidiHardwareDevice device;
    auto ports = device.availablePorts();
    assert(!ports.empty());
    assert(ports[0] == "Korg nanoKONTROL2 MIDI 1");

    assert(!device.isConnected());
    bool connected = device.connectPort("Korg nanoKONTROL2 MIDI 1");
    assert(connected == true);
    assert(device.isConnected() == true);
    assert(device.connectedPortName() == "Korg nanoKONTROL2 MIDI 1");

    bool callbackTriggered = false;
    MidiMessage receivedMsg;
    device.setMidiCallback([&](const MidiMessage& msg) {
        callbackTriggered = true;
        receivedMsg = msg;
    });

    // Simulate CC Message: Channel 1, CC #16 (Fader 1), Value 127
    device.simulateMidiInput(0xB0, 16, 127);
    assert(callbackTriggered == true);
    assert(receivedMsg.type == MidiMessageType::ControlChange);
    assert(receivedMsg.channel == 1);
    assert(receivedMsg.controlNumber == 16);
    assert(receivedMsg.velocityValue == 127);

    device.disconnectPort();
    assert(!device.isConnected());

    std::cout << "[PASS] testMidiHardwareDevice passed." << std::endl;
}

void testMidiMappingViewModel() {
    std::cout << "[TEST] Running testMidiMappingViewModel..." << std::endl;

    auto device = std::make_shared<MidiHardwareDevice>();
    MidiMappingViewModel vm(device);

    assert(!vm.isConnected());
#ifdef HARMONYSYNC_QT_AVAILABLE
    bool connected = vm.connectPort(QStringLiteral("Novation Launchpad Mini"));
#else
    bool connected = vm.connectPort("Novation Launchpad Mini");
#endif
    assert(connected == true);
    assert(vm.isConnected() == true);

    // Test Manual Binding
#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.bindControl(QStringLiteral("Stem1Volume"), 16, 1, true);
#else
    vm.bindControl("Stem1Volume", 16, 1, true);
#endif

    const MidiTargetBinding* binding = vm.getBindingForTarget("Stem1Volume");
    assert(binding != nullptr);
    assert(binding->controlNumber == 16);
    assert(binding->channel == 1);
    assert(binding->isCC == true);

    // Test MIDI Learn Mode
    assert(!vm.isLearning());
#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.startMidiLearn(QStringLiteral("MasterGain"));
#else
    vm.startMidiLearn("MasterGain");
#endif
    assert(vm.isLearning() == true);
    assert(vm.activeLearnTargetStd() == "MasterGain");

    // Simulate input while learning
    device->simulateMidiInput(0xB0, 7, 64); // Master Volume CC #7
    assert(!vm.isLearning()); // Learn auto-completes

    const MidiTargetBinding* learnedBinding = vm.getBindingForTarget("MasterGain");
    assert(learnedBinding != nullptr);
    assert(learnedBinding->controlNumber == 7);

    // Test Profile Export
    std::string json = vm.saveProfileJsonStd();
    assert(json.find("Korg nanoKONTROL2") != std::string::npos);

    std::cout << "[PASS] testMidiMappingViewModel passed." << std::endl;
}

int main() {
    try {
        testMidiHardwareDevice();
        testMidiMappingViewModel();
        std::cout << "\nALL SPRINT 11 MIDI UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in MIDI unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
