#include "DmxController.hpp"
#include "EventTriggerEngine.hpp"
#include "MidiHardwareDevice.hpp"
#include "NdiVideoOutputService.hpp"
#include "VideoBackgroundPlayer.hpp"
#include "test_check.hpp"
#include <algorithm>
#include <array>
#include <limits>
#include <latch>
#include <thread>
#include <utility>

using namespace HarmonySync::Media;

namespace {
class FakeDmx final : public IDmxOutput {
public:
    std::vector<uint8_t> packet;
    bool result{true};
    bool send(std::span<const uint8_t> bytes) override {
        packet.assign(bytes.begin(), bytes.end());
        return result;
    }
};

struct MidiState {
    IMidiPort::InputHandler input;
    std::string opened;
    int closes{0};
    bool result{true};
};
class FakeMidi final : public IMidiPort {
public:
    explicit FakeMidi(std::shared_ptr<MidiState> state)
        : m_state(std::move(state)) {}
    std::vector<std::string> availablePorts() const override { return {"test input"}; }
    bool open(const std::string& name) override {
        m_state->opened = name;
        return m_state->result;
    }
    void close() override { ++m_state->closes; }
    void setInputHandler(InputHandler handler) override { m_state->input = std::move(handler); }

private:
    std::shared_ptr<MidiState> m_state;
};

struct NdiState {
    bool result{true};
    int starts{0};
    int stops{0};
    int sends{0};
    std::string name;
    std::vector<uint8_t> frame;
    int width{0};
    int height{0};
};
class FakeNdi final : public INdiSender {
public:
    explicit FakeNdi(std::shared_ptr<NdiState> state)
        : m_state(std::move(state)) {}
    bool start(const std::string& name) override {
        ++m_state->starts;
        m_state->name = name;
        return m_state->result;
    }
    void stop() override { ++m_state->stops; }
    void send(std::span<const uint8_t> rgba, int width, int height) override {
        ++m_state->sends;
        m_state->frame.assign(rgba.begin(), rgba.end());
        m_state->width = width;
        m_state->height = height;
    }

private:
    std::shared_ptr<NdiState> m_state;
};

struct VideoState {
    bool result{true};
    std::string primary;
    std::string secondary;
    int plays{0};
    int pauses{0};
    int stops{0};
    bool looping{false};
    int transitions{0};
    VideoTransitionMode mode{VideoTransitionMode::Cut};
    int duration{0};
};
class FakeVideo final : public IVideoPlayerBackend {
public:
    explicit FakeVideo(std::shared_ptr<VideoState> state)
        : m_state(std::move(state)) {}
    bool loadPrimary(const std::string& path) override {
        m_state->primary = path;
        return m_state->result;
    }
    bool loadSecondary(const std::string& path) override {
        m_state->secondary = path;
        return m_state->result;
    }
    void play() override { ++m_state->plays; }
    void pause() override { ++m_state->pauses; }
    void stop() override { ++m_state->stops; }
    void setLooping(bool loop) override { m_state->looping = loop; }
    void transition(VideoTransitionMode mode, int durationMs) override {
        ++m_state->transitions;
        m_state->mode = mode;
        m_state->duration = durationMs;
    }

private:
    std::shared_ptr<VideoState> m_state;
};

void testDmx() {
    auto output = std::make_unique<FakeDmx>();
    auto* fake = output.get();
    DmxController dmx(std::move(output));
    for (uint16_t channel = 1; channel <= 512; ++channel) {
        HS_CHECK(dmx.channelValue(channel) == 0);
    }
    dmx.setChannelValue(0, 5);
    dmx.setChannelValue(513, 5);
    HS_CHECK(dmx.channelValue(0) == 0);
    HS_CHECK(dmx.channelValue(513) == 0);
    dmx.setChannelValue(1, 255);
    dmx.setChannelValue(512, 127);
    HS_CHECK(dmx.send(0x1234));
    const std::vector<uint8_t> header{'A', 'r', 't', '-', 'N', 'e', 't', 0, 0, 0x50, 0, 14, 0, 0, 0x34, 0x12, 2, 0};
    HS_CHECK(fake->packet.size() == 530);
    HS_CHECK(std::equal(header.begin(), header.end(), fake->packet.begin()));
    HS_CHECK(fake->packet[18] == 255);
    HS_CHECK(fake->packet.back() == 127);
    fake->result = false;
    HS_CHECK(!dmx.send());
    DmxController moved(std::move(dmx));
    DmxController assigned(nullptr);
    HS_CHECK(!assigned.send());
    assigned = std::move(moved);
    HS_CHECK(assigned.channelValue(512) == 127);
    assigned.clearAllChannels();
    const auto cleared = assigned.buildArtDmxPacket();
    HS_CHECK(std::all_of(cleared.begin() + 18, cleared.end(), [](uint8_t value) { return value == 0; }));
    DmxController offline;
    HS_CHECK(!offline.send());
}

void testCues() {
    EventTriggerEngine engine;
    HS_CHECK(engine.evaluateCuesAtPosition(100).empty());
    engine.addCue({5, "later", 512, 255, 7, false});
    engine.addCue({0, "start", 1, 12, 0, false});
    engine.addCue({5, "same time", 2, 8, -1, false});
    engine.addCue({1, "already fired", 3, 1, -1, true});
    HS_CHECK(engine.evaluateCuesAtPosition(-1).empty());
    HS_CHECK(engine.evaluateCuesAtPosition(std::numeric_limits<double>::quiet_NaN()).empty());
    auto fired = engine.evaluateCuesAtPosition(0);
    HS_CHECK(fired.size() == 1);
    HS_CHECK(fired[0].cueName == "start");
    HS_CHECK(fired[0].fired);
    HS_CHECK(engine.evaluateCuesAtPosition(0).empty());
    fired = engine.evaluateCuesAtPosition(5);
    HS_CHECK(fired.size() == 2);
    HS_CHECK(fired[0].cueName == "later");
    HS_CHECK(fired[0].dmxChannel == 512);
    HS_CHECK(fired[0].dmxValue == 255);
    HS_CHECK(fired[0].targetSlideIndex == 7);
    HS_CHECK(fired[1].cueName == "same time");
    HS_CHECK(engine.evaluateCuesAtPosition(2).empty());
    EventTriggerEngine moved(std::move(engine));
    EventTriggerEngine assigned;
    assigned = std::move(moved);
    assigned.resetAllCues();
    HS_CHECK(std::none_of(assigned.cues().begin(), assigned.cues().end(), [](const auto& cue) { return cue.fired; }));
    HS_CHECK(assigned.evaluateCuesAtPosition(5).size() == 4);
}

void testMidi() {
    const auto state = std::make_shared<MidiState>();
    {
        MidiHardwareDevice device(std::make_unique<FakeMidi>(state));
        HS_CHECK(device.availablePorts() == std::vector<std::string>{"test input"});
        HS_CHECK(!device.isConnected());
        state->input(0x90, 60, 127); // No callback registered.
        HS_CHECK(device.connectPort("test input"));
        HS_CHECK(state->opened == "test input");
        HS_CHECK(device.connectedPortName() == "test input");
        state->result = false;
        HS_CHECK(!device.connectPort("missing"));
        HS_CHECK(!device.isConnected());
        HS_CHECK(device.connectedPortName().empty());
        state->result = true;
        HS_CHECK(device.connectPort("test input"));
        std::vector<MidiMessage> received;
        device.setMidiCallback([&](const MidiMessage& msg) {
            HS_CHECK(device.isConnected()); // Callback may query state.
            received.push_back(msg);
            device.setMidiCallback({}); // Callback may unregister itself.
        });
        state->input(0xBF, 16, 127);
        HS_CHECK(received.size() == 1);
        HS_CHECK(received.back().type == MidiMessageType::ControlChange);
        HS_CHECK(received.back().channel == 16);
        HS_CHECK(received.back().controlNumber == 16);
        HS_CHECK(received.back().velocityValue == 127);
        device.setMidiCallback([&](const MidiMessage& msg) { received.push_back(msg); });
        const std::array types{MidiMessageType::NoteOff,       MidiMessageType::NoteOn,
                               MidiMessageType::ControlChange, MidiMessageType::ProgramChange,
                               MidiMessageType::PitchBend,     MidiMessageType::Unknown};
        for (auto type : types) {
            state->input(static_cast<uint8_t>(type), 60, 0);
            HS_CHECK(received.back().type == type);
            HS_CHECK(received.back().channel == 1);
        }
        MidiHardwareDevice moved(std::move(device));
        MidiHardwareDevice assigned(nullptr);
        HS_CHECK(assigned.availablePorts().empty());
        HS_CHECK(!assigned.connectPort("missing"));
        assigned.disconnectPort();
        assigned = std::move(moved);
        assigned.simulateMidiInput(0x91, 61, 64);
        HS_CHECK(received.back().channel == 2);
        state->input(0x92, 62, 65); // Handler survives moves of the public object.
        HS_CHECK(received.back().channel == 3);
        assigned.disconnectPort();
        HS_CHECK(!assigned.isConnected());
        HS_CHECK(assigned.connectedPortName().empty());
        assigned.setMidiCallback({});
    }
    HS_CHECK(!state->input);
    HS_CHECK(state->closes == 5);
    MidiHardwareDevice offline;
    HS_CHECK(offline.availablePorts().size() == 3);
    HS_CHECK(offline.connectPort("custom mock"));
    offline.disconnectPort();
}

void testNdi() {
    const auto state = std::make_shared<NdiState>();
    const std::array<uint8_t, 12> pixels{1, 2, 3, 255, 4, 5, 6, 128, 9, 9, 9, 9};
    {
        NdiVideoOutputService service("test stream", std::make_unique<FakeNdi>(state));
        HS_CHECK(!service.isStreaming());
        HS_CHECK(service.streamName() == "test stream");
        HS_CHECK((service.resolution() == std::pair{1920, 1080}));
        service.sendFrame(pixels.data(), pixels.size());
        HS_CHECK(state->sends == 0);
        state->result = false;
        HS_CHECK(!service.startStreaming());
        state->result = true;
        HS_CHECK(service.startStreaming());
        HS_CHECK(service.startStreaming());
        HS_CHECK(state->starts == 2);
        HS_CHECK(state->name == "test stream");
        service.setResolution(2, 1);
        service.setResolution(0, 3);
        service.setResolution(3, -1);
        HS_CHECK((service.resolution() == std::pair{2, 1}));
        service.sendFrame(nullptr, 8);
        service.sendFrame(pixels.data(), 7);
        HS_CHECK(state->sends == 0);
        service.sendFrame(pixels.data(), pixels.size());
        HS_CHECK(state->sends == 1);
        HS_CHECK(state->frame == std::vector<uint8_t>(pixels.begin(), pixels.begin() + 8));
        HS_CHECK(state->width == 2 && state->height == 1);
        service.setResolution(std::numeric_limits<int>::max(), std::numeric_limits<int>::max());
        service.sendFrame(pixels.data(), pixels.size());
        HS_CHECK(state->sends == 1);
        NdiVideoOutputService moved(std::move(service));
        NdiVideoOutputService assigned("null", nullptr);
        HS_CHECK(!assigned.startStreaming());
        assigned.stopStreaming();
        assigned = std::move(moved);
        assigned.stopStreaming();
        assigned.stopStreaming();
        HS_CHECK(state->stops == 1);
        HS_CHECK(!assigned.isStreaming());
        HS_CHECK(assigned.startStreaming());
    }
    HS_CHECK(state->stops == 2); // Destruction releases a running sender.
    NdiVideoOutputService offline;
    HS_CHECK(offline.streamName() == "HarmonySync Program Out");
    HS_CHECK(offline.startStreaming());
    offline.setResolution(1, 1);
    offline.sendFrame(pixels.data(), pixels.size());
}

void testMidiDiscoveryDuringClose() {
    class ThreadedMidi final : public IMidiPort {
    public:
        InputHandler input;
        std::latch closing{1};
        std::thread delivery;
        std::vector<std::string> availablePorts() const override { return {"threaded input"}; }
        bool open(const std::string& /*name*/) override { return true; }
        void close() override {
            if (delivery.joinable()) {
                closing.count_down();
                delivery.join();
            }
        }
        void setInputHandler(InputHandler handler) override { input = std::move(handler); }
        void deliverDuringClose() {
            delivery = std::thread([this] { input(0x90, 60, 127); });
        }
    };
    for (bool reconnect : {false, true}) {
        auto port = std::make_unique<ThreadedMidi>();
        auto* fake = port.get();
        MidiHardwareDevice device(std::move(port));
        HS_CHECK(device.connectPort("threaded input"));
        bool queried = false;
        device.setMidiCallback([&](const MidiMessage&) {
            fake->closing.wait();
            HS_CHECK(device.availablePorts() == std::vector<std::string>{"threaded input"});
            HS_CHECK(device.isConnected());
            queried = true;
        });
        fake->deliverDuringClose();
        if (reconnect) {
            HS_CHECK(device.connectPort("threaded input"));
        } else {
            device.disconnectPort();
        }
        HS_CHECK(queried); // close() has joined the delivery thread.
        HS_CHECK(device.isConnected() == reconnect);
        device.setMidiCallback({});
    }
}

void testVideo() {
    const auto state = std::make_shared<VideoState>();
    {
        VideoBackgroundPlayer player(std::make_unique<FakeVideo>(state));
        HS_CHECK(!player.isPlaying());
        HS_CHECK(player.isLooping() && state->looping);
        HS_CHECK(player.transitionDurationMs() == 1000);
        HS_CHECK(player.crossfadeProgress() == 0);
        player.crossfadeToSecondary();
        HS_CHECK(state->transitions == 0);
        HS_CHECK(!player.loadPrimaryVideo(""));
        HS_CHECK(!player.loadSecondaryVideo(""));
        HS_CHECK(player.loadPrimaryVideo("first.mp4"));
        HS_CHECK(state->primary == "first.mp4");
        const auto snapshot = player.activeVideoPath();
        HS_CHECK(player.loadPrimaryVideo("replacement.mp4"));
        HS_CHECK(player.activeVideoPath() == "first.mp4"); // Existing active-path policy.
        HS_CHECK(player.loadSecondaryVideo("next.mp4"));
        HS_CHECK(state->secondary == "next.mp4");
        state->result = false;
        HS_CHECK(!player.loadPrimaryVideo("bad primary"));
        HS_CHECK(!player.loadSecondaryVideo("bad secondary"));
        HS_CHECK(!player.loadSecondaryVideo(""));
        player.play();
        HS_CHECK(player.isPlaying() && state->plays == 1);
        player.pause();
        HS_CHECK(!player.isPlaying() && state->pauses == 1);
        player.setLooping(false);
        HS_CHECK(!player.isLooping() && !state->looping);
        player.setTransitionDurationMs(250);
        HS_CHECK(player.transitionDurationMs() == 250);
        for (auto mode : {VideoTransitionMode::Cut, VideoTransitionMode::Crossfade, VideoTransitionMode::AlphaBlend}) {
            player.crossfadeToSecondary(mode);
            HS_CHECK(state->mode == mode && state->duration == 250);
            HS_CHECK(player.activeVideoPath() == "next.mp4");
            HS_CHECK(player.crossfadeProgress() == 1);
        }
        HS_CHECK(state->transitions == 3);
        HS_CHECK(snapshot == "first.mp4");
        VideoBackgroundPlayer moved(std::move(player));
        VideoBackgroundPlayer assigned(nullptr);
        HS_CHECK(!assigned.loadPrimaryVideo("no backend"));
        HS_CHECK(!assigned.loadSecondaryVideo("no backend"));
        assigned.play();
        HS_CHECK(!assigned.isPlaying());
        assigned.pause();
        assigned.stop();
        assigned.setLooping(false);
        assigned = std::move(moved);
        assigned.stop();
        HS_CHECK(assigned.crossfadeProgress() == 0 && !assigned.isPlaying());
        HS_CHECK(state->stops == 1);
    }
    HS_CHECK(state->stops == 2);
    VideoBackgroundPlayer offline;
    HS_CHECK(offline.loadPrimaryVideo("mock.mp4"));
    HS_CHECK(offline.loadSecondaryVideo("other.mp4"));
    offline.play();
    offline.pause();
    offline.crossfadeToSecondary();
    offline.stop();
}
} // namespace

int main() {
    testDmx();
    testCues();
    testMidi();
    testMidiDiscoveryDuringClose();
    testNdi();
    testVideo();
}
