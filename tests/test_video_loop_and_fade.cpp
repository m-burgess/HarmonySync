// #244: Videos in song folders must loop smoothly; videos not in a song folder
// must play once and automatically fade out smoothly.
#include "AudioMixerViewModel.hpp"
#include "SetlistViewModel.hpp"
#include "SlideDisplayViewModel.hpp"
#include "SongSwitchCoordinator.hpp"

#include <QElapsedTimer>
#include <QGuiApplication>
#include <QMediaPlayer>
#include <QQmlComponent>
#include <QQmlContext>
#include <QQmlEngine>
#include <QQuickItem>
#include <QUrl>

#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>

using namespace HarmonySync::ViewModels;
namespace fs = std::filesystem;

namespace {

void check(bool ok, const std::string& what) {
    if (!ok) {
        throw std::runtime_error(what);
    }
}

void runEvents(int ms) {
    QElapsedTimer timer;
    timer.start();
    while (timer.elapsed() < ms) {
        QCoreApplication::processEvents(QEventLoop::AllEvents, 20);
    }
}

struct SlidePanelHarness {
    QQmlEngine engine;
    std::unique_ptr<QObject> windowStub;
    std::unique_ptr<QObject> root;

    SlidePanelHarness(SetlistViewModel& setlist,
                      AudioMixerViewModel& mixer,
                      SlideDisplayViewModel& slides) {
        engine.rootContext()->setContextProperty("setlistViewModel", &setlist);
        engine.rootContext()->setContextProperty("audioMixerViewModel", &mixer);
        engine.rootContext()->setContextProperty("slideDisplayViewModel", &slides);

        QQmlComponent winComp(&engine);
        winComp.setData("import QtQuick\nQtObject { property string activeLyricText: \"\"; property string nextLyricText: \"\" }", QUrl());
        windowStub.reset(winComp.create());
        engine.rootContext()->setContextProperty("window", windowStub.get());

        QQmlComponent component(
            &engine,
            QUrl::fromLocalFile(QStringLiteral(HS_QML_DIR "/components/SlideDisplayPanel.qml")));
        root.reset(component.create());
        if (!root) {
            throw std::runtime_error("SlideDisplayPanel.qml failed to load: " +
                                     component.errorString().toStdString());
        }
    }

    QMediaPlayer* mediaPlayer() const {
        return root->findChild<QMediaPlayer*>();
    }

    QQuickItem* videoOutputItem() const {
        for (auto* item : root->findChildren<QQuickItem*>()) {
            if (QString::fromLatin1(item->metaObject()->className()).contains("VideoOutput")) {
                return item;
            }
        }
        return nullptr;
    }
};

void testSongAndNonSongVideoPlaybackBehavior() {
    std::cout << "[TEST] Running testSongAndNonSongVideoPlaybackBehavior (#244)..." << std::endl;

    fs::path rootDir = fs::temp_directory_path() / "hs_test_video_loop_and_fade_244";
    fs::remove_all(rootDir);

    // 01_Song_Folder: contains an audio stem + background video -> song folder (must loop smoothly)
    fs::path songFolder = rootDir / "01_Song_Folder";
    fs::create_directories(songFolder);
    std::ofstream(songFolder / "Drums.wav") << "RIFF....WAVEfmt ";
    std::ofstream(songFolder / "worship_loop.mp4") << "FAKE_MP4_DATA";

    // 02_Media_Folder: contains only a video (no audio stems) -> non-song folder (must NOT loop, must fade out smoothly)
    fs::path mediaFolder = rootDir / "02_Media_Folder";
    fs::create_directories(mediaFolder);
    std::ofstream(mediaFolder / "announcement_clip.mp4") << "FAKE_MP4_DATA";

    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SlideDisplayViewModel slides;
    SongSwitchCoordinator coordinator(setlist, mixer);

    SlidePanelHarness panel(setlist, mixer, slides);
    QMediaPlayer* player = panel.mediaPlayer();
    QQuickItem* videoOutput = panel.videoOutputItem();
    check(player != nullptr, "#244: SlideDisplayPanel must contain a MediaPlayer");
    check(videoOutput != nullptr, "#244: SlideDisplayPanel must contain a VideoOutput");

    check(setlist.openServiceOrderRootFolder(QString::fromStdString(rootDir.string())),
          "#244: openServiceOrderRootFolder failed");
    runEvents(100);

    // Case 1: Song folder (index 0) -> video in song folder must loop smoothly
    setlist.setCurrentSongIndex(0);
    runEvents(100);
    check(setlist.hasActiveSongMap() == true, "#244: index 0 should be a song folder");
    check(player->loops() == QMediaPlayer::Infinite,
          "#244: video in a song folder must loop infinitely (got loops=" +
              std::to_string(player->loops()) + ")");
    check(std::abs(videoOutput->opacity() - 1.0) < 0.05,
          "#244: video in a song folder must remain at full opacity 1.0");

    // Case 2: Non-song folder (index 1) -> video is NOT in a song folder:
    // must NOT loop infinitely and must automatically fade out smoothly.
    setlist.setCurrentSongIndex(1);
    runEvents(100);
    check(setlist.hasActiveSongMap() == false, "#244: index 1 should NOT be a song folder");
    check(player->loops() == 1 || player->loops() == QMediaPlayer::Once,
          "#244: video not in a song folder must play once (not loop infinitely), got loops=" +
              std::to_string(player->loops()));

    // When non-song video reaches end / stops, or fades out at completion, videoOutput opacity must smoothly fade to 0.0
    player->stop();
    runEvents(600);
    check(videoOutput->opacity() < 0.1,
          "#244: video not in a song folder did not smoothly fade out (videoOutput opacity is still " +
              std::to_string(videoOutput->opacity()) + ")");

    fs::remove_all(rootDir);
    std::cout << "[PASS] testSongAndNonSongVideoPlaybackBehavior passed." << std::endl;
}

} // namespace

int main(int argc, char** argv) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    QGuiApplication app(argc, argv);
    try {
        testSongAndNonSongVideoPlaybackBehavior();
        std::cout << "\nALL #244 VIDEO LOOP AND FADE TESTS PASSED" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "FAIL in #244 video loop and fade tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
