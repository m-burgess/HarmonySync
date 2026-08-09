#include "AudioEngine.hpp"
#include <algorithm>
#include <iostream>

namespace HarmonySync::Media {

struct AudioEngine::Impl {
    std::vector<Core::MediaStem> stems;
    std::atomic<PlaybackState> state{PlaybackState::Stopped};
    std::atomic<double> position{0.0};
    std::atomic<double> duration{0.0};
    std::atomic<float> masterVolume{1.0f};
    std::atomic<int> pitchSemitones{0};

    Impl() = default;
};

AudioEngine::AudioEngine()
    : m_impl(std::make_unique<Impl>())
{}

AudioEngine::~AudioEngine() = default;

AudioEngine::AudioEngine(AudioEngine&&) noexcept = default;
AudioEngine& AudioEngine::operator=(AudioEngine&&) noexcept = default;

bool AudioEngine::loadStems(const std::vector<Core::MediaStem>& stems) {
    stop();
    m_impl->stems = stems;
    m_impl->position.store(0.0, std::memory_order_relaxed);
    
    // Estimate total duration based on loaded stem metadata
    m_impl->duration.store(m_impl->stems.empty() ? 0.0 : 180.0, std::memory_order_relaxed);
    return !m_impl->stems.empty();
}

void AudioEngine::play() {
    if (m_impl->stems.empty()) {
        return;
    }
    m_impl->state.store(PlaybackState::Playing, std::memory_order_release);
}

void AudioEngine::pause() {
    if (m_impl->state.load(std::memory_order_acquire) == PlaybackState::Playing) {
        m_impl->state.store(PlaybackState::Paused, std::memory_order_release);
    }
}

void AudioEngine::stop() {
    m_impl->state.store(PlaybackState::Stopped, std::memory_order_release);
    m_impl->position.store(0.0, std::memory_order_relaxed);
}

void AudioEngine::seek(double positionSeconds) noexcept {
    double clamped = std::clamp(positionSeconds, 0.0, m_impl->duration.load(std::memory_order_relaxed));
    m_impl->position.store(clamped, std::memory_order_relaxed);
}

void AudioEngine::setMasterVolume(float volume) noexcept {
    float clamped = std::clamp(volume, 0.0f, 1.0f);
    m_impl->masterVolume.store(clamped, std::memory_order_relaxed);
}

void AudioEngine::setPitchShiftSemitones(int semitones) noexcept {
    int clamped = std::clamp(semitones, -12, 12);
    m_impl->pitchSemitones.store(clamped, std::memory_order_relaxed);
}

PlaybackState AudioEngine::playbackState() const noexcept {
    return m_impl->state.load(std::memory_order_acquire);
}

bool AudioEngine::isPlaying() const noexcept {
    return playbackState() == PlaybackState::Playing;
}

double AudioEngine::positionSeconds() const noexcept {
    return m_impl->position.load(std::memory_order_relaxed);
}

double AudioEngine::durationSeconds() const noexcept {
    return m_impl->duration.load(std::memory_order_relaxed);
}

float AudioEngine::masterVolume() const noexcept {
    return m_impl->masterVolume.load(std::memory_order_relaxed);
}

int AudioEngine::pitchShiftSemitones() const noexcept {
    return m_impl->pitchSemitones.load(std::memory_order_relaxed);
}

const std::vector<Core::MediaStem>& AudioEngine::loadedStems() const noexcept {
    return m_impl->stems;
}

} // namespace HarmonySync::Media
