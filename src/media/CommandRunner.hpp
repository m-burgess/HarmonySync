#ifndef HARMONYSYNC_COMMAND_RUNNER_HPP
#define HARMONYSYNC_COMMAND_RUNNER_HPP

#include <memory>
#include <string>
#include <vector>

namespace HarmonySync::Media {

/**
 * @brief Runs an external program to completion on the calling thread. Unlike
 * Core::IProcessRunner it blocks and needs no event loop, so worker threads can use it.
 * Implementations must be safe to call from several threads at once.
 */
class ICommandRunner {
public:
    ICommandRunner() = default;
    ICommandRunner(const ICommandRunner&) = delete;
    ICommandRunner& operator=(const ICommandRunner&) = delete;
    virtual ~ICommandRunner() = default;

    /// Returns true if the program started and exited with code 0. Arguments are not shell-parsed.
    virtual bool run(const std::string& program, const std::vector<std::string>& arguments) = 0;
};

// Production runner backed by QProcess (see QtCommandRunner.cpp).
std::unique_ptr<ICommandRunner> createQtCommandRunner();

} // namespace HarmonySync::Media

#endif // HARMONYSYNC_COMMAND_RUNNER_HPP
