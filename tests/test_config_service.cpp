#include "ConfigService.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testParseConfigJsonSingleYoutube() {
    std::cout << "[TEST] Running testParseConfigJsonSingleYoutube..." << std::endl;
    ConfigService configSvc;

    std::string json = R"({
        "youtubeLinks": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "lyricsLink": "https://genius.com/lyrics-test",
        "loopImages": true,
        "autoplayBackgroundVideo": false
    })";

    ServiceItemConfig cfg = configSvc.parseConfigJson(json);
    assert(cfg.isValid);
    assert(cfg.loopImages == true);
    assert(cfg.autoplayBackgroundVideo == false);
    assert(cfg.lyricsLink == "https://genius.com/lyrics-test");
    assert(cfg.youtubeLinks.size() == 1);
    assert(cfg.youtubeLinks[0] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    std::cout << "[PASS] testParseConfigJsonSingleYoutube passed." << std::endl;
}

void testParseConfigJsonArrayYoutube() {
    std::cout << "[TEST] Running testParseConfigJsonArrayYoutube..." << std::endl;
    ConfigService configSvc;

    std::string json = R"({
        "youtubeLinks": [
            "https://youtube.com/v1",
            "https://youtube.com/v2"
        ],
        "loopImages": false,
        "autoplayBackgroundVideo": true
    })";

    ServiceItemConfig cfg = configSvc.parseConfigJson(json);
    assert(cfg.isValid);
    assert(cfg.loopImages == false);
    assert(cfg.autoplayBackgroundVideo == true);
    assert(cfg.youtubeLinks.size() == 2);
    assert(cfg.youtubeLinks[0] == "https://youtube.com/v1");
    assert(cfg.youtubeLinks[1] == "https://youtube.com/v2");

    std::cout << "[PASS] testParseConfigJsonArrayYoutube passed." << std::endl;
}

void testTemplateGeneration() {
    std::cout << "[TEST] Running testTemplateGeneration..." << std::endl;
    ConfigService configSvc;
    std::string templateStr = configSvc.generateTemplateJson();

    assert(!templateStr.empty());
    assert(templateStr.find("youtubeLinks") != std::string::npos);
    assert(templateStr.find("lyricsLink") != std::string::npos);

    std::cout << "[PASS] testTemplateGeneration passed." << std::endl;
}

int main() {
    try {
        testParseConfigJsonSingleYoutube();
        testParseConfigJsonArrayYoutube();
        testTemplateGeneration();
        std::cout << "\nALL CONFIG SERVICE UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in config service unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
