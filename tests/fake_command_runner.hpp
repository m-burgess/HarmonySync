#ifndef HARMONYSYNC_TESTS_FAKE_COMMAND_RUNNER_HPP
#define HARMONYSYNC_TESTS_FAKE_COMMAND_RUNNER_HPP

#include "CommandRunner.hpp"
#include <filesystem>
#include <fstream>
#include <mutex>
#include <string>
#include <vector>

struct RecordedCommand {
    std::string program;
    std::vector<std::string> arguments;
};

// Records every command and, like ffmpeg, writes the output file (the last argument) unless told to fail.
class FakeCommandRunner : public HarmonySync::Media::ICommandRunner {
public:
    bool succeed{true};
    bool writeOutput{true};

    bool run(const std::string& program, const std::vector<std::string>& arguments) override {
        const std::lock_guard<std::mutex> lock(m_mutex);
        m_commands.push_back({program, arguments});
        if (succeed && writeOutput && !arguments.empty()) {
            std::ofstream(std::filesystem::path(arguments.back()), std::ios::binary) << "transposed";
        }
        return succeed;
    }

    std::vector<RecordedCommand> commands() const {
        const std::lock_guard<std::mutex> lock(m_mutex);
        return m_commands;
    }

private:
    mutable std::mutex m_mutex;
    std::vector<RecordedCommand> m_commands;
};

#endif // HARMONYSYNC_TESTS_FAKE_COMMAND_RUNNER_HPP
