#ifndef HARMONYSYNC_MIDI_HARDWARE_DEVICE_HPP
#define HARMONYSYNC_MIDI_HARDWARE_DEVICE_HPP

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <cstdint>

namespace HarmonySync::Media {

enum class MidiMessageType {
    NoteOff = 0x80,
    NoteOn = 0x90,
    ControlChange = 0xB0,
    ProgramChange = 0xC0,
    PitchBend = 0xE0,
    Unknown = 0x00
};

struct MidiMessage {
    MidiMessageType type{MidiMessageType::Unknown};
    uint8_t channel{1}; // 1-16
    uint8_t controlNumber{0}; // Note number or CC number
    uint8_t velocityValue{0}; // Velocity or CC value (0-127)
};

using MidiCallback = std::function<void(const MidiMessage&)>;

/**
 * @brief Thread-safe manager for MIDI hardware discovery, port connections, and event parsing.
 */
class MidiHardwareDevice {
public:
    MidiHardwareDevice();
    ~MidiHardwareDevice();

    MidiHardwareDevice(const MidiHardwareDevice&) = delete;
    MidiHardwareDevice& operator=(const MidiHardwareDevice&) = delete;
    MidiHardwareDevice(MidiHardwareDevice&&) noexcept;
    MidiHardwareDevice& operator=(MidiHardwareDevice&&) noexcept;

    // Device Discovery
    [[nodiscard]] std::vector<std::string> availablePorts() const;
    bool connectPort(const std::string& portName);
    void disconnectPort();
    [[nodiscard]] bool isConnected() const noexcept;
    [[nodiscard]] std::string connectedPortName() const;

    // Event Registration
    void setMidiCallback(MidiCallback callback);

    // Testing Injection
    void simulateMidiInput(uint8_t status, uint8_t data1, uint8_t data2);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_MIDI_HARDWARE_DEVICE_HPP
