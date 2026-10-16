#include "FFmpegTransposer.hpp"
#include "fake_command_runner.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"
#include <chrono>
#include <condition_variable>
#include <cstdlib>
#include <filesystem>
#include <functional>
#include <iostream>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <utility>
#include <vector>

using namespace HarmonySync::Core;
using namespace HarmonySync::Media;
namespace fs = std::filesystem;

namespace {

// Runs the transposer's background task on the calling thread.
void inlineLauncher(std::function<void()> task) {
    task();
}

MediaStem stem(const std::string& name, const fs::path& file) {
    return MediaStem(name, name, file.string());
}

// Song folder with Keys, Bass and Drums stems and a Click track.
struct Song {
    TempDir dir;
    std::vector<MediaStem> stems;

    Song() {
        for (const char* name : {"Keys", "Bass", "Drums", "Click"}) {
            const fs::path file = dir.path() / (std::string(name) + ".wav");
            writeFile(file, "original");
            stems.push_back(stem(name, file));
        }
    }

    [[nodiscard]] fs::path cacheDir(const std::string& folderName) const { return dir.path() / folderName; }
};

} // namespace

void testNoTransposeReturnsTheStemsWithoutRunningAnything() {
    std::cout << "[TEST] Running testNoTransposeReturnsTheStemsWithoutRunningAnything..." << std::endl;
    const Song song;
    auto runner = std::make_shared<FakeCommandRunner>();
    int launches = 0;
    FFmpegTransposer transposer(runner, [&launches](std::function<void()> task) {
        ++launches;
        task();
    });

    HS_CHECK(transposer.isCached(song.stems, song.dir.path(), 0));
    HS_CHECK(transposer.getCachedStems(song.stems, song.dir.path(), 0).size() == song.stems.size());

    std::vector<MediaStem> result;
    transposer.transposeStemsAsync(song.stems, song.dir.path(), 0,
                                   [&result](std::vector<MediaStem> stems) { result = std::move(stems); });
    HS_CHECK(result.size() == song.stems.size());
    HS_CHECK(result[0].filePath() == song.stems[0].filePath());
    HS_CHECK(launches == 0);
    HS_CHECK(runner->commands().empty());
    transposer.transposeStemsAsync(song.stems, song.dir.path(), 0, nullptr); // no callback: nothing to call

    std::cout << "[PASS] testNoTransposeReturnsTheStemsWithoutRunningAnything passed." << std::endl;
}

void testCacheLookup() {
    std::cout << "[TEST] Running testCacheLookup..." << std::endl;
    const Song song;
    FFmpegTransposer transposer(std::make_shared<FakeCommandRunner>(), inlineLauncher);

    HS_CHECK(!transposer.isCached(song.stems, song.dir.path(), 2)); // no cache folder yet

    const fs::path cache = song.cacheDir("Transposed_+2ST");
    writeFile(cache / "Keys.wav", "keys");
    HS_CHECK(!transposer.isCached(song.stems, song.dir.path(), 2)); // Bass is missing
    writeFile(cache / "Bass.wav", "bass");
    // Drums and Click are rhythm tracks and are never transposed, so they need no cache file.
    HS_CHECK(transposer.isCached(song.stems, song.dir.path(), 2));
    HS_CHECK(!transposer.isCached(song.stems, song.dir.path(), 3)); // other offsets have their own folder
    HS_CHECK(!transposer.isCached(song.stems, song.dir.path(), -2));

    // Rhythm tracks are recognised by name, in any case.
    const std::vector<MediaStem> rhythm = {stem("GUIDE vox", "g.wav"), stem("Percussion", "p.wav"),
                                           stem("drumloop", "d.wav")};
    HS_CHECK(transposer.isCached(rhythm, song.dir.path(), 2));

    std::cout << "[PASS] testCacheLookup passed." << std::endl;
}

void testCachedStemsPointAtTheTransposedFilesAndKeepTheirMix() {
    std::cout << "[TEST] Running testCachedStemsPointAtTheTransposedFilesAndKeepTheirMix..." << std::endl;
    Song song;
    const FFmpegTransposer transposer(std::make_shared<FakeCommandRunner>(), inlineLauncher);
    const fs::path cache = song.cacheDir("Transposed_-3ST");
    writeFile(cache / "Keys.wav", "keys");
    // Bass has no transposed file yet and falls back to the original.

    song.stems[0].setVolume(0.4f);
    song.stems[0].setPan(-0.5f);
    song.stems[0].setMuted(true);
    song.stems[0].setSolo(true);
    song.stems[0].setPitchShiftSemitones(5);

    const std::vector<MediaStem> result = transposer.getCachedStems(song.stems, song.dir.path(), -3);
    HS_CHECK(result.size() == 4);
    HS_CHECK(result[0].id() == "Keys");
    HS_CHECK(result[0].filePath() == (cache / "Keys.wav").string());
    HS_CHECK(result[0].volume() == 0.4f);
    HS_CHECK(result[0].pan() == -0.5f);
    HS_CHECK(result[0].isMuted());
    HS_CHECK(result[0].isSolo());
    HS_CHECK(result[0].pitchShiftSemitones() == 5);
    HS_CHECK(result[1].filePath() == song.stems[1].filePath()); // Bass: not transposed yet
    HS_CHECK(result[2].filePath() == song.stems[2].filePath()); // Drums: rhythm, never transposed

    std::cout << "[PASS] testCachedStemsPointAtTheTransposedFilesAndKeepTheirMix passed." << std::endl;
}

