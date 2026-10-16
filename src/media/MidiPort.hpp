#ifndef HARMONYSYNC_MIDI_PORT_HPP
#define HARMONYSYNC_MIDI_PORT_HPP
#include <cstdint>
#include <functional>
#include <memory>
#include <string>
#include <vector>
namespace HarmonySync::Media {
class IMidiPort {
public:
    using InputHandler = std::function<void(uint8_t, uint8_t, uint8_t)>;
    virtual ~IMidiPort() = default;
    virtual std::vector<std::string> availablePorts() const = 0;
    virtual bool open(const std::string& name) = 0;
    // close() quiesces delivery before returning. Lifecycle methods do not invoke handlers inline.
    virtual void close() = 0;
    virtual void setInputHandler(InputHandler handler) = 0;
};
std::unique_ptr<IMidiPort> createOfflineMidiPort();
} // namespace HarmonySync::Media
#endif
