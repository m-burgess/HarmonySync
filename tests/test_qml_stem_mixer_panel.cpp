// #188: loading the next song through the real StemMixerPanel.qml must leave
// Song B on the active deck. The QML must not swap decks or crossfade after
// AudioMixerViewModel::loadNextSongStems (single-deck preload from #177).
#include "AudioMixerViewModel.hpp"
#include "MediaStem.hpp"

#include <QGuiApplication>
#include <QQmlComponent>
#include <QQmlContext>
#include <QQmlEngine>
#include <QElapsedTimer>
#include <QUrl>

#include <cstdlib>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>

using namespace HarmonySync::ViewModels;
using HarmonySync::Core::MediaStem;

namespace {

void check(bool ok, const std::string& what) {
    if (!ok) throw std::runtime_error(what);
}

struct Panel {
    QQmlEngine engine;
    std::unique_ptr<QObject> root;

    explicit Panel(AudioMixerViewModel& vm) {
        engine.rootContext()->setContextProperty("audioMixerViewModel", &vm);
        QQmlComponent component(&engine,
            QUrl::fromLocalFile(QStringLiteral(HS_QML_DIR "/components/StemMixerPanel.qml")));
        root.reset(component.create());
        if (!root) {
            throw std::runtime_error("StemMixerPanel.qml failed to load: "
                                     + component.errorString().toStdString());
        }
    }
};

// Run the event loop long enough for any QML animation (the old 3s crossfade)
// to finish, and fail if the crossfade ever moves off 0.
void runEventsWatchingCrossfade(AudioMixerViewModel& vm, int ms, const std::string& path) {
    QElapsedTimer timer;
    timer.start();
    while (timer.elapsed() < ms) {
        QCoreApplication::processEvents(QEventLoop::AllEvents, 20);
        check(vm.crossfadePosition() == 0.0f, path + ": QML started a crossfade after loadNextSongStems");
    }
}

std::string firstStemName(AudioMixerViewModel& vm) {
    return vm.loadedStemCount() > 0 ? vm.stemName(0).toStdString() : std::string("<none>");
}

void testStoppedPathPlaysSongFromActiveDeck() {
    std::cout << "[TEST] Running testStoppedPathPlaysSongFromActiveDeck..." << std::endl;
    AudioMixerViewModel vm;
    Panel panel(vm);

    // Opening a service order: main.cpp calls loadNextSongStems for Song A while stopped.
    check(!vm.isPlaying(), "stopped: precondition");
    check(vm.loadNextSongStems({MediaStem("a1", "DrumsA", "song_a_drums.wav")}), "stopped: load failed");
    runEventsWatchingCrossfade(vm, 300, "stopped");

    check(vm.loadedStemCount() == 1, "stopped: active deck lost Song A (got " + firstStemName(vm) + ")");
    check(firstStemName(vm) == "DrumsA", "stopped: expected DrumsA, got " + firstStemName(vm));
    check(vm.isPlaying(), "stopped: Song A did not start playing");
    std::cout << "[PASS] testStoppedPathPlaysSongFromActiveDeck passed." << std::endl;
}

void testPlayingPathKeepsSongBOnActiveDeck() {
    std::cout << "[TEST] Running testPlayingPathKeepsSongBOnActiveDeck..." << std::endl;
    AudioMixerViewModel vm;
    Panel panel(vm);

    vm.loadSongStems({MediaStem("a1", "DrumsA", "song_a_drums.wav")});
    vm.play();
    check(vm.isPlaying(), "playing: precondition");

    // Advancing the setlist while Song A plays.
    check(vm.loadNextSongStems({MediaStem("b1", "DrumsB", "song_b_drums.wav")}), "playing: load failed");
    // Longer than the old 3s crossfade, so a late finalizeCrossfade would show up here.
    runEventsWatchingCrossfade(vm, 3500, "playing");

    check(vm.loadedStemCount() == 1, "playing: active deck lost Song B (got " + firstStemName(vm) + ")");
    check(firstStemName(vm) == "DrumsB", "playing: expected DrumsB, got " + firstStemName(vm));
    check(vm.isPlaying(), "playing: Song B stopped after the switch");
    std::cout << "[PASS] testPlayingPathKeepsSongBOnActiveDeck passed." << std::endl;
}

} // namespace

int main(int argc, char** argv) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    QGuiApplication app(argc, argv);
    try {
        testStoppedPathPlaysSongFromActiveDeck();
        testPlayingPathKeepsSongBOnActiveDeck();
        std::cout << "\nALL STEM MIXER PANEL QML TESTS PASSED" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "FAIL in StemMixerPanel QML tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
