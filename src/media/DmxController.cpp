#include "DmxController.hpp"
#include <algorithm>

namespace HarmonySync::Media {

struct DmxController::Impl {
    std::vector<uint8_t> channels{std::vector<uint8_t>(512, 0)};
    std::unique_ptr<IDmxOutput> output;
    explicit Impl(std::unique_ptr<IDmxOutput> out)
        : output(std::move(out)) {}
};

DmxController::DmxController()
    : DmxController(createOfflineDmxOutput()) {}

DmxController::DmxController(std::unique_ptr<IDmxOutput> output)
    : m_impl(std::make_unique<Impl>(std::move(output))) {}

bool DmxController::send(uint16_t universe) {
    return m_impl->output && m_impl->output->send(buildArtDmxPacket(universe));
}

DmxController::~DmxController() = default;
DmxController::DmxController(DmxController&&) noexcept = default;
DmxController& DmxController::operator=(DmxController&&) noexcept = default;

void DmxController::setChannelValue(uint16_t channel, uint8_t value) {
    if (channel >= 1 && channel <= 512) {
        m_impl->channels[channel - 1] = value;
    }
}

uint8_t DmxController::channelValue(uint16_t channel) const noexcept {
    if (channel >= 1 && channel <= 512) {
        return m_impl->channels[channel - 1];
    }
    return 0;
}

void DmxController::clearAllChannels() noexcept {
    std::fill(m_impl->channels.begin(), m_impl->channels.end(), static_cast<uint8_t>(0));
}

std::vector<uint8_t> DmxController::buildArtDmxPacket(uint16_t universe) const {
    // Standard ArtNet 4 ArtDmx Packet Specification (18-byte header + 512 channel values)
    std::vector<uint8_t> packet;
    packet.reserve(18 + 512);

    // ID [8 bytes]: 'A' 'r' 't' '-' 'N' 'e' 't' '\0'
    const char* id = "Art-Net";
    packet.insert(packet.end(), id, id + 8);

    // OpCode [2 bytes]: ArtDmx = 0x5000 (Little Endian: 0x00, 0x50)
    packet.push_back(0x00);
    packet.push_back(0x50);

    // ProtVer [2 bytes]: 14 (High byte 0, Low byte 14)
    packet.push_back(0x00);
    packet.push_back(14);

    // Sequence [1 byte]: 0
    packet.push_back(0x00);

    // Physical [1 byte]: 0
    packet.push_back(0x00);

    // SubUni / Universe [2 bytes]
    packet.push_back(static_cast<uint8_t>(universe & 0xFF));
    packet.push_back(static_cast<uint8_t>((universe >> 8) & 0xFF));

    // Length [2 bytes]: 512 (Big Endian: High byte 2, Low byte 0)
    packet.push_back(0x02);
    packet.push_back(0x00);

    // Channel Data [512 bytes]
    packet.insert(packet.end(), m_impl->channels.begin(), m_impl->channels.end());

    return packet;
}

} // namespace HarmonySync::Media
