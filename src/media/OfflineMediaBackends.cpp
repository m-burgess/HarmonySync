#include "DmxOutput.hpp"
#include "MidiPort.hpp"
#include "NdiSender.hpp"
#include "VideoPlayerBackend.hpp"

// Preserve the pre-seam placeholder behavior. These are not hardware adapters and remain measured.
namespace HarmonySync::Media {
namespace {
class OfflineDmxOutput final : public IDmxOutput {
public:
    bool send(std::span<const uint8_t> /*packet*/) override { return false; }
};
class OfflineMidiPort final : public IMidiPort {
public:
    std::vector<std::string> availablePorts() const override {
        return {"Korg nanoKONTROL2 MIDI 1", "Novation Launchpad Mini", "Generic USB MIDI Controller"};
    }
    bool open(const std::string& /*name*/) override { return true; }
    void close() override {}
    void setInputHandler(InputHandler /*handler*/) override {}
};
class OfflineNdiSender final : public INdiSender {
public:
    bool start(const std::string& /*name*/) override { return true; }
    void stop() override {}
    void send(std::span<const uint8_t> /*rgba*/, int /*width*/, int /*height*/) override {}
};
class OfflineVideoPlayerBackend final : public IVideoPlayerBackend {
public:
    bool loadPrimary(const std::string& /*path*/) override { return true; }
    bool loadSecondary(const std::string& /*path*/) override { return true; }
    void play() override {}
    void pause() override {}
    void stop() override {}
    void setLooping(bool /*loop*/) override {}
    void transition(VideoTransitionMode /*mode*/, int /*durationMs*/) override {}
};
} // namespace
std::unique_ptr<IDmxOutput> createOfflineDmxOutput() {
    return std::make_unique<OfflineDmxOutput>();
}
std::unique_ptr<IMidiPort> createOfflineMidiPort() {
    return std::make_unique<OfflineMidiPort>();
}
std::unique_ptr<INdiSender> createOfflineNdiSender() {
    return std::make_unique<OfflineNdiSender>();
}
std::unique_ptr<IVideoPlayerBackend> createOfflineVideoPlayerBackend() {
    return std::make_unique<OfflineVideoPlayerBackend>();
}
} // namespace HarmonySync::Media
