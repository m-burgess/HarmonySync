#ifndef HARMONYSYNC_DMX_OUTPUT_HPP
#define HARMONYSYNC_DMX_OUTPUT_HPP
#include <cstdint>
#include <memory>
#include <span>
namespace HarmonySync::Media {
class IDmxOutput {
public:
    virtual ~IDmxOutput() = default;
    // Consumes the packet before returning; destination configuration belongs to the adapter.
    virtual bool send(std::span<const uint8_t> packet) = 0;
};
std::unique_ptr<IDmxOutput> createOfflineDmxOutput();
} // namespace HarmonySync::Media
#endif
