#ifndef HARMONYSYNC_TESTS_FAKE_AUDIO_SINK_HPP
#define HARMONYSYNC_TESTS_FAKE_AUDIO_SINK_HPP

#include "AudioSink.hpp"
#include <cstddef>
#include <cstdint>
#include <memory>
#include <vector>

// Pulls from the engine on demand, like the device callback, so tests need no audio device or timing.
class FakeAudioSink : public HarmonySync::Media::IAudioSink {
public:
    int startCalls{0};
    int stopCalls{0};
    // Outlives the sink, so a test can see that destroying the engine stopped it.
    std::shared_ptr<int> totalStops{std::make_shared<int>(0)};

    void start(HarmonySync::Media::IPcmSource& pcmSource) override {
        source = &pcmSource;
        ++startCalls;
        running = true;
        active = true;
    }
    void stop() override {
        ++stopCalls;
        ++*totalStops;
        running = false;
        active = false;
    }
    bool isRunning() const override { return running; }
    bool isActive() const override { return active; }

    // Running but no longer pulling, as a device does after an underrun.
    void goIdle() { active = false; }

    // One device callback asking for `frames` stereo frames; returns the interleaved L/R samples written.
    std::vector<std::int16_t> pull(std::size_t frames) {
        std::vector<std::int16_t> out(frames * 2, std::int16_t{0x5A5A});
        const std::size_t bytes = source->read(reinterpret_cast<char*>(out.data()), out.size() * sizeof(std::int16_t));
        out.resize(bytes / sizeof(std::int16_t));
        return out;
    }

    std::size_t bytesAvailable() const { return source->bytesAvailable(); }

private:
    HarmonySync::Media::IPcmSource* source{nullptr};
    bool running{false};
    bool active{false};
};

#endif // HARMONYSYNC_TESTS_FAKE_AUDIO_SINK_HPP
