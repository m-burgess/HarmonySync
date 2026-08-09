#ifndef HARMONYSYNC_MEDIA_STEM_HPP
#define HARMONYSYNC_MEDIA_STEM_HPP

#include <string>
#include <memory>

namespace HarmonySync::Core {

/**
 * @brief Domain model representing an individual audio stem track in a multitrack arrangement.
 * Follows Modern C++ RAII and Sutter & Alexandrescu Standard #5 (Single Responsibility).
 */
class MediaStem {
public:
    MediaStem();
    MediaStem(std::string stemId, std::string name, std::string filePath);
    ~MediaStem();

    // Copy and Move operations
    MediaStem(const MediaStem& other);
    MediaStem& operator=(const MediaStem& other);
    MediaStem(MediaStem&& other) noexcept;
    MediaStem& operator=(MediaStem&& other) noexcept;

    // Getters
    [[nodiscard]] const std::string& id() const noexcept;
    [[nodiscard]] const std::string& name() const noexcept;
    [[nodiscard]] const std::string& filePath() const noexcept;
    [[nodiscard]] float volume() const noexcept;
    [[nodiscard]] bool isMuted() const noexcept;
    [[nodiscard]] bool isSolo() const noexcept;
    [[nodiscard]] int pitchShiftSemitones() const noexcept;

    // Setters
    void setVolume(float newVolume) noexcept;
    void setMuted(bool muted) noexcept;
    void setSolo(bool solo) noexcept;
    void setPitchShiftSemitones(int semitones) noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl; // Pimpl idiom for compiler decoupling
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_MEDIA_STEM_HPP
