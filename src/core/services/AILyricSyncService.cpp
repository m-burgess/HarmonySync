#include "AILyricSyncService.hpp"
#include <iostream>
#include <filesystem>
#include <fstream>
#include <sstream>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QProcess>
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>
#include <QTimer>
#endif

namespace HarmonySync::Core {

struct AILyricSyncService::Impl {
    std::string scriptPath;
    Impl() {
        // Find the script relative to the source directory or current path
        std::filesystem::path currentPath = std::filesystem::current_path();
        std::filesystem::path script = currentPath / "scripts" / "ai_lyric_sync.py";
        if (!std::filesystem::exists(script)) {
            // Try going up one directory (if running from build)
            script = currentPath.parent_path() / "scripts" / "ai_lyric_sync.py";
        }
        scriptPath = script.string();
    }
};

AILyricSyncService::AILyricSyncService()
    : m_impl(std::make_unique<Impl>())
{}

AILyricSyncService::~AILyricSyncService() = default;

void AILyricSyncService::generateTimestamps(
    const std::string& referenceAudioPath,
    const std::string& multitrackAudioPath,
    const std::string& rawLyrics,
    std::function<void(std::vector<TimedLyricLine>)> onSuccess,
    std::function<void(std::string)> onError)
{
    if (!std::filesystem::exists(m_impl->scriptPath)) {
        if (onError) onError("AI Lyric Sync script not found at: " + m_impl->scriptPath);
        return;
    }

#ifdef HARMONYSYNC_QT_AVAILABLE
    // Save rawLyrics to a temp file
    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "harmonysync_ai";
    std::filesystem::create_directories(tempDir);
    std::filesystem::path lyricsPath = tempDir / "temp_lyrics.txt";
    
    std::ofstream out(lyricsPath);
    if (out.is_open()) {
        out << rawLyrics;
        out.close();
    } else {
        if (onError) onError("Failed to write temp lyrics file.");
        return;
    }

    QProcess* process = new QProcess();
    
    QObject::connect(process, &QProcess::finished, [process, onSuccess, onError](int exitCode, QProcess::ExitStatus exitStatus) {
        if (exitStatus == QProcess::CrashExit || exitCode != 0) {
            if (onError) onError("Python script failed with exit code: " + std::to_string(exitCode));
        } else {
            QByteArray output = process->readAllStandardOutput();
            QJsonDocument doc = QJsonDocument::fromJson(output);
            if (doc.isArray()) {
                QJsonArray arr = doc.array();
                std::vector<TimedLyricLine> lines;
                for (int i = 0; i < arr.size(); ++i) {
                    QJsonObject obj = arr[i].toObject();
                    if (obj.contains("time") && obj.contains("text")) {
                        lines.push_back({
                            obj["time"].toDouble(),
                            obj["text"].toString().toStdString()
                        });
                    }
                }
                if (onSuccess) onSuccess(lines);
            } else {
                if (onError) onError("Python script returned invalid JSON format.");
            }
        }
        process->deleteLater();
    });

    QObject::connect(process, &QProcess::errorOccurred, [process, onError](QProcess::ProcessError error) {
        if (onError) onError("Failed to start Python script. Error code: " + std::to_string(error));
        process->deleteLater();
    });

    // Try to find a virtual environment python first to avoid externally-managed-environment errors on modern Linux
    std::filesystem::path scriptDir = std::filesystem::path(m_impl->scriptPath).parent_path();
    std::filesystem::path venvPython = scriptDir / "venv" / "bin" / "python3";
    QString pythonExec = "python3";
    if (std::filesystem::exists(venvPython)) {
        pythonExec = QString::fromStdString(venvPython.string());
    }

    process->start(pythonExec, QStringList() << QString::fromStdString(m_impl->scriptPath) 
                                            << QString::fromStdString(referenceAudioPath) 
                                            << QString::fromStdString(multitrackAudioPath)
                                            << QString::fromStdString(lyricsPath.string()));
#else
    // Mock implementation for non-Qt environments (tests)
    std::vector<TimedLyricLine> lines;
    std::istringstream iss(rawLyrics);
    std::string line;
    double currentTime = 0.0;
    while (std::getline(iss, line)) {
        if (!line.empty()) {
            lines.push_back({currentTime, line});
            currentTime += 2.5; // Dummy 2.5s per line
        }
    }
    if (onSuccess) onSuccess(lines);
#endif
}

} // namespace HarmonySync::Core
