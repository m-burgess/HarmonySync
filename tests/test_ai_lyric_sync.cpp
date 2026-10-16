#include "AILyricSyncService.hpp"
#include "fake_process_runner.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"
#include <iostream>
#include <string>
#include <vector>

using namespace HarmonySync::Core;

namespace {

struct Outcome {
    int successCalls{0};
    int errorCalls{0};
    std::vector<TimedLyricLine> lines;
    std::string error;
    std::vector<std::string> progress;
};

struct Harness {
    TempDir dir;
    std::shared_ptr<FakeProcessRunner> runner = std::make_shared<FakeProcessRunner>();
    std::filesystem::path script = dir.path() / "scripts" / "ai_lyric_sync.py";
    std::filesystem::path workDir = dir.path() / "work";
    AILyricSyncService service;
    Outcome outcome;

    Harness()
        : service(runner, script, workDir) {
        writeFile(script, "# stub\n");
    }

    void generate(const std::string& lyrics = "Line 1\nLine 2\n") {
        service.generateTimestamps(
            "ref.wav", "multi.wav", lyrics,
            [this](std::vector<TimedLyricLine> lines) {
                ++outcome.successCalls;
                outcome.lines = std::move(lines);
            },
            [this](std::string error) {
                ++outcome.errorCalls;
                outcome.error = std::move(error);
            },
            [this](std::string progress) { outcome.progress.push_back(std::move(progress)); });
    }
};

bool contains(const std::string& text, const std::string& part) {
    return text.find(part) != std::string::npos;
}

void testDefaultConstruction() {
    std::cout << "[TEST] Running testDefaultConstruction..." << std::endl;
    // Builds the QProcess runner and searches for the script; nothing is launched.
    AILyricSyncService service;
    std::cout << "[PASS] testDefaultConstruction passed." << std::endl;
}

void testMissingScript() {
    std::cout << "[TEST] Running testMissingScript..." << std::endl;
    Harness h;
    std::filesystem::remove(h.script);
    h.generate();
    HS_CHECK(h.outcome.errorCalls == 1);
    HS_CHECK(contains(h.outcome.error, "script not found"));
    HS_CHECK(contains(h.outcome.error, h.script.string()));
    HS_CHECK(h.runner->startCalls == 0);

    // Callers may omit every callback.
    h.service.generateTimestamps("ref.wav", "multi.wav", "x", nullptr, nullptr);
    std::cout << "[PASS] testMissingScript passed." << std::endl;
}

void testUnwritableWorkDir() {
    std::cout << "[TEST] Running testUnwritableWorkDir..." << std::endl;
    TempDir dir;
    auto runner = std::make_shared<FakeProcessRunner>();
    const auto script = dir.path() / "ai_lyric_sync.py";
    writeFile(script, "# stub\n");
    writeFile(dir.path() / "blocker", "a file where a directory is needed");

    AILyricSyncService service(runner, script, dir.path() / "blocker" / "work");
    std::string error;
    service.generateTimestamps("ref.wav", "multi.wav", "x", nullptr, [&](std::string e) { error = std::move(e); });
    HS_CHECK(error == "Failed to write temp lyrics file.");
    HS_CHECK(runner->startCalls == 0);

    service.generateTimestamps("ref.wav", "multi.wav", "x", nullptr, nullptr);
    std::cout << "[PASS] testUnwritableWorkDir passed." << std::endl;
}

void testLaunchArguments() {
    std::cout << "[TEST] Running testLaunchArguments..." << std::endl;
    Harness h;
    h.generate("Amazing grace\n");

    HS_CHECK(h.runner->startCalls == 1);
    HS_CHECK(h.runner->program == "python3");
    HS_CHECK(h.runner->arguments.size() == 4);
    HS_CHECK(h.runner->arguments[0] == h.script.string());
    HS_CHECK(h.runner->arguments[1] == "ref.wav");
    HS_CHECK(h.runner->arguments[2] == "multi.wav");
    HS_CHECK(h.runner->arguments[3] == (h.workDir / "temp_lyrics.txt").string());
    HS_CHECK(readFile(h.workDir / "temp_lyrics.txt") == "Amazing grace\n");
    std::cout << "[PASS] testLaunchArguments passed." << std::endl;
}

void testPrefersVenvPython() {
    std::cout << "[TEST] Running testPrefersVenvPython..." << std::endl;
    Harness h;
    const auto venvPython = h.script.parent_path() / "venv" / "bin" / "python3";
    writeFile(venvPython, "");
    h.generate();
    HS_CHECK(h.runner->program == venvPython.string());
    std::cout << "[PASS] testPrefersVenvPython passed." << std::endl;
}

void testSuccessfulRun() {
    std::cout << "[TEST] Running testSuccessfulRun..." << std::endl;
    Harness h;
    h.generate();

    // Chunk boundaries fall mid-line; progress lines are consumed, everything else is the result.
    h.runner->emitStdout("{\"progress\": \"Load");
    h.runner->emitStdout("ing model\"}\n[{\"time\": 0.0, \"text\": \"Line 1\"},\n");
    h.runner->emitStdout("{\"time\": 2.5, \"text\": \"Line 2\"}, {\"time\": 4.0}]");
    HS_CHECK(h.outcome.progress.size() == 1);
    HS_CHECK(h.outcome.progress[0] == "Loading model");
    HS_CHECK(h.outcome.successCalls == 0);

    h.runner->finish(0);
    HS_CHECK(h.outcome.errorCalls == 0);
    HS_CHECK(h.outcome.successCalls == 1);
    HS_CHECK(h.outcome.lines.size() == 2);
    HS_CHECK(h.outcome.lines[0].text == "Line 1");
    HS_CHECK(h.outcome.lines[0].timestampSeconds == 0.0);
    HS_CHECK(h.outcome.lines[1].text == "Line 2");
    HS_CHECK(h.outcome.lines[1].timestampSeconds == 2.5);
    std::cout << "[PASS] testSuccessfulRun passed." << std::endl;
}

void testSuccessWithoutCallbacks() {
    std::cout << "[TEST] Running testSuccessWithoutCallbacks..." << std::endl;
    Harness h;
    h.service.generateTimestamps("ref.wav", "multi.wav", "x", nullptr, nullptr);
    h.runner->emitStdout("{\"progress\": \"ignored\"}\n");
    h.runner->emitStdout("[]");
    h.runner->finish(0);
    std::cout << "[PASS] testSuccessWithoutCallbacks passed." << std::endl;
}

void testScriptFailure() {
    std::cout << "[TEST] Running testScriptFailure..." << std::endl;
    Harness h;
    h.generate();
    h.runner->finish(1, false, "  ModuleNotFoundError: whisper \n");
    HS_CHECK(h.outcome.errorCalls == 1);
    HS_CHECK(h.outcome.error == "Python script failed with exit code: 1. Error: ModuleNotFoundError: whisper");
    HS_CHECK(h.outcome.successCalls == 0);

    Harness silent;
    silent.generate();
    silent.runner->finish(2, false, " \n");
    HS_CHECK(silent.outcome.error == "Python script failed with exit code: 2");

    Harness crashed;
    crashed.generate();
    crashed.runner->finish(0, true);
    HS_CHECK(contains(crashed.outcome.error, "failed with exit code: 0"));

    Harness quiet;
    quiet.service.generateTimestamps("ref.wav", "multi.wav", "x", nullptr, nullptr);
    quiet.runner->finish(1);
    std::cout << "[PASS] testScriptFailure passed." << std::endl;
}

void testInvalidOutput() {
    std::cout << "[TEST] Running testInvalidOutput..." << std::endl;
    Harness notJson;
    notJson.generate();
    notJson.runner->emitStdout("hello world\n");
    notJson.runner->finish(0);
    HS_CHECK(notJson.outcome.error == "Python script returned invalid JSON format.");

    Harness notArray;
    notArray.generate();
    notArray.runner->emitStdout("{\"time\": 1.0}");
    notArray.runner->finish(0);
    HS_CHECK(notArray.outcome.error == "Python script returned invalid JSON format.");

    Harness quiet;
    quiet.service.generateTimestamps("ref.wav", "multi.wav", "x", nullptr, nullptr);
    quiet.runner->finish(0);
    std::cout << "[PASS] testInvalidOutput passed." << std::endl;
}

void testStartFailure() {
    std::cout << "[TEST] Running testStartFailure..." << std::endl;
    Harness h;
    h.generate();
    h.runner->failToStart(0);
    HS_CHECK(h.outcome.error == "Failed to start Python script. Error code: 0");

    Harness quiet;
    quiet.service.generateTimestamps("ref.wav", "multi.wav", "x", nullptr, nullptr);
    quiet.runner->failToStart(1);
    std::cout << "[PASS] testStartFailure passed." << std::endl;
}

} // namespace

int main() {
    testDefaultConstruction();
    testMissingScript();
    testUnwritableWorkDir();
    testLaunchArguments();
    testPrefersVenvPython();
    testSuccessfulRun();
    testSuccessWithoutCallbacks();
    testScriptFailure();
    testInvalidOutput();
    testStartFailure();
    std::cout << "\nALL AI LYRIC SYNC UNIT TESTS PASSED" << std::endl;
    return EXIT_SUCCESS;
}
