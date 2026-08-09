#include "CloudNetworkService.hpp"
#include "OnlineLyricsFetcher.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testCloudNetworkService() {
    std::cout << "[TEST] Running testCloudNetworkService..." << std::endl;
    CloudNetworkService netSvc;

    HttpResponse failResp = netSvc.getSync("");
    assert(failResp.statusCode == 400);
    assert(!failResp.success);

    HttpResponse okResp = netSvc.getSync("https://api.genius.com/test");
    assert(okResp.statusCode == 200);
    assert(okResp.success == true);
    assert(!okResp.body.empty());

    std::cout << "[PASS] testCloudNetworkService passed." << std::endl;
}

void testOnlineLyricsFetcherLrcParsing() {
    std::cout << "[TEST] Running testOnlineLyricsFetcherLrcParsing..." << std::endl;
    OnlineLyricsFetcher fetcher;

    std::string lrcSample = R"(
[00:12.50]Amazing grace how sweet the sound
[01:05.20]That saved a wretch like me
)";

    auto lines = fetcher.parseLrcContent(lrcSample);
    assert(lines.size() == 2);
    assert(lines[0].timestampSeconds == 12.50);
    assert(lines[0].text == "Amazing grace how sweet the sound");
    assert(lines[1].timestampSeconds == 65.20);

    std::cout << "[PASS] testOnlineLyricsFetcherLrcParsing passed." << std::endl;
}

int main() {
    try {
        testCloudNetworkService();
        testOnlineLyricsFetcherLrcParsing();
        std::cout << "\nALL NETWORK SERVICES UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in network services unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
