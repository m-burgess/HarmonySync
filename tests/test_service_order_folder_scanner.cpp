#include "ServiceOrderFolderScanner.hpp"
#include <iostream>
#include <filesystem>
#include <fstream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;

void testServiceOrderFolderScanner() {
    std::cout << "[TEST] Running testServiceOrderFolderScanner..." << std::endl;

    std::filesystem::path tempDir = std::filesystem::temp_directory_path() / "test_service_order_dir";
    std::filesystem::remove_all(tempDir);
    std::filesystem::create_directories(tempDir);

    // Create 2 subfolders: 01_Opener_Song (Song with stem) and 02_Welcome_Slides (Media only)
    std::filesystem::path songFolder = tempDir / "01_Opener_Song";
    std::filesystem::path mediaFolder = tempDir / "02_Welcome_Slides";
    std::filesystem::create_directories(songFolder);
    std::filesystem::create_directories(mediaFolder);

    // Create dummy audio file in song folder
    {
        std::ofstream audioFile(songFolder / "vocal.wav");
        audioFile << "RIFF_DUMMY_AUDIO";
    }

    // Create dummy image in media folder
    {
        std::ofstream imgFile(mediaFolder / "slide1.jpg");
        imgFile << "JPEG_DUMMY_IMAGE";
    }

    ServiceOrderFolderScanner scanner;
    ServiceOrder order = scanner.scanServiceOrderDirectory(tempDir);

    assert(order.songs().size() == 2);

    const auto& item1 = order.songs()[0];
    assert(item1.title() == "01_Opener_Song");
    assert(item1.hasSongMap() == true);
    assert(item1.stems().size() == 1);

    const auto& item2 = order.songs()[1];
    assert(item2.title() == "02_Welcome_Slides");
    assert(item2.hasSongMap() == false);
    assert(item2.stems().empty());

    // Clean up
    std::filesystem::remove_all(tempDir);

    std::cout << "[PASS] testServiceOrderFolderScanner passed." << std::endl;
}

int main() {
    try {
        testServiceOrderFolderScanner();
        std::cout << "\nALL SPRINT 21 SERVICE ORDER FOLDER SCANNER UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Service Order Folder Scanner unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
