#include "AutoUpdateService.hpp"
#include "CloudNetworkService.hpp"
#include "CloudSyncEngine.hpp"
#include "CrashReporterService.hpp"
#include "OnlineLyricsFetcher.hpp"
#include "test_check.hpp"
#include <iostream>
#include <string>
#include <utility>
#include <vector>

using namespace HarmonySync::Core;

namespace {

class FakeHttpClient : public IHttpClient {
public:
    HttpResponse response;
    std::vector<std::string> requestedUrls;

    HttpResponse get(const std::string& url) override {
        requestedUrls.push_back(url);
        return response;
    }
};

void testCloudNetworkServiceOffline() {
    std::cout << "[TEST] Running testCloudNetworkServiceOffline..." << std::endl;
    CloudNetworkService netSvc;

    const HttpResponse failResp = netSvc.getSync("");
    HS_CHECK(failResp.statusCode == 400);
    HS_CHECK(!failResp.success);
    HS_CHECK(failResp.errorMessage == "Empty URL provided");

    const HttpResponse okResp = netSvc.getSync("https://api.genius.com/test");
    HS_CHECK(okResp.statusCode == 200);
    HS_CHECK(okResp.success);
    HS_CHECK(!okResp.body.empty());
    std::cout << "[PASS] testCloudNetworkServiceOffline passed." << std::endl;
}

void testCloudNetworkServiceDelegates() {
    std::cout << "[TEST] Running testCloudNetworkServiceDelegates..." << std::endl;
    auto http = std::make_shared<FakeHttpClient>();
    http->response.statusCode = 503;
    http->response.errorMessage = "unavailable";
    CloudNetworkService netSvc(http);

    const HttpResponse resp = netSvc.getSync("https://example.test/a");
    HS_CHECK(resp.statusCode == 503);
    HS_CHECK(!resp.success);
    HS_CHECK(http->requestedUrls.size() == 1);
    HS_CHECK(http->requestedUrls[0] == "https://example.test/a");

    // Empty URLs are rejected before reaching the transport.
    HS_CHECK(netSvc.getSync("").statusCode == 400);
    HS_CHECK(http->requestedUrls.size() == 1);

    int status = 0;
    netSvc.getAsync("https://example.test/b", [&](const HttpResponse& r) { status = r.statusCode; });
    HS_CHECK(status == 503);
    netSvc.getAsync("https://example.test/c", nullptr);
    HS_CHECK(http->requestedUrls.size() == 3);

    CloudNetworkService moved(std::move(netSvc));
    HS_CHECK(moved.getSync("https://example.test/d").statusCode == 503);
    CloudNetworkService assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.getSync("https://example.test/e").statusCode == 503);
    std::cout << "[PASS] testCloudNetworkServiceDelegates passed." << std::endl;
}

void testLrcParsing() {
    std::cout << "[TEST] Running testLrcParsing..." << std::endl;
    OnlineLyricsFetcher fetcher;

    const std::string lrcSample = R"(
[ti:Amazing Grace]
[00:12.50]Amazing grace how sweet the sound
not a lyric line
[01:05.20]That saved a wretch like me
[00:00.00]
)";

    const auto lines = fetcher.parseLrcContent(lrcSample);
    HS_CHECK(lines.size() == 3);
    HS_CHECK(lines[0].timestampSeconds == 12.50);
    HS_CHECK(lines[0].text == "Amazing grace how sweet the sound");
    HS_CHECK(lines[1].timestampSeconds == 65.20);
    HS_CHECK(lines[1].text == "That saved a wretch like me");
    HS_CHECK(lines[2].timestampSeconds == 0.0);
    HS_CHECK(lines[2].text.empty());

    HS_CHECK(fetcher.parseLrcContent("").empty());
    std::cout << "[PASS] testLrcParsing passed." << std::endl;
}

