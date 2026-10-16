#include "MidiHardwareDevice.hpp"
#include "MidiMappingViewModel.hpp"
#include "test_check.hpp"
#include <iostream>
#include <cstdlib>

using namespace HarmonySync::Media;
using namespace HarmonySync::ViewModels;

void testMidiHardwareDevice() {
    std::cout << "[TEST] Running testMidiHardwareDevice..." << std::endl;

    MidiHardwareDevice device;
    auto ports = device.availablePorts();
    HS_CHECK(!ports.empty());
    HS_CHECK(ports[0] == "Korg nanoKONTROL2 MIDI 1");

    HS_CHECK(!device.isConnected());
    bool connected = device.connectPort("Korg nanoKONTROL2 MIDI 1");
    HS_CHECK(connected);
    HS_CHECK(device.isConnected());
    HS_CHECK(device.connectedPortName() == "Korg nanoKONTROL2 MIDI 1");

    bool callbackTriggered = false;
    MidiMessage receivedMsg;
    device.setMidiCallback([&](const MidiMessage& msg) {
        callbackTriggered = true;
        receivedMsg = msg;
    });

    // Simulate CC Message: Channel 1, CC #16 (Fader 1), Value 127
    device.simulateMidiInput(0xB0, 16, 127);
    HS_CHECK(callbackTriggered);
    HS_CHECK(receivedMsg.type == MidiMessageType::ControlChange);
    HS_CHECK(receivedMsg.channel == 1);
    HS_CHECK(receivedMsg.controlNumber == 16);
    HS_CHECK(receivedMsg.velocityValue == 127);

    device.disconnectPort();
    HS_CHECK(!device.isConnected());

    std::cout << "[PASS] testMidiHardwareDevice passed." << std::endl;
}

void testMidiMappingViewModel() {
    std::cout << "[TEST] Running testMidiMappingViewModel..." << std::endl;

    auto device = std::make_shared<MidiHardwareDevice>();
    MidiMappingViewModel vm(device);

    HS_CHECK(!vm.isConnected());
#ifdef HARMONYSYNC_QT_AVAILABLE
    bool connected = vm.connectPort(QStringLiteral("Novation Launchpad Mini"));
#else
    bool connected = vm.connectPort("Novation Launchpad Mini");
#endif
    HS_CHECK(connected);
    HS_CHECK(vm.isConnected());
    HS_CHECK(vm.connectedPortNameStd() == "Novation Launchpad Mini");
    HS_CHECK(!vm.availablePorts().empty());
#ifdef HARMONYSYNC_QT_AVAILABLE
    HS_CHECK(vm.connectedPortName() == QStringLiteral("Novation Launchpad Mini"));
#endif

    // Test Manual Binding
#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.bindControl(QStringLiteral("Stem1Volume"), 16, 1, true);
#else
    vm.bindControl("Stem1Volume", 16, 1, true);
#endif

    const MidiTargetBinding* binding = vm.getBindingForTarget("Stem1Volume");
    HS_CHECK(binding != nullptr);
    HS_CHECK(binding->controlNumber == 16);
    HS_CHECK(binding->channel == 1);
    HS_CHECK(binding->isCC);

    // Test MIDI Learn Mode
    HS_CHECK(!vm.isLearning());
#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.startMidiLearn(QStringLiteral("MasterGain"));
#else
    vm.startMidiLearn("MasterGain");
#endif
    HS_CHECK(vm.isLearning());
    HS_CHECK(vm.activeLearnTargetStd() == "MasterGain");
#ifdef HARMONYSYNC_QT_AVAILABLE
    HS_CHECK(vm.activeLearnTarget() == QStringLiteral("MasterGain"));
#endif

    // Simulate input while learning
    device->simulateMidiInput(0xB0, 7, 64); // Master Volume CC #7
    HS_CHECK(!vm.isLearning());             // Learn auto-completes

    const MidiTargetBinding* learnedBinding = vm.getBindingForTarget("MasterGain");
    HS_CHECK(learnedBinding != nullptr);
    HS_CHECK(learnedBinding->controlNumber == 7);
    HS_CHECK(learnedBinding->channel == 1);
    HS_CHECK(learnedBinding->isCC);

    std::string json = vm.saveProfileJsonStd();
    HS_CHECK(json.find("Korg nanoKONTROL2") != std::string::npos);
    HS_CHECK(json.find("MasterGain") != std::string::npos);
    HS_CHECK(vm.loadProfileJsonStd(json));
    HS_CHECK(!vm.loadProfileJsonStd(""));
#ifdef HARMONYSYNC_QT_AVAILABLE
    HS_CHECK(vm.saveProfileJson().toStdString() == json);
    HS_CHECK(vm.loadProfileJson(QString::fromStdString(json)));
    HS_CHECK(!vm.loadProfileJson(QString()));
#endif
    vm.clearBinding(
#ifdef HARMONYSYNC_QT_AVAILABLE
        QStringLiteral("MasterGain")
#else
        "MasterGain"
#endif
    );
    HS_CHECK(vm.getBindingForTarget("MasterGain") == nullptr);
    HS_CHECK(vm.getBindingForTarget("missing") == nullptr);

    vm.startMidiLearn(
#ifdef HARMONYSYNC_QT_AVAILABLE
        QStringLiteral("NextSlide")
#else
        "NextSlide"
#endif
    );
    device->simulateMidiInput(0x92, 64, 100); // Note-on on channel 3 is not a CC.
    const MidiTargetBinding* learnedNote = vm.getBindingForTarget("NextSlide");
    HS_CHECK(learnedNote != nullptr);
    HS_CHECK(learnedNote->controlNumber == 64);
    HS_CHECK(learnedNote->channel == 3);
    HS_CHECK(!learnedNote->isCC);
    HS_CHECK(!vm.isLearning());
    vm.cancelMidiLearn(); // cancel when already idle is safe
    HS_CHECK(vm.activeLearnTargetStd().empty());
    vm.disconnectPort();
    HS_CHECK(!vm.isConnected());

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