void testTransposeRunsFfmpegForPitchedStemsOnly() {
    std::cout << "[TEST] Running testTransposeRunsFfmpegForPitchedStemsOnly..." << std::endl;
    const Song song;
    auto runner = std::make_shared<FakeCommandRunner>();
    FFmpegTransposer transposer(runner, inlineLauncher);

    std::vector<MediaStem> result;
    int callbacks = 0;
    transposer.transposeStemsAsync(song.stems, song.dir.path(), 2, [&](std::vector<MediaStem> stems) {
        result = std::move(stems);
        ++callbacks;
    });

    HS_CHECK(callbacks == 1);
    const fs::path cache = song.cacheDir("Transposed_+2ST");
    HS_CHECK(fs::is_directory(cache));

    // One ffmpeg run per pitched stem; the drums and click are skipped. Runs are concurrent, so match by output.
    const std::vector<RecordedCommand> commands = runner->commands();
    HS_CHECK(commands.size() == 2);
    for (const std::string name : {"Keys", "Bass"}) {
        bool found = false;
        for (const RecordedCommand& command : commands) {
            if (command.arguments.back() == (cache / (name + ".wav")).string()) {
                found = true;
                const std::vector<std::string> expected = {"-y",
                                                           "-v",
                                                           "error",
                                                           "-i",
                                                           (song.dir.path() / (name + ".wav")).string(),
                                                           "-filter:a",
                                                           "rubberband=pitch=1.12246",
                                                           (cache / (name + ".wav")).string()};
                HS_CHECK(command.program == "ffmpeg");
                HS_CHECK(command.arguments == expected);
            }
        }
        HS_CHECK(found);
    }

    // The callback gets the transposed files, and a second request is served from the cache.
    HS_CHECK(result.size() == 4);
    HS_CHECK(result[0].filePath() == (cache / "Keys.wav").string());
    HS_CHECK(result[1].filePath() == (cache / "Bass.wav").string());
    HS_CHECK(result[2].filePath() == song.stems[2].filePath());
    HS_CHECK(transposer.isCached(song.stems, song.dir.path(), 2));
    transposer.transposeStemsAsync(song.stems, song.dir.path(), 2, [&](std::vector<MediaStem>) { ++callbacks; });
    HS_CHECK(callbacks == 2);
    HS_CHECK(runner->commands().size() == 2);

    // Pitch down: the scale is 2^(-3/12).
    auto downRunner = std::make_shared<FakeCommandRunner>();
    FFmpegTransposer down(downRunner, inlineLauncher);
    down.transposeStemsAsync(song.stems, song.dir.path(), -3, nullptr);
    HS_CHECK(fs::is_directory(song.cacheDir("Transposed_-3ST")));
    HS_CHECK(downRunner->commands().size() == 2);
    HS_CHECK(downRunner->commands()[0].arguments[6] == "rubberband=pitch=0.84090");

    std::cout << "[PASS] testTransposeRunsFfmpegForPitchedStemsOnly passed." << std::endl;
}

void testTransposeResumesAfterAnInterruptedRun() {
    std::cout << "[TEST] Running testTransposeResumesAfterAnInterruptedRun..." << std::endl;
    const Song song;
    auto runner = std::make_shared<FakeCommandRunner>();
    FFmpegTransposer transposer(runner, inlineLauncher);

    // Keys was finished by an earlier run; only Bass is left to do.
    writeFile(song.cacheDir("Transposed_+1ST") / "Keys.wav", "keys");
    std::vector<MediaStem> result;
    transposer.transposeStemsAsync(song.stems, song.dir.path(), 1,
                                   [&result](std::vector<MediaStem> stems) { result = std::move(stems); });

    HS_CHECK(runner->commands().size() == 1);
    HS_CHECK(runner->commands()[0].arguments.back() == (song.cacheDir("Transposed_+1ST") / "Bass.wav").string());
    HS_CHECK(result[0].filePath() == (song.cacheDir("Transposed_+1ST") / "Keys.wav").string());
    HS_CHECK(readFile(song.cacheDir("Transposed_+1ST") / "Keys.wav") == "keys"); // not redone

    std::cout << "[PASS] testTransposeResumesAfterAnInterruptedRun passed." << std::endl;
}

