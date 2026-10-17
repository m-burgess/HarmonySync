#ifndef HARMONYSYNC_DMX_CONTROLLER_HPP
#define HARMONYSYNC_DMX_CONTROLLER_HPP
#include "DmxOutput.hpp"

#include <vector>
#include <cstdint>
#include <memory>

namespace HarmonySync::Media {

/**
 * @brief DMX512 lighting automation controller supporting ArtNet UDP packet creation.
 */
class DmxController {
public:
    DmxController();
    explicit DmxController(std::unique_ptr<IDmxOutput> output);
    ~DmxController();

    DmxController(const DmxController&) = delete;
    DmxController& operator=(const DmxController&) = delete;
    DmxController(DmxController&&) noexcept;
    DmxController& operator=(DmxController&&) noexcept;

    // Channel Control (1-indexed channel: 1 to 512, value: 0 to 255)
    void setChannelValue(uint16_t channel, uint8_t value);
    [[nodiscard]] uint8_t channelValue(uint16_t channel) const noexcept;
    void clearAllChannels() noexcept;

    // ArtNet Packet Construction
    [[nodiscard]] std::vector<uint8_t> buildArtDmxPacket(uint16_t universe = 0) const;
    bool send(uint16_t universe = 0);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_DMX_CONTROLLER_HPP
