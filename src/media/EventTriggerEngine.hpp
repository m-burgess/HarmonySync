#ifndef HARMONYSYNC_EVENT_TRIGGER_ENGINE_HPP
#define HARMONYSYNC_EVENT_TRIGGER_ENGINE_HPP

#include <string>
#include <vector>
#include <memory>
#include <cstdint>

namespace HarmonySync::Media {

struct TimelineCue {
    double timestampSeconds{0.0};
    std::string cueName;
    uint16_t dmxChannel{0};
    uint8_t dmxValue{0};
    int targetSlideIndex{-1};
    bool fired{false};
};

/**
 * @brief Event trigger engine evaluating timeline position against DMX cues and slide changes.
 */
class EventTriggerEngine {
public:
    EventTriggerEngine();
    ~EventTriggerEngine();

    EventTriggerEngine(const EventTriggerEngine&) = delete;
    EventTriggerEngine& operator=(const EventTriggerEngine&) = delete;
    EventTriggerEngine(EventTriggerEngine&&) noexcept;
    EventTriggerEngine& operator=(EventTriggerEngine&&) noexcept;

    void addCue(TimelineCue cue);
    [[nodiscard]] const std::vector<TimelineCue>& cues() const noexcept;
    std::vector<TimelineCue> evaluateCuesAtPosition(double positionSeconds);
    void resetAllCues() noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_EVENT_TRIGGER_ENGINE_HPP
