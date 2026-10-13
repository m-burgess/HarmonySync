// #188/#202: loading the next song through the real StemMixerPanel.qml must leave
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
#include <QAbstractItemModel>
#include <QColor>
#include <QQuickItem>
#include <QVariant>
#include <vector>

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

void testOpeningServiceOrderCuesFirstSong() {
    std::cout << "[TEST] Running testOpeningServiceOrderCuesFirstSong..." << std::endl;
    AudioMixerViewModel vm;
    Panel panel(vm);

    // Opening a service order: main.cpp calls loadNextSongStems for Song A while stopped.
    // #202: the first song is cued at 0 and waits for PLAY.
    check(!vm.isPlaying(), "open: precondition");
    check(vm.loadNextSongStems({MediaStem("a1", "DrumsA", "song_a_drums.wav")}), "open: load failed");
    runEventsWatchingCrossfade(vm, 300, "open");

    check(vm.loadedStemCount() == 1, "open: active deck lost Song A (got " + firstStemName(vm) + ")");
    check(firstStemName(vm) == "DrumsA", "open: expected DrumsA, got " + firstStemName(vm));
    check(!vm.isPlaying(), "open: Song A started playing instead of being cued");
    check(vm.positionSeconds() == 0.0, "open: Song A is not cued at position 0");
    std::cout << "[PASS] testOpeningServiceOrderCuesFirstSong passed." << std::endl;
}

