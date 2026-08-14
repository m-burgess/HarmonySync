#ifndef HARMONYSYNC_SONG_MAP_HPP
#define HARMONYSYNC_SONG_MAP_HPP

#include "MediaStem.hpp"
#include <string>
#include <vector>
#include <memory>

namespace HarmonySync::Core {

struct SongSection {
    std::string name;
    std::string chords;
    std::vector<std::string> lines;
};

struct TimedLyricLine {
    double timestampSeconds{0.0};
    std::string text;
};

/**
 * @brief Domain model representing a song arrangement with key, tempo, stems, and lyrics.
 */
class SongMap {
public:
    SongMap();
    SongMap(std::string songId, std::string title, std::string artist);
    ~SongMap();

    SongMap(const SongMap& other);
    SongMap& operator=(const SongMap& other);
    SongMap(SongMap&& other) noexcept;
    SongMap& operator=(SongMap&& other) noexcept;

    // Getters
    [[nodiscard]] const std::string& id() const noexcept;
    [[nodiscard]] const std::string& title() const noexcept;
    [[nodiscard]] const std::string& artist() const noexcept;
    [[nodiscard]] const std::string& originalKey() const noexcept;
    [[nodiscard]] const std::string& currentKey() const noexcept;
    [[nodiscard]] double tempoBpm() const noexcept;
    [[nodiscard]] const std::vector<MediaStem>& stems() const noexcept;
    [[nodiscard]] const std::vector<SongSection>& sections() const noexcept;
    [[nodiscard]] const std::string& lyricsContent() const noexcept;
    [[nodiscard]] const std::vector<TimedLyricLine>& timedLyrics() const noexcept;
    [[nodiscard]] bool hasSongMap() const noexcept;
    [[nodiscard]] const std::string& folderPath() const noexcept;
    [[nodiscard]] const std::string& backgroundVideoPath() const noexcept;

    // Setters / Modifiers
    void setKeys(std::string origKey, std::string curKey);
    void setTempoBpm(double bpm) noexcept;
    void setSections(std::vector<SongSection> sections);
    void setLyricsContent(std::string lyrics);
    void setTimedLyrics(std::vector<TimedLyricLine> timedLyrics);
    void setHasSongMap(bool hasMap) noexcept;
    void setFolderPath(std::string path);
    void setBackgroundVideoPath(std::string path);
    void addStem(MediaStem stem);
    void clearStems() noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_SONG_MAP_HPP
