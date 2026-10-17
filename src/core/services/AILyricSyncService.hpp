#ifndef HARMONYSYNC_AI_LYRIC_SYNC_SERVICE_HPP
#define HARMONYSYNC_AI_LYRIC_SYNC_SERVICE_HPP

// main.cpp and the viewmodels key their Qt-only code off this macro, which they receive through this header.
#ifndef HARMONYSYNC_QT_AVAILABLE
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

#include "../models/SongMap.hpp"
#include "ProcessRunner.hpp"
#include <filesystem>
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
    /**
     * @param runner Process launcher; defaults to QProcess.
     * @param scriptPath ai_lyric_sync.py location; empty searches ./scripts, then ../scripts.
     * @param workDir Scratch directory for the lyrics file; empty uses the system temp directory.
     */
    explicit AILyricSyncService(std::shared_ptr<IProcessRunner> runner = nullptr, std::filesystem::path scriptPath = {},
                                std::filesystem::path workDir = {});
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
    void generateTimestamps(const std::string& referenceAudioPath, const std::string& multitrackAudioPath,
                            const std::string& rawLyrics, std::function<void(std::vector<TimedLyricLine>)> onSuccess,
                            std::function<void(std::string)> onError,
                            std::function<void(std::string)> onProgress = nullptr);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_AI_LYRIC_SYNC_SERVICE_HPP
