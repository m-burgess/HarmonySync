#include "CrashReporterService.hpp"
#include <mutex>
#include <utility>

namespace HarmonySync::Core {

struct CrashReporterService::Impl {
    std::string dumpDir{"/tmp/harmonysync_dumps"};
    std::vector<std::string> logs;
    mutable std::mutex mutex;

    explicit Impl(std::string dir)
        : dumpDir(std::move(dir))
    {}
};

CrashReporterService::CrashReporterService()
    : m_impl(std::make_unique<Impl>("/tmp/harmonysync_dumps"))
{}

CrashReporterService::CrashReporterService(const std::string& dumpDirectory)
    : m_impl(std::make_unique<Impl>(dumpDirectory))
{}

CrashReporterService::~CrashReporterService() = default;

CrashReporterService::CrashReporterService(CrashReporterService&&) noexcept = default;
CrashReporterService& CrashReporterService::operator=(CrashReporterService&&) noexcept = default;

void CrashReporterService::recordBreadcrumb(const std::string& category, const std::string& message) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->logs.push_back("[" + category + "] " + message);
}

std::vector<std::string> CrashReporterService::breadcrumbs() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->logs;
}

bool CrashReporterService::generateDump(const std::string& reason) {
    recordBreadcrumb("CRASH", reason);
    return true;
}

std::string CrashReporterService::dumpDirectory() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->dumpDir;
}

} // namespace HarmonySync::Core
