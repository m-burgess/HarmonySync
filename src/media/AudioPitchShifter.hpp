#ifndef HARMONYSYNC_AUDIO_PITCH_SHIFTER_HPP
#define HARMONYSYNC_AUDIO_PITCH_SHIFTER_HPP

#include <vector>
#include <memory>

namespace HarmonySync::Media {

/**
 * @brief Real-time time-stretch and pitch-shift DSP algorithm abstraction.
 */
class AudioPitchShifter {
public:
    AudioPitchShifter();
    ~AudioPitchShifter();

    AudioPitchShifter(const AudioPitchShifter&) = delete;
    AudioPitchShifter& operator=(const AudioPitchShifter&) = delete;
    AudioPitchShifter(AudioPitchShifter&&) noexcept;
    AudioPitchShifter& operator=(AudioPitchShifter&&) noexcept;

    // Pitch & Tempo Control
    void setPitchShiftSemitones(int semitones) noexcept;
    [[nodiscard]] int pitchShiftSemitones() const noexcept;
    [[nodiscard]] double calculatePitchScaleFactor() const noexcept;

    // Process float PCM audio buffer
    void processBuffer(const float* inputBuffer, float* outputBuffer, size_t numFrames) noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_AUDIO_PITCH_SHIFTER_HPP
