#include "FFmpegTransposer.hpp"
#include <thread>
#include <future>
#include <cmath>
#include <algorithm>
#include <iostream>
#include <cstdlib>
#include <sstream>
#include <iomanip>

namespace HarmonySync::Media {

struct FFmpegTransposer::Impl {
    bool isRhythmTrack(const std::string& name) const {
        std::string lowerName = name;
        std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
        if (lowerName.find("click") != std::string::npos ||
            lowerName.find("guide") != std::string::npos ||
            lowerName.find("drum") != std::string::npos ||
            lowerName.find("perc") != std::string::npos) {
            return true;
        }
        return false;
    }
    
    std::filesystem::path getCacheDirectory(const std::filesystem::path& rootFolder, int semitones) const {
        std::string sign = semitones >= 0 ? "+" : "";
        std::string folderName = "Transposed_" + sign + std::to_string(semitones) + "ST";
        return rootFolder / folderName;
    }
    
    std::string formatPitchScale(int semitones) const {
        double scale = std::pow(2.0, static_cast<double>(semitones) / 12.0);
        std::stringstream ss;
        ss << std::fixed << std::setprecision(5) << scale;
        return ss.str();
    }
};

FFmpegTransposer::FFmpegTransposer()
    : m_impl(std::make_unique<Impl>())
{}

FFmpegTransposer::~FFmpegTransposer() = default;

bool FFmpegTransposer::isCached(const std::vector<Core::MediaStem>& stems, const std::filesystem::path& songRootFolder, int semitones) const {
    if (semitones == 0) return true;
    
    std::filesystem::path cacheDir = m_impl->getCacheDirectory(songRootFolder, semitones);
    if (!std::filesystem::exists(cacheDir)) {
        return false;
    }
    
    for (const auto& stem : stems) {
        if (m_impl->isRhythmTrack(stem.name())) {
            continue;
        }
        std::filesystem::path expectedFile = cacheDir / std::filesystem::path(stem.filePath()).filename();
        if (!std::filesystem::exists(expectedFile)) {
            return false;
        }
    }
    return true;
}

std::vector<Core::MediaStem> FFmpegTransposer::getCachedStems(const std::vector<Core::MediaStem>& stems, const std::filesystem::path& songRootFolder, int semitones) const {
    if (semitones == 0) return stems;
    
    std::filesystem::path cacheDir = m_impl->getCacheDirectory(songRootFolder, semitones);
    std::vector<Core::MediaStem> transposedStems;
    transposedStems.reserve(stems.size());
    
    for (const auto& stem : stems) {
        if (!m_impl->isRhythmTrack(stem.name())) {
            std::filesystem::path newFile = cacheDir / std::filesystem::path(stem.filePath()).filename();
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

void FFmpegTransposer::transposeStemsAsync(const std::vector<Core::MediaStem>& stems, 
                                           const std::filesystem::path& songRootFolder, 
                                           int semitones, 
                                           std::function<void(std::vector<Core::MediaStem>)> callback) {
    if (semitones == 0 || isCached(stems, songRootFolder, semitones)) {
        if (callback) {
            callback(getCachedStems(stems, songRootFolder, semitones));
        }
        return;
    }

    std::filesystem::path cacheDir = m_impl->getCacheDirectory(songRootFolder, semitones);
    std::string pitchScale = m_impl->formatPitchScale(semitones);
    
    // Launch detached background thread to process FFmpeg commands
    std::thread([this, stems, cacheDir, pitchScale, semitones, songRootFolder, callback]() {
        if (!std::filesystem::exists(cacheDir)) {
            std::filesystem::create_directories(cacheDir);
        }
        
        std::vector<std::future<bool>> tasks;
        
        for (const auto& stem : stems) {
            if (m_impl->isRhythmTrack(stem.name())) {
                continue;
            }
            
            std::filesystem::path inputPath = stem.filePath();
            std::filesystem::path outputPath = cacheDir / inputPath.filename();
            
            // Skip if already processed in a previous interrupted run
            if (std::filesystem::exists(outputPath)) {
                continue;
            }
            
            tasks.push_back(std::async(std::launch::async, [inputPath, outputPath, pitchScale]() {
                std::stringstream cmd;
                cmd << "ffmpeg -y -v error -i \"" << inputPath.string() << "\" "
                    << "-filter:a \"rubberband=pitch=" << pitchScale << "\" "
                    << "\"" << outputPath.string() << "\"";
                    
                int ret = std::system(cmd.str().c_str());
                return ret == 0;
            }));
        }
        
        // Wait for all ffmpeg jobs to complete
        for (auto& task : tasks) {
            task.get(); // Blocks until completion
        }
        
        if (callback) {
            // Once finished, fetch the new list of stems and execute callback
            callback(getCachedStems(stems, songRootFolder, semitones));
        }
    }).detach();
}

} // namespace HarmonySync::Media
