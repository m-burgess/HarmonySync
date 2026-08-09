#include "MidiHardwareDevice.hpp"
#include <mutex>
#include <iostream>

namespace HarmonySync::Media {

struct MidiHardwareDevice::Impl {
    std::string connectedPort;
    bool connected{false};
    MidiCallback callback;
    mutable std::recursive_mutex mutex;
};

MidiHardwareDevice::MidiHardwareDevice()
    : m_impl(std::make_unique<Impl>())
{}

MidiHardwareDevice::~MidiHardwareDevice() = default;

MidiHardwareDevice::MidiHardwareDevice(MidiHardwareDevice&&) noexcept = default;
MidiHardwareDevice& MidiHardwareDevice::operator=(MidiHardwareDevice&&) noexcept = default;

std::vector<std::string> MidiHardwareDevice::availablePorts() const {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    return {"Korg nanoKONTROL2 MIDI 1", "Novation Launchpad Mini", "Generic USB MIDI Controller"};
}

bool MidiHardwareDevice::connectPort(const std::string& portName) {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    auto ports = availablePorts();
    for (const auto& p : ports) {
        if (p == portName) {
            m_impl->connectedPort = portName;
            m_impl->connected = true;
            return true;
        }
    }
    // Allow custom mock port connection
    m_impl->connectedPort = portName;
    m_impl->connected = true;
    return true;
}

void MidiHardwareDevice::disconnectPort() {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    m_impl->connectedPort.clear();
    m_impl->connected = false;
}

bool MidiHardwareDevice::isConnected() const noexcept {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    return m_impl->connected;
}

std::string MidiHardwareDevice::connectedPortName() const {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    return m_impl->connectedPort;
}

void MidiHardwareDevice::setMidiCallback(MidiCallback callback) {
    std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
    m_impl->callback = std::move(callback);
}

void MidiHardwareDevice::simulateMidiInput(uint8_t status, uint8_t data1, uint8_t data2) {
    MidiCallback cb;
    {
        std::lock_guard<std::recursive_mutex> lock(m_impl->mutex);
        cb = m_impl->callback;
    }

    if (!cb) return;

    MidiMessage msg;
    uint8_t typeBits = status & 0xF0;
    msg.channel = static_cast<uint8_t>((status & 0x0F) + 1);
    msg.controlNumber = data1;
    msg.velocityValue = data2;

    switch (typeBits) {
        case 0x80: msg.type = MidiMessageType::NoteOff; break;
        case 0x90: msg.type = MidiMessageType::NoteOn; break;
        case 0xB0: msg.type = MidiMessageType::ControlChange; break;
        case 0xC0: msg.type = MidiMessageType::ProgramChange; break;
        case 0xE0: msg.type = MidiMessageType::PitchBend; break;
        default:   msg.type = MidiMessageType::Unknown; break;
    }

    cb(msg);
}

} // namespace HarmonySync::Media
