#ifndef HARMONYSYNC_FFMPEG_TRANSPOSER_HPP
#define HARMONYSYNC_FFMPEG_TRANSPOSER_HPP

#include "CommandRunner.hpp"
#include "MediaStem.hpp"
#include <vector>
#include <string>
#include <functional>
#include <memory>
#include <filesystem>

namespace HarmonySync::Media {

/// Starts a task off the calling thread. The default detaches a std::thread; tests run it inline.
using TaskLauncher = std::function<void(std::function<void()>)>;

class FFmpegTransposer {
public:
    /// Runs ffmpeg through the default Qt runner on detached threads.
    FFmpegTransposer();
    /// Runs ffmpeg through @p runner, which is shared with the worker threads. Null @p launcher
    /// means detached threads.
    explicit FFmpegTransposer(std::shared_ptr<ICommandRunner> runner, TaskLauncher launcher = {});
    ~FFmpegTransposer();

    FFmpegTransposer(const FFmpegTransposer&) = delete;
    FFmpegTransposer& operator=(const FFmpegTransposer&) = delete;

    /**
     * @brief Transposes a list of stems by a given semitone offset.
     * @param stems The list of stems to transpose.
     * @param songRootFolder The root directory of the current song (where Transposed_X will be created).
     * @param semitones The number of semitones to shift (e.g. +2 or -1).
     * @param callback Called upon completion with the new list of transposed MediaStems, on the
     * worker thread (or inline when nothing needs transposing).
     */
    void transposeStemsAsync(const std::vector<Core::MediaStem>& stems, const std::filesystem::path& songRootFolder,
                             int semitones, std::function<void(std::vector<Core::MediaStem>)> callback);

    /**
     * @brief Check if transposed stems for this semitone offset are already cached on disk.
     */
    bool isCached(const std::vector<Core::MediaStem>& stems, const std::filesystem::path& songRootFolder,
                  int semitones) const;

    /**
     * @brief Retrieve the cached stems.
     */
    std::vector<Core::MediaStem> getCachedStems(const std::vector<Core::MediaStem>& stems,
                                                const std::filesystem::path& songRootFolder, int semitones) const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_FFMPEG_TRANSPOSER_HPP
