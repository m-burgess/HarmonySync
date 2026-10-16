#include "EventTriggerEngine.hpp"

namespace HarmonySync::Media {

struct EventTriggerEngine::Impl {
    std::vector<TimelineCue> cues;
};

EventTriggerEngine::EventTriggerEngine()
    : m_impl(std::make_unique<Impl>()) {}

EventTriggerEngine::~EventTriggerEngine() = default;
EventTriggerEngine::EventTriggerEngine(EventTriggerEngine&&) noexcept = default;
EventTriggerEngine& EventTriggerEngine::operator=(EventTriggerEngine&&) noexcept = default;

void EventTriggerEngine::addCue(TimelineCue cue) {
    m_impl->cues.push_back(std::move(cue));
}

const std::vector<TimelineCue>& EventTriggerEngine::cues() const noexcept {
    return m_impl->cues;
}

std::vector<TimelineCue> EventTriggerEngine::evaluateCuesAtPosition(double positionSeconds) {
    std::vector<TimelineCue> firedCues;
    for (auto& cue : m_impl->cues) {
        if (!cue.fired && positionSeconds >= cue.timestampSeconds) {
            cue.fired = true;
            firedCues.push_back(cue);
        }
    }
    return firedCues;
}

void EventTriggerEngine::resetAllCues() noexcept {
    for (auto& cue : m_impl->cues) {
        cue.fired = false;
    }
}

} // namespace HarmonySync::Media