void testFailedFfmpegFallsBackToTheOriginalStems() {
    std::cout << "[TEST] Running testFailedFfmpegFallsBackToTheOriginalStems..." << std::endl;
    const Song song;
    auto runner = std::make_shared<FakeCommandRunner>();
    runner->succeed = false;
    FFmpegTransposer transposer(runner, inlineLauncher);

    std::vector<MediaStem> result;
    transposer.transposeStemsAsync(song.stems, song.dir.path(), 4,
                                   [&result](std::vector<MediaStem> stems) { result = std::move(stems); });

    HS_CHECK(runner->commands().size() == 2);
    HS_CHECK(result.size() == 4);
    for (std::size_t i = 0; i < result.size(); ++i) {
        HS_CHECK(result[i].filePath() == song.stems[i].filePath()); // nothing was produced, so keep the originals
    }
    HS_CHECK(!transposer.isCached(song.stems, song.dir.path(), 4));

    std::cout << "[PASS] testFailedFfmpegFallsBackToTheOriginalStems passed." << std::endl;
}

void testFileNamesAreNeverInterpretedByAShell() {
    std::cout << "[TEST] Running testFileNamesAreNeverInterpretedByAShell..." << std::endl;
    const TempDir dir;
    const fs::path nasty = dir.path() / "my song; rm -rf $HOME `x` 'q'.wav";
    writeFile(nasty, "audio");
    auto runner = std::make_shared<FakeCommandRunner>();
    FFmpegTransposer transposer(runner, inlineLauncher);

    transposer.transposeStemsAsync({stem("Keys", nasty)}, dir.path(), 2, nullptr);

    const std::vector<RecordedCommand> commands = runner->commands();
    HS_CHECK(commands.size() == 1);
    HS_CHECK(commands[0].arguments[4] == nasty.string()); // one argument, exactly as named
    HS_CHECK(commands[0].arguments.back() == (dir.path() / "Transposed_+2ST" / nasty.filename()).string());

    std::cout << "[PASS] testFileNamesAreNeverInterpretedByAShell passed." << std::endl;
}

void testTransposeWorkDefersToTheLauncherAndSurvivesTheTransposer() {
    std::cout << "[TEST] Running testTransposeWorkDefersToTheLauncherAndSurvivesTheTransposer..." << std::endl;
    const Song song;
    auto runner = std::make_shared<FakeCommandRunner>();
    std::function<void()> deferred;
    std::vector<MediaStem> result;
    {
        FFmpegTransposer transposer(runner, [&deferred](std::function<void()> task) { deferred = std::move(task); });
        transposer.transposeStemsAsync(song.stems, song.dir.path(), 2,
                                       [&result](std::vector<MediaStem> stems) { result = std::move(stems); });
        // Nothing has run yet: the caller is not blocked on ffmpeg.
        HS_CHECK(deferred != nullptr);
        HS_CHECK(runner->commands().empty());
        HS_CHECK(result.empty());
    }
    // The transposer is gone; the queued work still owns what it needs.
    deferred();
    HS_CHECK(runner->commands().size() == 2);
    HS_CHECK(result.size() == 4);

    std::cout << "[PASS] testTransposeWorkDefersToTheLauncherAndSurvivesTheTransposer passed." << std::endl;
}

void testDefaultLauncherRunsOnAnotherThread() {
    std::cout << "[TEST] Running testDefaultLauncherRunsOnAnotherThread..." << std::endl;
    const Song song;
    auto runner = std::make_shared<FakeCommandRunner>();
    FFmpegTransposer transposer(runner);

    std::mutex mutex;
    std::condition_variable cv;
    bool done = false;
    std::thread::id workerThread;
    transposer.transposeStemsAsync(song.stems, song.dir.path(), 2, [&](std::vector<MediaStem>) {
        const std::lock_guard<std::mutex> lock(mutex);
        workerThread = std::this_thread::get_id();
        done = true;
        cv.notify_all();
    });

    std::unique_lock<std::mutex> lock(mutex);
    HS_CHECK(cv.wait_for(lock, std::chrono::seconds(5), [&done] { return done; }));
    HS_CHECK(workerThread != std::this_thread::get_id());
    HS_CHECK(runner->commands().size() == 2);

    // The production constructor needs no collaborators.
    const FFmpegTransposer production;
    HS_CHECK(production.isCached(song.stems, song.dir.path(), 0));

    std::cout << "[PASS] testDefaultLauncherRunsOnAnotherThread passed." << std::endl;
}

int main() {
    try {
        testNoTransposeReturnsTheStemsWithoutRunningAnything();
        testCacheLookup();
        testCachedStemsPointAtTheTransposedFilesAndKeepTheirMix();
        testTransposeRunsFfmpegForPitchedStemsOnly();
        testTransposeResumesAfterAnInterruptedRun();
        testFailedFfmpegFallsBackToTheOriginalStems();
        testFileNamesAreNeverInterpretedByAShell();
        testTransposeWorkDefersToTheLauncherAndSurvivesTheTransposer();
        testDefaultLauncherRunsOnAnotherThread();
        std::cout << "\nALL FFMPEG TRANSPOSER UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in ffmpeg transposer unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
