#ifndef HARMONYSYNC_PROCESS_RUNNER_HPP
#define HARMONYSYNC_PROCESS_RUNNER_HPP

#include <functional>
#include <memory>
#include <string>
#include <vector>

namespace HarmonySync::Core {

struct ProcessCallbacks {
    // Raw stdout chunks; chunk boundaries are arbitrary.
    std::function<void(const std::string& chunk)> onStdout;
    std::function<void(int exitCode, bool crashed, const std::string& stderrText)> onFinished;
    std::function<void(int errorCode)> onStartFailed;
};

/**
 * @brief Launches an external program asynchronously and reports its output through callbacks.
 */
class IProcessRunner {
public:
    IProcessRunner() = default;
    IProcessRunner(const IProcessRunner&) = delete;
    IProcessRunner& operator=(const IProcessRunner&) = delete;
    virtual ~IProcessRunner() = default;

    virtual void start(const std::string& program, const std::vector<std::string>& arguments,
                       ProcessCallbacks callbacks) = 0;
};

// Production runner backed by QProcess (see QtProcessRunner.cpp).
std::unique_ptr<IProcessRunner> createQtProcessRunner();

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_PROCESS_RUNNER_HPP
