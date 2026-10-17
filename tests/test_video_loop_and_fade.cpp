// #244: Only videos in song folders loop smoothly; videos not in a song folder
// must play once and automatically fade out smoothly.
#include "AudioMixerViewModel.hpp"
#include "SetlistViewModel.hpp"
#include "SlideDisplayViewModel.hpp"
#include "SongSwitchCoordinator.hpp"

#include <QByteArray>
#include <QElapsedTimer>
#include <QGuiApplication>
#include <QMediaPlayer>
#include <QQmlComponent>
#include <QQmlContext>
#include <QQmlEngine>
#include <QQuickItem>
#include <QUrl>

#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <functional>
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

bool waitFor(const std::function<bool()>& predicate, int timeoutMs) {
    QElapsedTimer timer;
    timer.start();
    while (timer.elapsed() < timeoutMs) {
        if (predicate()) {
            return true;
        }
        QCoreApplication::processEvents(QEventLoop::AllEvents, 20);
    }
    return predicate();
}

void writeValidWav(const fs::path& path) {
    const std::uint32_t rate = 44100;
    const std::uint32_t frames = rate / 10;
    const std::uint16_t channels = 2;
    const std::uint16_t bits = 16;
    const std::uint32_t dataBytes = frames * channels * bits / 8;
    std::ofstream f(path, std::ios::binary);
    auto u32 = [&](std::uint32_t v) { f.write(reinterpret_cast<const char*>(&v), 4); };
    auto u16 = [&](std::uint16_t v) { f.write(reinterpret_cast<const char*>(&v), 2); };
    f << "RIFF";
    u32(36 + dataBytes);
    f << "WAVEfmt ";
    u32(16);
    u16(1);
    u16(channels);
    u32(rate);
    u32(rate * channels * bits / 8);
    u16(channels * bits / 8);
    u16(bits);
    f << "data";
    u32(dataBytes);
    for (std::uint32_t i = 0; i < frames * channels; ++i) {
        u16(0);
    }
}

// 16x16 1.0s 5fps H.264 MP4 so QMediaPlayer decodes real video frames without external tools.
void writeValidMp4(const fs::path& path) {
    static constexpr const char* kMp4Base64 =
        "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAv5tZGF0AAACrQYF//+p"
        "3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBF"
        "Ry00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4u"
        "b3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFs"
        "eXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVk"
        "X3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBk"
        "ZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEg"
        "bG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRl"
        "cmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJf"
        "cHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9"
        "MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTUgc2NlbmVjdXQ9NDAgaW50cmFfcmVm"
        "cmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTUxLjAgcWNvbXA9MC42"
        "MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAAR"
        "ZYiEABL//nvuBRFoIDS5/l0AAAAIQZokbEP/04AAAAAIQZ5CeIIf7oEAAAAIAZ5hdEP/74AAAAAI"
        "AZ5jakP/74EAAAN1bW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAA"
        "AAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        "AAAAAAAAAAAAAgAAAp90cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAA"
        "AAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAk"
        "ZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAQAAABAAAAAAIXbWRpYQAAACBtZGhkAAAAAAAAAAAA"
        "AAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRs"
        "ZXIAAAABwm1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAA"
        "AAx1cmwgAAAAAQAAAYJzdGJsAAAAvnN0c2QAAAAAAAAAAQAAAK5hdmMxAAAAAAAAAAEAAAAAAAAA"
        "AAAAAAAAAAAAABAAEABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAA"
        "AAAAGP//AAAANGF2Y0MBZAAK/+EAF2dkAAqs2V7ARAAAAwAEAAADACg8SJZYAQAGaOvgZSyL/fj4"
        "AAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAABewAAAXsAAAABhzdHRzAAAAAAAAAAEAAAAF"
        "AAAIAAAAABRzdHNzAAAAAAAAAAEAAAABAAAAOGN0dHMAAAAAAAAABQAAAAEAABAAAAAAAQAAKAAA"
        "AAABAAAQAAAAAAEAAAAAAAAAAQAACAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAUAAAABAAAAKHN0"
        "c3oAAAAAAAAAAAAAAAUAAALGAAAADAAAAAwAAAAMAAAADAAAABRzdGNvAAAAAAAAAAEAAAAwAAAA"
        "YnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxz"
        "dAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY2MC4xNi4xMDA=";
    const QByteArray bytes = QByteArray::fromBase64(kMp4Base64);
    std::ofstream out(path, std::ios::binary);
    out.write(bytes.constData(), bytes.size());
}

