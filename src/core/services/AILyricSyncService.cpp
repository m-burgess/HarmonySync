#include "AILyricSyncService.hpp"
#include <QByteArray>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <algorithm>
#include <cctype>
#include <fstream>
#include <system_error>
#include <utility>

namespace HarmonySync::Core {

namespace {

using SuccessCallback = std::function<void(std::vector<TimedLyricLine>)>;
using TextCallback = std::function<void(std::string)>;

std::string trim(const std::string& text) {
    const auto isSpace = [](unsigned char c) { return std::isspace(c) != 0; };
    const auto begin = std::find_if_not(text.begin(), text.end(), isSpace);
    const auto end = std::find_if_not(text.rbegin(), std::string::const_reverse_iterator(begin), isSpace).base();
    return std::string(begin, end);
}

// Shared by the runner callbacks, which can outlive the service that started them.
struct ScriptRun {
    std::string pendingOutput;
    std::string scriptOutput;
    SuccessCallback onSuccess;
    TextCallback onError;
    TextCallback onProgress;

    void handleLine(const std::string& line) {
        const QJsonDocument doc = QJsonDocument::fromJson(QByteArray::fromStdString(line));
        if (doc.isObject() && doc.object().contains("progress")) {
            if (onProgress) {
                onProgress(doc.object()["progress"].toString().toStdString());
            }
        } else {
            scriptOutput += line;
        }
    }

    void handleStdout(const std::string& chunk) {
        pendingOutput += chunk;
        std::size_t newline = pendingOutput.find('\n');
        while (newline != std::string::npos) {
            const std::string line = pendingOutput.substr(0, newline + 1);
            pendingOutput.erase(0, newline + 1);
            handleLine(line);
            newline = pendingOutput.find('\n');
        }
    }

    void handleFinished(int exitCode, bool crashed, const std::string& stderrText) {
        if (crashed || exitCode != 0) {
            std::string message = "Python script failed with exit code: " + std::to_string(exitCode);
            const std::string errorOutput = trim(stderrText);
            if (!errorOutput.empty()) {
                message += ". Error: " + errorOutput;
            }
            if (onError) {
                onError(message);
            }
            return;
        }

        scriptOutput += pendingOutput;
        const QJsonDocument doc = QJsonDocument::fromJson(QByteArray::fromStdString(scriptOutput));
        if (!doc.isArray()) {
            if (onError) {
                onError("Python script returned invalid JSON format.");
            }
            return;
        }

        std::vector<TimedLyricLine> lines;
        for (const auto value : doc.array()) {
            const QJsonObject obj = value.toObject();
            if (obj.contains("time") && obj.contains("text")) {
                lines.push_back({obj["time"].toDouble(), obj["text"].toString().toStdString()});
            }
        }
        if (onSuccess) {
            onSuccess(std::move(lines));
        }
    }

    void handleStartFailed(int errorCode) {
        if (onError) {
            onError("Failed to start Python script. Error code: " + std::to_string(errorCode));
        }
    }
};

std::filesystem::path findDefaultScript() {
    const std::filesystem::path currentPath = std::filesystem::current_path();
    std::filesystem::path script = currentPath / "scripts" / "ai_lyric_sync.py";
    if (!std::filesystem::exists(script)) {
        // Running from a build directory.
        script = currentPath.parent_path() / "scripts" / "ai_lyric_sync.py";
    }
    return script;
}

} // namespace

struct AILyricSyncService::Impl {
    std::shared_ptr<IProcessRunner> runner;
    std::filesystem::path scriptPath;
    std::filesystem::path workDir;
};

AILyricSyncService::AILyricSyncService(std::shared_ptr<IProcessRunner> runner, std::filesystem::path scriptPath,
                                       std::filesystem::path workDir)
    : m_impl(std::make_unique<Impl>()) {
    m_impl->runner = runner ? std::move(runner) : createQtProcessRunner();
    m_impl->scriptPath = scriptPath.empty() ? findDefaultScript() : std::move(scriptPath);
    m_impl->workDir = workDir.empty() ? std::filesystem::temp_directory_path() / "harmonysync_ai" : std::move(workDir);
}

AILyricSyncService::~AILyricSyncService() = default;

void AILyricSyncService::generateTimestamps(const std::string& referenceAudioPath,
                                            const std::string& multitrackAudioPath, const std::string& rawLyrics,
                                            std::function<void(std::vector<TimedLyricLine>)> onSuccess,
                                            std::function<void(std::string)> onError,
                                            std::function<void(std::string)> onProgress) {
    if (!std::filesystem::exists(m_impl->scriptPath)) {
        if (onError) {
            onError("AI Lyric Sync script not found at: " + m_impl->scriptPath.string());
        }
        return;
    }

    std::error_code ec;
    std::filesystem::create_directories(m_impl->workDir, ec);
    const std::filesystem::path lyricsPath = m_impl->workDir / "temp_lyrics.txt";
    {
        std::ofstream out(lyricsPath);
        if (!out.is_open()) {
            if (onError) {
                onError("Failed to write temp lyrics file.");
            }
            return;
        }
        out << rawLyrics;
    }

    auto run = std::make_shared<ScriptRun>();
    run->onSuccess = std::move(onSuccess);
    run->onError = std::move(onError);
    run->onProgress = std::move(onProgress);

    ProcessCallbacks callbacks;
    callbacks.onStdout = [run](const std::string& chunk) { run->handleStdout(chunk); };
    callbacks.onFinished = [run](int exitCode, bool crashed, const std::string& stderrText) {
        run->handleFinished(exitCode, crashed, stderrText);
    };
    callbacks.onStartFailed = [run](int errorCode) { run->handleStartFailed(errorCode); };

    // Prefer the script's virtual environment; system Python is often externally managed.
    const std::filesystem::path venvPython = m_impl->scriptPath.parent_path() / "venv" / "bin" / "python3";
    const std::string pythonExec = std::filesystem::exists(venvPython) ? venvPython.string() : "python3";

    m_impl->runner->start(pythonExec,
                          {m_impl->scriptPath.string(), referenceAudioPath, multitrackAudioPath, lyricsPath.string()},
                          std::move(callbacks));
}

} // namespace HarmonySync::Core