void testAdvancingWhileStoppedCuesNextSong() {
    std::cout << "[TEST] Running testAdvancingWhileStoppedCuesNextSong..." << std::endl;
    AudioMixerViewModel vm;
    Panel panel(vm);

    check(vm.loadNextSongStems({MediaStem("a1", "DrumsA", "song_a_drums.wav")}), "advance: load A failed");
    runEventsWatchingCrossfade(vm, 100, "advance");
    check(!vm.isPlaying(), "advance: precondition");

    // Advancing the setlist while stopped cues Song B; it does not start it.
    check(vm.loadNextSongStems({MediaStem("b1", "DrumsB", "song_b_drums.wav")}), "advance: load B failed");
    runEventsWatchingCrossfade(vm, 300, "advance");

    check(firstStemName(vm) == "DrumsB", "advance: expected DrumsB, got " + firstStemName(vm));
    check(!vm.isPlaying(), "advance: Song B started playing instead of being cued");
    check(vm.positionSeconds() == 0.0, "advance: Song B is not cued at position 0");
    std::cout << "[PASS] testAdvancingWhileStoppedCuesNextSong passed." << std::endl;
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

// ---- #206: delegates must follow the loaded song, not just the stem count ----

const QColor kDanger("#ef4444");

MediaStem makeStem(const std::string& id, const std::string& name, bool muted,
                   bool solo = false, float volume = 1.0f) {
    MediaStem s(id, name, id + ".wav");
    s.setMuted(muted);
    s.setSolo(solo);
    s.setVolume(volume);
    return s;
}

QObject* findRepeater(QObject* root) {
    for (QObject* o : root->findChildren<QObject*>()) {
        if (QString(o->metaObject()->className()).startsWith("QQuickRepeater")) return o;
    }
    return nullptr;
}

QQuickItem* delegateAt(QObject* repeater, int i) {
    QQuickItem* item = nullptr;
    QMetaObject::invokeMethod(repeater, "itemAt", Q_RETURN_ARG(QQuickItem*, item), Q_ARG(int, i));
    return item;
}

std::string delegateText(QQuickItem* d) {
    for (QQuickItem* c : d->childItems()) {
        QVariant t = c->property("text");
        if (t.isValid()) return t.toString().toStdString();
    }
    return "<no text>";
}

bool delegateShowsMuted(QQuickItem* d) {
    // border.color has no colour animation, so it is safe to read right away.
    QObject* border = d->property("border").value<QObject*>();
    return border && border->property("color").value<QColor>() == kDanger;
}

void checkPanelShows(Panel& panel, const std::vector<std::pair<std::string, bool>>& want,
                     const std::string& path) {
    QCoreApplication::processEvents();
    QObject* rep = findRepeater(panel.root.get());
    check(rep != nullptr, path + ": no Repeater in StemMixerPanel");
    check(rep->property("count").toInt() == static_cast<int>(want.size()), path + ": wrong delegate count");
    for (int i = 0; i < static_cast<int>(want.size()); ++i) {
        QQuickItem* d = delegateAt(rep, i);
        check(d != nullptr, path + ": missing delegate " + std::to_string(i));
        check(delegateText(d) == want[i].first,
              path + ": delegate " + std::to_string(i) + " shows " + delegateText(d) + ", expected " + want[i].first);
        check(delegateShowsMuted(d) == want[i].second,
              path + ": delegate " + std::to_string(i) + " (" + want[i].first + ") has stale mute colour");
    }
}

QAbstractItemModel* stemModelOf(AudioMixerViewModel& vm) {
    return vm.property("stemModel").value<QAbstractItemModel*>();
}

QVariant roleValue(QAbstractItemModel* m, int row, const QByteArray& role) {
    const auto names = m->roleNames();
    for (auto it = names.begin(); it != names.end(); ++it) {
        if (it.value() == role) return m->data(m->index(row, 0), it.key());
    }
    return {};
}

void testSameCountSwitchShowsSongBNamesAndMutes() {
    std::cout << "[TEST] Running testSameCountSwitchShowsSongBNamesAndMutes..." << std::endl;
    AudioMixerViewModel vm;
    Panel panel(vm);

    check(vm.loadNextSongStems({makeStem("a1", "DrumsA", true), makeStem("a2", "BassA", false)}), "sameCount: load A");
    checkPanelShows(panel, {{"DRUMSA", true}, {"BASSA", false}}, "sameCount A");

    // Song B: same stem count, different names, opposite mute states.
    check(vm.loadNextSongStems({makeStem("b1", "KeysB", false), makeStem("b2", "VoxB", true)}), "sameCount: load B");
    checkPanelShows(panel, {{"KEYSB", false}, {"VOXB", true}}, "sameCount B");
    std::cout << "[PASS] testSameCountSwitchShowsSongBNamesAndMutes passed." << std::endl;
}

void testSameCountShowSongThroughPreloadPath() {
    std::cout << "[TEST] Running testSameCountShowSongThroughPreloadPath..." << std::endl;
    AudioMixerViewModel vm;
    Panel panel(vm);
    check(vm.loadSongStems({makeStem("a1", "DrumsA", false), makeStem("a2", "BassA", true)}), "preload: load A");
    checkPanelShows(panel, {{"DRUMSA", false}, {"BASSA", true}}, "preload A");

    vm.showSong({makeStem("b1", "KeysB", true), makeStem("b2", "VoxB", false)});
    QElapsedTimer t; t.start();
    while (vm.stemName(0) != "KeysB" && t.elapsed() < 3000) QCoreApplication::processEvents(QEventLoop::AllEvents, 20);
    check(vm.stemName(0) == "KeysB", "preload: showSong never switched");
    checkPanelShows(panel, {{"KEYSB", true}, {"VOXB", false}}, "preload B");
    std::cout << "[PASS] testSameCountShowSongThroughPreloadPath passed." << std::endl;
}

void testMuteToggleUpdatesDelegate() {
    std::cout << "[TEST] Running testMuteToggleUpdatesDelegate..." << std::endl;
    AudioMixerViewModel vm;
    Panel panel(vm);
    check(vm.loadNextSongStems({makeStem("a1", "DrumsA", false), makeStem("a2", "BassA", false)}), "toggle: load A");
    vm.toggleStemMute(1);
    checkPanelShows(panel, {{"DRUMSA", false}, {"BASSA", true}}, "toggle");
    std::cout << "[PASS] testMuteToggleUpdatesDelegate passed." << std::endl;
}

void testSoloAndVolumeFollowSongAndSurviveMute() {
    std::cout << "[TEST] Running testSoloAndVolumeFollowSongAndSurviveMute..." << std::endl;
    AudioMixerViewModel vm;
    Panel panel(vm);
    QAbstractItemModel* m = stemModelOf(vm);
    check(m != nullptr, "soloVol: AudioMixerViewModel has no stemModel");

    // Song A: stem 0 soloed at 0.3. QA mutes stem 1, then switches.
    check(vm.loadNextSongStems({makeStem("a1", "DrumsA", false, true, 0.3f), makeStem("a2", "BassA", false)}), "soloVol: load A");
    vm.toggleStemMute(1);
    check(roleValue(m, 1, "muted").toBool(), "soloVol: mute on A not in model");

    // Song B: same count; stem 1 has its own preset (solo, 0.6).
    check(vm.loadNextSongStems({makeStem("b1", "KeysB", false), makeStem("b2", "VoxB", false, true, 0.6f)}), "soloVol: load B");
    checkPanelShows(panel, {{"KEYSB", false}, {"VOXB", false}}, "soloVol B");
    check(!roleValue(m, 0, "soloed").toBool(), "soloVol: Song A's solo leaked onto KeysB");
    check(qFuzzyCompare(roleValue(m, 0, "volume").toFloat(), 1.0f), "soloVol: Song A's volume leaked onto KeysB");
    check(roleValue(m, 1, "soloed").toBool(), "soloVol: VoxB lost its solo preset");
    check(qFuzzyCompare(roleValue(m, 1, "volume").toFloat(), 0.6f), "soloVol: VoxB lost its volume preset");

    // Muting must not reset solo or volume.
    vm.toggleStemMute(1);
    checkPanelShows(panel, {{"KEYSB", false}, {"VOXB", true}}, "soloVol B muted");
    check(roleValue(m, 1, "soloed").toBool(), "soloVol: mute reset VoxB's solo");
    check(qFuzzyCompare(roleValue(m, 1, "volume").toFloat(), 0.6f), "soloVol: mute reset VoxB's volume");
    std::cout << "[PASS] testSoloAndVolumeFollowSongAndSurviveMute passed." << std::endl;
}

} // namespace

int main(int argc, char** argv) {
    qputenv("QT_QPA_PLATFORM", "offscreen");
    QGuiApplication app(argc, argv);
    try {
        testOpeningServiceOrderCuesFirstSong();
        testAdvancingWhileStoppedCuesNextSong();
        testPlayingPathKeepsSongBOnActiveDeck();
        testSameCountSwitchShowsSongBNamesAndMutes();
        testSameCountShowSongThroughPreloadPath();
        testMuteToggleUpdatesDelegate();
        testSoloAndVolumeFollowSongAndSurviveMute();
        std::cout << "\nALL STEM MIXER PANEL QML TESTS PASSED" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "FAIL in StemMixerPanel QML tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
