#include "LocalizationService.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testLocalizationService() {
    std::cout << "[TEST] Running testLocalizationService..." << std::endl;

    LocalizationService service("en");
    assert(service.currentLanguage() == "en");
    assert(service.translate("NAV_MIXER") == "Stem Mixer");

    bool swEs = service.setLanguage("es");
    assert(swEs == true);
    assert(service.currentLanguage() == "es");
    assert(service.translate("NAV_MIXER") == "Mezclador de Pistas");

    bool swFr = service.setLanguage("fr");
    assert(swFr == true);
    assert(service.currentLanguage() == "fr");
    assert(service.translate("NAV_MIXER") == "Mélangeur de Pistes");

    // Test unknown language fallback
    assert(service.setLanguage("de") == false);

    std::cout << "[PASS] testLocalizationService passed." << std::endl;
}

int main() {
    try {
        testLocalizationService();
        std::cout << "\nALL SPRINT 17 LOCALIZATION UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Localization unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