struct SlidePanelHarness {
    QQmlEngine engine;
    std::unique_ptr<QObject> windowStub;
    std::unique_ptr<QObject> root;

    SlidePanelHarness(SetlistViewModel* setlist,
                      AudioMixerViewModel& mixer,
                      SlideDisplayViewModel& slides) {
        engine.rootContext()->setContextProperty("setlistViewModel", setlist);
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

    // 01_Song_F# 76bpm: contains an audio stem + background video -> song folder (must loop smoothly)
    fs::path songFolder = rootDir / "01_Song_F# 76bpm";
    fs::create_directories(songFolder);
    writeValidWav(songFolder / "Drums.wav");
    writeValidMp4(songFolder / "worship_loop.mp4");

    // 02_Media_Folder: contains only a video (no audio stems) -> non-song folder (must NOT loop, must fade out smoothly)
    fs::path mediaFolder = rootDir / "02_Media_Folder";
    fs::create_directories(mediaFolder);
    writeValidMp4(mediaFolder / "announcement_clip.mp4");

    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SlideDisplayViewModel slides;
    SongSwitchCoordinator coordinator(setlist, mixer);

    SlidePanelHarness panel(&setlist, mixer, slides);
    QMediaPlayer* player = panel.mediaPlayer();
    QQuickItem* videoOutput = panel.videoOutputItem();
    check(player != nullptr, "#244: SlideDisplayPanel must contain a MediaPlayer");
    check(videoOutput != nullptr, "#244: SlideDisplayPanel must contain a VideoOutput");

    // Before any song folder is active, only song folder videos may loop -> default must be Once.
    check(setlist.hasActiveSongMap() == false, "#244: no song map active before opening folder");
    check(mixer.isBackgroundVideoLooping() == false, "#244: mixer video looping must default to false");
    check(player->loops() == QMediaPlayer::Once,
          "#244: only song folder videos loop; initial loops must be Once (got " +
              std::to_string(player->loops()) + ")");

    check(setlist.openServiceOrderRootFolder(QString::fromStdString(rootDir.string())),
          "#244: openServiceOrderRootFolder failed");
    runEvents(100);

    // Case 1: Song folder (index 0) -> video in song folder must loop smoothly
    setlist.setCurrentSongIndex(0);
    runEvents(200);
    check(setlist.hasActiveSongMap() == true, "#244: index 0 should be a song folder");
    check(mixer.isBackgroundVideoLooping() == true, "#244: song folder must set isBackgroundVideoLooping=true");
    check(mixer.shouldAutoFadeOutVideo() == false, "#244: song folder must disable auto fade-out");
    check(player->loops() == QMediaPlayer::Infinite,
          "#244: video in a song folder must loop infinitely (got loops=" +
              std::to_string(player->loops()) + ")");
    check(player->source().toLocalFile().toStdString() == (songFolder / "worship_loop.mp4").string(),
          "#244: song folder video URL with '#' must resolve to local file (got " +
              player->source().toLocalFile().toStdString() + ")");
    check(std::abs(videoOutput->opacity() - 1.0) < 0.05,
          "#244: video in a song folder must remain at full opacity 1.0");

    // Case 2: Non-song folder (index 1) -> video is NOT in a song folder:
    // must NOT loop infinitely and must automatically fade out smoothly.
    setlist.setCurrentSongIndex(1);
    runEvents(50);
    check(setlist.hasActiveSongMap() == false, "#244: index 1 should NOT be a song folder");
    check(mixer.isBackgroundVideoLooping() == false, "#244: non-song folder must set isBackgroundVideoLooping=false");
    check(mixer.shouldAutoFadeOutVideo() == true, "#244: non-song folder must enable auto fade-out");
    check(player->loops() == QMediaPlayer::Once,
          "#244: video not in a song folder must play once (not loop infinitely), got loops=" +
              std::to_string(player->loops()));
    check(videoOutput->opacity() > 0.1,
          "#244: non-song video should start visible and fade out gradually rather than disappear immediately");

    // Let the 1.0s non-song video play to completion automatically (or stop if headless backend doesn't advance clock)
    // and verify it smoothly fades out to 0.0.
    if (!waitFor([&] { return videoOutput->opacity() < 0.1; }, 2200)) {
        player->stop();
        runEvents(650);
    }
    check(videoOutput->opacity() < 0.1,
          "#244: video not in a song folder did not smoothly fade out (videoOutput opacity is still " +
              std::to_string(videoOutput->opacity()) + ")");

    // Case 3: Without SetlistViewModel, only explicit song-folder looping enables infinite loops.
    SlidePanelHarness standalonePanel(nullptr, mixer, slides);
    QMediaPlayer* standalonePlayer = standalonePanel.mediaPlayer();
    check(standalonePlayer != nullptr, "#244: standalone panel must contain a MediaPlayer");
    check(standalonePlayer->loops() == QMediaPlayer::Once,
          "#244: without a song folder, standalone panel must not loop infinitely");

    fs::remove_all(rootDir);
    std::cout << "[PASS] testSongAndNonSongVideoPlaybackBehavior passed." << std::endl;
}

QQuickItem* findVisualItem(QQuickItem* item, const QString& name) {
    if (!item) {
        return nullptr;
    }
    if (item->objectName() == name) {
        return item;
    }
    for (QQuickItem* child : item->childItems()) {
        if (QQuickItem* found = findVisualItem(child, name)) {
            return found;
        }
    }
    return nullptr;
}

void testNonSongVideoAudioMixerAndMixPersistence() {
    std::cout << "[TEST] Running testNonSongVideoAudioMixerAndMixPersistence (#244)..." << std::endl;

    fs::path rootDir = fs::temp_directory_path() / "hs_test_non_song_video_mixer_244";
    fs::remove_all(rootDir);

    fs::path bumperFolder = rootDir / "06 Bumper Video";
    fs::create_directories(bumperFolder);
    writeValidMp4(bumperFolder / "Mark - Sermon Bumper - Keith Robertson (1080p).mp4");

    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SongSwitchCoordinator coordinator(setlist, mixer);

    check(setlist.openServiceOrderRootFolder(QString::fromStdString(rootDir.string())),
          "#244: openServiceOrderRootFolder failed for bumper video");

    // Non-song video folder must remain a non-song item (hasActiveSongMap == false)
    // while routing its video audio stem (pan = 0.0) and creating mix.json in the folder.
    check(setlist.hasActiveSongMap() == false, "#244: bumper video folder must not have an active song map");
    const auto initialStems = setlist.stemsAt(0);
    check(initialStems.size() == 1, "#244: bumper video folder must expose 1 audio stem for the video");
    check(std::abs(initialStems[0].pan() - 0.0f) < 0.001f, "#244: bumper video stem must be centered stereo (pan=0.0)");
    check(std::abs(initialStems[0].volume() - 1.0f) < 0.001f, "#244: initial bumper video stem volume must be 1.0");
    check(fs::exists(bumperFolder / "mix.json"), "#244: initial scan of non-song video folder must create mix.json");

    // Wait for SongSwitchCoordinator + AudioMixerViewModel async preload to load the video stem into the mixer.
    check(waitFor([&] { return mixer.loadedStemCount() == 1; }, 4000),
          "#244: bumper video stem was not loaded into AudioMixerViewModel");

    // Load StemMixerPanel.qml with setlistViewModel + audioMixerViewModel and verify the non-song video fader is visible.
    QQmlEngine qmlEngine;
    qmlEngine.rootContext()->setContextProperty("setlistViewModel", &setlist);
    qmlEngine.rootContext()->setContextProperty("audioMixerViewModel", &mixer);
    QQmlComponent mixerComp(&qmlEngine, QUrl::fromLocalFile(QStringLiteral(HS_QML_DIR "/components/StemMixerPanel.qml")));
    std::unique_ptr<QObject> mixerRoot(mixerComp.create());
    check(mixerRoot != nullptr,
          "#244: StemMixerPanel.qml failed to load: " + mixerComp.errorString().toStdString());
    runEvents(50);

    check(mixerRoot->property("isNonSongVideo").toBool() == true,
          "#244: StemMixerPanel.isNonSongVideo must be true for non-song video");
    auto* volumeSlider = findVisualItem(qobject_cast<QQuickItem*>(mixerRoot.get()), QStringLiteral("stemVolumeSlider_0"));
    check(volumeSlider != nullptr, "#244: StemMixerPanel must create stemVolumeSlider_0 for non-song video");
    check(volumeSlider->property("visible").toBool() == true,
          "#244: stemVolumeSlider_0 must be visible for non-song video");
    check(volumeSlider->width() >= 200.0 && volumeSlider->height() >= 24.0,
          "#244: stemVolumeSlider_0 must have non-zero interactive hit-test dimensions (got " +
              std::to_string(volumeSlider->width()) + "x" + std::to_string(volumeSlider->height()) + ")");

    // Simulate user dragging the QML volume slider and verify it updates the mixer and persists to mix.json.
    volumeSlider->setProperty("value", 0.35);
    QMetaObject::invokeMethod(volumeSlider, "moved");
    runEvents(50);
    check(std::abs(mixer.stemVolume(0) - 0.35f) < 0.001f,
          "#244: moving QML stemVolumeSlider_0 must update mixer stemVolume(0) to 0.35 (got " +
              std::to_string(mixer.stemVolume(0)) + ")");
    mixer.unloadCurrentSong(); // flushes pending mix.json save immediately

    // Verify SetlistViewModel::stemsAt(0) also reflects the saved mix.json volume in the same session
    const auto updatedSessionStems = setlist.stemsAt(0);
    check(updatedSessionStems.size() == 1 && std::abs(updatedSessionStems[0].volume() - 0.35f) < 0.001f,
          "#244: SetlistViewModel::stemsAt(0) must reflect saved volume 0.35 from mix.json");

    HarmonySync::Core::FolderService folderService;
    HarmonySync::Core::SongMap reloaded = folderService.loadSongFromFolder(bumperFolder);
    check(reloaded.hasSongMap() == false, "#244: reloaded bumper folder must still have hasSongMap() == false");
    check(reloaded.stems().size() == 1, "#244: reloaded bumper folder must still have 1 stem");
    check(std::abs(reloaded.stems()[0].volume() - 0.35f) < 0.001f,
          "#244: reloaded bumper folder must restore saved volume 0.35 from mix.json (got " +
              std::to_string(reloaded.stems()[0].volume()) + ")");

    fs::remove_all(rootDir);
    std::cout << "[PASS] testNonSongVideoAudioMixerAndMixPersistence passed." << std::endl;
}

void testSilentVideoToBumperVideoAudioPlayback() {
    std::cout << "[TEST] Running testSilentVideoToBumperVideoAudioPlayback (#244)..." << std::endl;

    fs::path rootDir = fs::temp_directory_path() / "hs_test_silent_to_bumper_244";
    fs::remove_all(rootDir);

    // 01 Countdown Video (video-only MP4 with no audio stream, 1.0s duration)
    fs::path countdownFolder = rootDir / "01 Countdown Video";
    fs::create_directories(countdownFolder);
    writeValidMp4(countdownFolder / "Countdown Slides.mp4");

    // 02 Song Folder
    fs::path songFolder = rootDir / "02 Worship Song";
    fs::create_directories(songFolder);
    writeValidWav(songFolder / "Drums.wav");
    writeValidMp4(songFolder / "Song Background.mp4");

    // 04 Announcements (image-only folder, 0 stems)
    fs::path announceFolder = rootDir / "04 Announcements";
    fs::create_directories(announceFolder);
    {
        std::ofstream img(announceFolder / "Slide1.png", std::ios::binary);
        img << "PNG";
    }

    // 06 Bumper Video
    fs::path bumperFolder = rootDir / "06 Bumper Video";
    fs::create_directories(bumperFolder);
    writeValidMp4(bumperFolder / "Bumper Clip.mp4");

    SetlistViewModel setlist;
    AudioMixerViewModel mixer;
    SlideDisplayViewModel slides;
    SongSwitchCoordinator coordinator(setlist, mixer);
    SlidePanelHarness panel(&setlist, mixer, slides);
    QQuickItem* videoOutput = panel.videoOutputItem();
    check(videoOutput != nullptr, "#244: SlideDisplayPanel must contain a VideoOutput");

    check(setlist.openServiceOrderRootFolder(QString::fromStdString(rootDir.string())),
          "#244: openServiceOrderRootFolder failed");

    // Wait for 01 Countdown Video stem to decode and load
    check(waitFor([&] { return mixer.loadedStemCount() == 1; }, 4000),
          "#244: 01 Countdown Video stem did not load");
    // Silent video fallback must match the 1.0s video duration (not 0.1s) when ffprobe is available
    check(mixer.durationSeconds() >= 0.8,
          "#244: silent video stem duration should match video duration (~1.0s), got " +
              std::to_string(mixer.durationSeconds()));

    // Switch directly from 01 Countdown Video to 06 Bumper Video (index 3)
    setlist.setCurrentSongIndex(3);
    check(waitFor([&] {
        return mixer.loadedStemCount() == 1 &&
               mixer.stemName(0).toStdString() == "Bumper Clip";
    }, 4000), "#244: 06 Bumper Video stem did not load after switching from 01 Countdown Video");

    // Ensure bumper video audio starts playing and stays playing (not stopped by previous 0.1s stem race)
    check(waitFor([&] { return mixer.isPlaying(); }, 1500),
          "#244: 06 Bumper Video audio should be playing");
    runEvents(250);
    check(mixer.isPlaying(),
          "#244: 06 Bumper Video audio stopped prematurely after 250ms");

    // Let the 1.0s bumper video finish naturally and verify it fades out and does NOT loop or restart
    check(waitFor([&] { return !mixer.isPlaying(); }, 2500),
          "#244: 06 Bumper Video audio should stop after playing once");
    runEvents(700);
    check(!mixer.isPlaying(),
          "#244: 06 Bumper Video must not loop/restart after finishing");
    check(videoOutput->opacity() < 0.1,
          "#244: 06 Bumper Video must stay faded out after finishing (opacity=" +
              std::to_string(videoOutput->opacity()) + ")");

    fs::remove_all(rootDir);
    std::cout << "[PASS] testSilentVideoToBumperVideoAudioPlayback passed." << std::endl;
}

} // namespace

int main(int argc, char** argv) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    QGuiApplication app(argc, argv);
    try {
        testSongAndNonSongVideoPlaybackBehavior();
        testNonSongVideoAudioMixerAndMixPersistence();
        testSilentVideoToBumperVideoAudioPlayback();
        std::cout << "\nALL #244 VIDEO LOOP AND FADE TESTS PASSED" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "FAIL in #244 video loop and fade tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
