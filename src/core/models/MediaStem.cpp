#include "MediaStem.hpp"
#include <algorithm>
#include <utility>

namespace HarmonySync::Core {

struct MediaStem::Impl {
    std::string id;
    std::string name;
    std::string filePath;
    float volume{1.0f};
    bool muted{false};
    bool solo{false};
    int pitchShiftSemitones{0};

    Impl() = default;
    Impl(std::string id_, std::string name_, std::string filePath_)
        : id(std::move(id_))
        , name(std::move(name_))
        , filePath(std::move(filePath_))
    {}
};

MediaStem::MediaStem()
    : m_impl(std::make_unique<Impl>())
{}

MediaStem::MediaStem(std::string stemId, std::string name, std::string filePath)
    : m_impl(std::make_unique<Impl>(std::move(stemId), std::move(name), std::move(filePath)))
{}

MediaStem::~MediaStem() = default;

MediaStem::MediaStem(const MediaStem& other)
    : m_impl(std::make_unique<Impl>(*other.m_impl))
{}

MediaStem& MediaStem::operator=(const MediaStem& other) {
    if (this != &other) {
        *m_impl = *other.m_impl;
    }
    return *this;
}

MediaStem::MediaStem(MediaStem&& other) noexcept = default;

MediaStem& MediaStem::operator=(MediaStem&& other) noexcept = default;

const std::string& MediaStem::id() const noexcept {
    return m_impl->id;
}

const std::string& MediaStem::name() const noexcept {
    return m_impl->name;
}

const std::string& MediaStem::filePath() const noexcept {
    return m_impl->filePath;
}

float MediaStem::volume() const noexcept {
    return m_impl->volume;
}

bool MediaStem::isMuted() const noexcept {
    return m_impl->muted;
}

bool MediaStem::isSolo() const noexcept {
    return m_impl->solo;
}

int MediaStem::pitchShiftSemitones() const noexcept {
    return m_impl->pitchShiftSemitones;
}

void MediaStem::setVolume(float newVolume) noexcept {
    m_impl->volume = std::clamp(newVolume, 0.0f, 1.0f);
}

void MediaStem::setMuted(bool muted) noexcept {
    m_impl->muted = muted;
}

void MediaStem::setSolo(bool solo) noexcept {
    m_impl->solo = solo;
}

void MediaStem::setPitchShiftSemitones(int semitones) noexcept {
    m_impl->pitchShiftSemitones = semitones;
}

} // namespace HarmonySync::Core
