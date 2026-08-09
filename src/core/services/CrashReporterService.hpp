#ifndef HARMONYSYNC_CRASH_REPORTER_SERVICE_HPP
#define HARMONYSYNC_CRASH_REPORTER_SERVICE_HPP

#include <string>
#include <vector>
#include <memory>

namespace HarmonySync::Core {

/**
 * @brief Thread-safe crash reporter capturing minidumps, unhandled exceptions, and telemetry logs.
 */
class CrashReporterService {
public:
    CrashReporterService();
    explicit CrashReporterService(const std::string& dumpDirectory);
    ~CrashReporterService();

    CrashReporterService(const CrashReporterService&) = delete;
    CrashReporterService& operator=(const CrashReporterService&) = delete;
    CrashReporterService(CrashReporterService&&) noexcept;
    CrashReporterService& operator=(CrashReporterService&&) noexcept;

    void recordBreadcrumb(const std::string& category, const std::string& message);
    [[nodiscard]] std::vector<std::string> breadcrumbs() const;

    bool generateDump(const std::string& reason);
    [[nodiscard]] std::string dumpDirectory() const;

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_CRASH_REPORTER_SERVICE_HPP
