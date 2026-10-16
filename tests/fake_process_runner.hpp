#ifndef HARMONYSYNC_TESTS_FAKE_PROCESS_RUNNER_HPP
#define HARMONYSYNC_TESTS_FAKE_PROCESS_RUNNER_HPP

#include "ProcessRunner.hpp"
#include <string>
#include <vector>

// Records the launch and lets tests play back stdout, exit and failure events without spawning a process.
class FakeProcessRunner : public HarmonySync::Core::IProcessRunner {
public:
    int startCalls{0};
    std::string program;
    std::vector<std::string> arguments;
    HarmonySync::Core::ProcessCallbacks callbacks;

    void start(const std::string& programPath, const std::vector<std::string>& args,
               HarmonySync::Core::ProcessCallbacks processCallbacks) override {
        ++startCalls;
        program = programPath;
        arguments = args;
        callbacks = std::move(processCallbacks);
    }

    void emitStdout(const std::string& chunk) { callbacks.onStdout(chunk); }
    void finish(int exitCode, bool crashed = false, const std::string& stderrText = {}) {
        callbacks.onFinished(exitCode, crashed, stderrText);
    }
    void failToStart(int errorCode) { callbacks.onStartFailed(errorCode); }
};

#endif // HARMONYSYNC_TESTS_FAKE_PROCESS_RUNNER_HPP