void testFetchLyrics() {
    std::cout << "[TEST] Running testFetchLyrics..." << std::endl;
    auto http = std::make_shared<FakeHttpClient>();
    http->response.success = true;
    http->response.statusCode = 200;
    http->response.body = "lyrics body";
    OnlineLyricsFetcher fetcher(std::make_shared<CloudNetworkService>(http));

    HS_CHECK(fetcher.fetchLyrics("Amazing Grace", "John Newton") == "lyrics body");
    HS_CHECK(http->requestedUrls.size() == 1);
    HS_CHECK(http->requestedUrls[0] == "https://api.genius.com/search?q=Amazing Grace John Newton");

    http->response.success = false;
    HS_CHECK(fetcher.fetchLyrics("Amazing Grace", "John Newton").empty());

    // The default network service falls back to the offline response.
    OnlineLyricsFetcher offline;
    HS_CHECK(!offline.fetchLyrics("Any", "One").empty());
    std::cout << "[PASS] testFetchLyrics passed." << std::endl;
}

void testCloudSyncEngine() {
    std::cout << "[TEST] Running testCloudSyncEngine..." << std::endl;
    CloudSyncEngine defaults;
    HS_CHECK(defaults.endpointUrl() == "https://api.harmonysync.org/v2/sync");
    HS_CHECK(defaults.syncState() == SyncState::Idle);
    HS_CHECK(defaults.isAutoSyncEnabled());

    CloudSyncEngine engine("https://example.test/sync");
    HS_CHECK(engine.endpointUrl() == "https://example.test/sync");

    engine.setAutoSyncEnabled(false);
    HS_CHECK(!engine.isAutoSyncEnabled());
    engine.setAutoSyncEnabled(true);
    HS_CHECK(engine.isAutoSyncEnabled());

    const ServiceOrder order;
    HS_CHECK(engine.syncServiceOrder(order));
    HS_CHECK(engine.syncState() == SyncState::InSync);

    CloudSyncEngine moved(std::move(engine));
    HS_CHECK(moved.endpointUrl() == "https://example.test/sync");
    CloudSyncEngine assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.endpointUrl() == "https://example.test/sync");
    HS_CHECK(assigned.syncState() == SyncState::InSync);
    std::cout << "[PASS] testCloudSyncEngine passed." << std::endl;
}

void testAutoUpdateService() {
    std::cout << "[TEST] Running testAutoUpdateService..." << std::endl;
    AutoUpdateService defaults;
    HS_CHECK(defaults.updateChannel() == "stable");
    HS_CHECK(!defaults.isUpdateAvailable());
    HS_CHECK(defaults.latestVersion() == "2.1.0");
    HS_CHECK(defaults.checkForUpdates());
    HS_CHECK(defaults.isUpdateAvailable());

    AutoUpdateService beta("beta");
    HS_CHECK(beta.updateChannel() == "beta");

    AutoUpdateService moved(std::move(beta));
    HS_CHECK(moved.updateChannel() == "beta");
    AutoUpdateService assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.updateChannel() == "beta");
    std::cout << "[PASS] testAutoUpdateService passed." << std::endl;
}

void testCrashReporterService() {
    std::cout << "[TEST] Running testCrashReporterService..." << std::endl;
    CrashReporterService defaults;
    HS_CHECK(defaults.dumpDirectory() == "/tmp/harmonysync_dumps");
    HS_CHECK(defaults.breadcrumbs().empty());

    CrashReporterService reporter("/var/tmp/dumps");
    HS_CHECK(reporter.dumpDirectory() == "/var/tmp/dumps");

    reporter.recordBreadcrumb("UI", "opened setlist");
    HS_CHECK(reporter.generateDump("segfault"));
    const std::vector<std::string> crumbs = reporter.breadcrumbs();
    HS_CHECK(crumbs.size() == 2);
    HS_CHECK(crumbs[0] == "[UI] opened setlist");
    HS_CHECK(crumbs[1] == "[CRASH] segfault");

    CrashReporterService moved(std::move(reporter));
    HS_CHECK(moved.breadcrumbs().size() == 2);
    CrashReporterService assigned;
    assigned = std::move(moved);
    HS_CHECK(assigned.dumpDirectory() == "/var/tmp/dumps");
    std::cout << "[PASS] testCrashReporterService passed." << std::endl;
}

} // namespace

int main() {
    testCloudNetworkServiceOffline();
    testCloudNetworkServiceDelegates();
    testLrcParsing();
    testFetchLyrics();
    testCloudSyncEngine();
    testAutoUpdateService();
    testCrashReporterService();
    std::cout << "\nALL NETWORK SERVICES UNIT TESTS PASSED" << std::endl;
    return EXIT_SUCCESS;
}
