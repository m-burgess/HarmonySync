#ifndef HARMONYSYNC_AI_LYRIC_SYNC_SERVICE_HPP
#define HARMONYSYNC_AI_LYRIC_SYNC_SERVICE_HPP

#include "../models/SongMap.hpp"
#include <string>
#include <vector>
#include <functional>
#include <memory>

namespace HarmonySync::Core {

/**
 * @brief Service responsible for orchestrating AI generation of timestamped lyrics.
 * Invokes an external Python script to perform audio analysis against raw lyrics text.
 */
class AILyricSyncService {
public:
    AILyricSyncService();
    ~AILyricSyncService();

    AILyricSyncService(const AILyricSyncService&) = delete;
    AILyricSyncService& operator=(const AILyricSyncService&) = delete;

    /**
     * @brief Generate timestamps asynchronously using an external Python script.
     * @param audioPath Absolute path to the reference audio file.
     * @param rawLyrics The raw lyrics text content to align.
     * @param onSuccess Callback invoked when generation succeeds, providing the parsed TimedLyricLines.
     * @param onError Callback invoked when generation fails, providing an error message.
     */
    void generateTimestamps(
        const std::string& audioPath,
        const std::string& rawLyrics,
        std::function<void(std::vector<TimedLyricLine>)> onSuccess,
        std::function<void(std::string)> onError);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_AI_LYRIC_SYNC_SERVICE_HPP
