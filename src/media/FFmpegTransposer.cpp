#include "FFmpegTransposer.hpp"
#include <algorithm>
#include <cctype>
#include <cmath>
#include <future>
#include <iomanip>
#include <sstream>
#include <thread>
#include <utility>

namespace HarmonySync::Media {

namespace {

bool isRhythmTrack(const std::string& name) {
    std::string lowerName = name;
    std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return lowerName.find("click") != std::string::npos || lowerName.find("guide") != std::string::npos ||
           lowerName.find("drum") != std::string::npos || lowerName.find("perc") != std::string::npos;
}

std::filesystem::path cacheDirectory(const std::filesystem::path& rootFolder, int semitones) {
    const std::string sign = semitones >= 0 ? "+" : "";
    return rootFolder / ("Transposed_" + sign + std::to_string(semitones) + "ST");
}

std::string formatPitchScale(int semitones) {
    const double scale = std::pow(2.0, static_cast<double>(semitones) / 12.0);
    std::stringstream ss;
    ss << std::fixed << std::setprecision(5) << scale;
    return ss.str();
}

std::vector<Core::MediaStem> cachedStemsFor(const std::vector<Core::MediaStem>& stems,
                                            const std::filesystem::path& songRootFolder, int semitones) {
    if (semitones == 0) {
        return stems;
    }

    const std::filesystem::path cacheDir = cacheDirectory(songRootFolder, semitones);
    std::vector<Core::MediaStem> transposedStems;
    transposedStems.reserve(stems.size());

    for (const auto& stem : stems) {
        if (!isRhythmTrack(stem.name())) {
            const std::filesystem::path newFile = cacheDir / std::filesystem::path(stem.filePath()).filename();
            if (std::filesystem::exists(newFile)) {
                Core::MediaStem newStem(stem.id(), stem.name(), newFile.string());
                newStem.setVolume(stem.volume());
                newStem.setPan(stem.pan());
                newStem.setMuted(stem.isMuted());
                newStem.setSolo(stem.isSolo());
                newStem.setPitchShiftSemitones(stem.pitchShiftSemitones());
                transposedStems.push_back(std::move(newStem));
                continue;
            }
        }
        transposedStems.push_back(stem);
    }

    return transposedStems;
}

void detachedLauncher(std::function<void()> task) {
    std::thread(std::move(task)).detach();
}

} // namespace

struct FFmpegTransposer::Impl {
    std::shared_ptr<ICommandRunner> runner;
    TaskLauncher launcher;
};

FFmpegTransposer::FFmpegTransposer()
    : FFmpegTransposer(createQtCommandRunner()) {}

FFmpegTransposer::FFmpegTransposer(std::shared_ptr<ICommandRunner> runner, TaskLauncher launcher)
    : m_impl(std::make_unique<Impl>(
          Impl{std::move(runner), launcher ? std::move(launcher) : TaskLauncher(detachedLauncher)})) {}

FFmpegTransposer::~FFmpegTransposer() = default;

bool FFmpegTransposer::isCached(const std::vector<Core::MediaStem>& stems, const std::filesystem::path& songRootFolder,
                                int semitones) const {
    if (semitones == 0) {
        return true;
    }

    const std::filesystem::path cacheDir = cacheDirectory(songRootFolder, semitones);
    if (!std::filesystem::exists(cacheDir)) {
        return false;
    }

    for (const auto& stem : stems) {
        if (isRhythmTrack(stem.name())) {
            continue;
        }
        const std::filesystem::path expectedFile = cacheDir / std::filesystem::path(stem.filePath()).filename();
        if (!std::filesystem::exists(expectedFile)) {
            return false;
        }
    }
    return true;
}

std::vector<Core::MediaStem> FFmpegTransposer::getCachedStems(const std::vector<Core::MediaStem>& stems,
                                                              const std::filesystem::path& songRootFolder,
                                                              int semitones) const {
    return cachedStemsFor(stems, songRootFolder, semitones);
}

void FFmpegTransposer::transposeStemsAsync(const std::vector<Core::MediaStem>& stems,
                                           const std::filesystem::path& songRootFolder, int semitones,
                                           std::function<void(std::vector<Core::MediaStem>)> callback) {
    if (semitones == 0 || isCached(stems, songRootFolder, semitones)) {
        if (callback) {
            callback(cachedStemsFor(stems, songRootFolder, semitones));
        }
        return;
    }

    const std::filesystem::path cacheDir = cacheDirectory(songRootFolder, semitones);
    const std::string pitchScale = formatPitchScale(semitones);

    // The task owns copies of everything it uses, so it stays valid if the transposer is destroyed first.
    m_impl->launcher([runner = m_impl->runner, stems, cacheDir, pitchScale, semitones, songRootFolder,
                      callback = std::move(callback)]() {
        if (!std::filesystem::exists(cacheDir)) {
            std::filesystem::create_directories(cacheDir);
        }

        std::vector<std::future<bool>> tasks;

        for (const auto& stem : stems) {
            if (isRhythmTrack(stem.name())) {
                continue;
            }

            const std::filesystem::path inputPath = stem.filePath();
            const std::filesystem::path outputPath = cacheDir / inputPath.filename();

            // Skip if already processed in a previous interrupted run
            if (std::filesystem::exists(outputPath)) {
                continue;
            }

            tasks.push_back(std::async(std::launch::async, [runner, inputPath, outputPath, pitchScale]() {
                return runner->run("ffmpeg", {"-y", "-v", "error", "-i", inputPath.string(), "-filter:a",
                                              "rubberband=pitch=" + pitchScale, outputPath.string()});
            }));
        }

        // Wait for all ffmpeg jobs to complete
        for (auto& task : tasks) {
            task.get(); // Blocks until completion
        }

        if (callback) {
            // Once finished, fetch the new list of stems and execute callback
            callback(cachedStemsFor(stems, songRootFolder, semitones));
        }
    });
}

} // namespace HarmonySync::Media
