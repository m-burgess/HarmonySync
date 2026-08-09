#include "VideoBackgroundPlayer.hpp"
#include "PresentationWindowViewModel.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Media;
using namespace HarmonySync::ViewModels;

void testVideoBackgroundPlayer() {
    std::cout << "[TEST] Running testVideoBackgroundPlayer..." << std::endl;

    VideoBackgroundPlayer player;
    assert(!player.isPlaying());
    assert(player.isLooping() == true);

    bool pLoaded = player.loadPrimaryVideo("backgrounds/abstract_blue.mp4");
    assert(pLoaded == true);
    assert(player.activeVideoPath() == "backgrounds/abstract_blue.mp4");

    bool sLoaded = player.loadSecondaryVideo("backgrounds/worship_particles.mp4");
    assert(sLoaded == true);

    player.play();
    assert(player.isPlaying() == true);

    player.crossfadeToSecondary();
    assert(player.activeVideoPath() == "backgrounds/worship_particles.mp4");
    assert(player.crossfadeProgress() == 1.0f);

    player.pause();
    assert(!player.isPlaying());

    std::cout << "[PASS] testVideoBackgroundPlayer passed." << std::endl;
}

void testPresentationWindowViewModel() {
    std::cout << "[TEST] Running testPresentationWindowViewModel..." << std::endl;

    auto player = std::make_shared<VideoBackgroundPlayer>();
    PresentationWindowViewModel vm(player);

    assert(vm.isChromaKeyEnabled() == true);
    assert(vm.keyColorHexStd() == "#00FF00");

    vm.setChromaKeyEnabled(false);
    assert(!vm.isChromaKeyEnabled());

#ifdef HARMONYSYNC_QT_AVAILABLE
    vm.setKeyColorHex(QStringLiteral("#0000FF"));
#else
    vm.setKeyColorHex("#0000FF");
#endif
    assert(vm.keyColorHexStd() == "#0000FF");

#ifdef HARMONYSYNC_QT_AVAILABLE
    bool loaded = vm.loadBackgroundVideo(QStringLiteral("loops/motion_background.mp4"));
#else
    bool loaded = vm.loadBackgroundVideo("loops/motion_background.mp4");
#endif
    assert(loaded == true);
    assert(vm.activeVideoPathStd() == "loops/motion_background.mp4");

    vm.playVideo();
    assert(vm.isVideoPlaying() == true);

    vm.pauseVideo();
    assert(!vm.isVideoPlaying());

    std::cout << "[PASS] testPresentationWindowViewModel passed." << std::endl;
}

int main() {
    try {
        testVideoBackgroundPlayer();
        testPresentationWindowViewModel();
        std::cout << "\nALL SPRINT 12 VIDEO COMPOSITOR UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Video Compositor unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
