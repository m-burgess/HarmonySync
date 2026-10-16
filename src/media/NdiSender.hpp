#ifndef HARMONYSYNC_NDI_SENDER_HPP
#define HARMONYSYNC_NDI_SENDER_HPP
#include <cstdint>
#include <memory>
#include <span>
#include <string>
namespace HarmonySync::Media {
class INdiSender {
public:
    virtual ~INdiSender() = default;
    virtual bool start(const std::string& name) = 0;
    virtual void stop() = 0;
    // Synchronous RGBA delivery; the sender must not retain the borrowed buffer.
    virtual void send(std::span<const uint8_t> rgba, int width, int height) = 0;
};
std::unique_ptr<INdiSender> createOfflineNdiSender();
} // namespace HarmonySync::Media
#endif
