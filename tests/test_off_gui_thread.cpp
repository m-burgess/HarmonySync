// #177: slow disk work must never block the UI thread.
//
// (a) SetlistViewModel::openServiceOrderRootFolderAsync scans on a worker. A 2s scan may
//     not stall the UI thread for more than 50ms. When it finishes, the order opens with
//     the #220 behaviour (serviceOrderOpened, itemCountChanged, song 0 cued). Opening a
//     second order while the first scans drops the first result.
// (b) AudioMixerViewModel's autosave writes on a worker. A 2s save may not stall the UI
//     thread for more than 50ms. The save gets a copy of the stems and the song folder.
//     Saves for the same song never overlap; newer requests coalesce. The pre-switch
//     flush (#205) queues the pending save behind the one already writing.
//
// Stalls are measured with a 5ms QTimer heartbeat on the UI thread. Slow disks are
// simulated with in-process hooks that sleep, so no slow mount is needed in CI.
#include "AudioMixerViewModel.hpp"
#include "SetlistViewModel.hpp"

#include <QCoreApplication>
#include <QElapsedTimer>
#include <QTimer>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <mutex>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

using namespace HarmonySync::ViewModels;
using HarmonySync::Core::MediaStem;
namespace fs = std::filesystem;
using namespace std::chrono_literals;

namespace {

constexpr qint64 kMaxStallMs = 50;

void check(bool ok, const std::string& what) {
    if (!ok) throw std::runtime_error(what);
}

// Records the longest gap between heartbeat ticks on the UI thread, including time spent
// inside calls made from the test body (the gap closes on the next tick after they return).
class StallMeter {
public:
    StallMeter() {
        m_clock.start();
        m_last = m_clock.elapsed();
        m_timer.setInterval(5);
        QObject::connect(&m_timer, &QTimer::timeout, [this] {
            qint64 now = m_clock.elapsed();
            m_max = std::max(m_max, now - m_last);
            m_last = now;
        });
        m_timer.start();
    }
    void reset() { m_last = m_clock.elapsed(); m_max = 0; }
    qint64 maxGapMs() const { return m_max; }
private:
    QTimer m_timer;
    QElapsedTimer m_clock;
    qint64 m_last{0};
    qint64 m_max{0};
};

bool waitFor(const std::function<bool()>& done, int ms) {
    QElapsedTimer timer;
    timer.start();
    while (timer.elapsed() < ms) {
        if (done()) return true;
        QCoreApplication::processEvents(QEventLoop::AllEvents, 5);
    }
    return done();
}

void runEvents(int ms) { waitFor([] { return false; }, ms); }

fs::path makeServiceOrder(const std::string& tag, const std::vector<std::string>& songs) {
    fs::path root = fs::temp_directory_path() / ("hs_off_gui_" + tag);
    fs::remove_all(root);
    for (std::size_t i = 0; i < songs.size(); ++i) {
        fs::path song = root / ("0" + std::to_string(i + 1) + "_Song_" + songs[i]);
        fs::create_directories(song);
        std::ofstream(song / (songs[i] + "_Drums.wav")) << "RIFF....WAVEfmt ";
    }
    return root;
}

// ---------- (a) service-order scan ----------

void testScanDoesNotBlockAndOpensOrder() {
    fs::path root = makeServiceOrder("scan_a", {"Alpha", "Bravo", "Charlie"});
    SetlistViewModel vm;
    const auto uiThread = std::this_thread::get_id();
    std::atomic<bool> scannedOffUi{false};
    vm.setServiceOrderScanHookForTesting([&](const std::string&) {
        scannedOffUi = std::this_thread::get_id() != uiThread;
        std::this_thread::sleep_for(2s);
    });

    std::vector<std::string> events;
    QObject::connect(&vm, &SetlistViewModel::serviceOrderOpened, [&] { events.push_back("opened"); });
    QObject::connect(&vm, &SetlistViewModel::itemCountChanged, [&](int n) { events.push_back("count" + std::to_string(n)); });
    QObject::connect(&vm, &SetlistViewModel::currentSongIndexChanged, [&](int i) { events.push_back("song" + std::to_string(i)); });
    int finished = 0;
    bool finishedOk = false;
    QObject::connect(&vm, &SetlistViewModel::serviceOrderOpenFinished, [&](bool ok) { ++finished; finishedOk = ok; });

    StallMeter meter;
    runEvents(30);
    meter.reset();
    vm.openServiceOrderRootFolderAsync(QString::fromStdString(root.string()));
    check(waitFor([&] { return finished > 0; }, 6000), "scan never finished");
    runEvents(30);
    std::cout << "  scan: max UI stall " << meter.maxGapMs() << "ms\n";
    check(meter.maxGapMs() <= kMaxStallMs, "UI thread stalled " + std::to_string(meter.maxGapMs()) + "ms during scan");
    check(scannedOffUi, "scan ran on the UI thread");
    check(finished == 1 && finishedOk, "serviceOrderOpenFinished(true) not emitted once");
    check(vm.itemCount() == 3, "itemCount != 3");
    check(vm.currentSongIndex() == 0, "song 0 not cued");
    std::vector<std::string> want{"count3", "opened", "song0"};
    check(events == want, "signal order differs from #220 (count, opened, song0)");
    check(!vm.isLoading(), "still loading after finish");
}

void testSecondOpenSupersedesFirst() {
    fs::path rootOld = makeServiceOrder("scan_cur", {"Current"});
    fs::path rootX = makeServiceOrder("scan_x", {"X1", "X2"});
    fs::path rootY = makeServiceOrder("scan_y", {"Y1", "Y2", "Y3", "Y4"});
    SetlistViewModel vm;
    check(vm.openServiceOrderRootFolder(QString::fromStdString(rootOld.string())), "setup order did not open");
    vm.setServiceOrderScanHookForTesting([&](const std::string& path) {
        std::this_thread::sleep_for(path == rootX.string() ? 1500ms : 300ms);
    });
    int opened = 0;
    std::vector<bool> finished;
    QObject::connect(&vm, &SetlistViewModel::serviceOrderOpened, [&] { ++opened; });
    QObject::connect(&vm, &SetlistViewModel::serviceOrderOpenFinished, [&](bool ok) { finished.push_back(ok); });

    StallMeter meter;
    runEvents(30);
    meter.reset();
    vm.openServiceOrderRootFolderAsync(QString::fromStdString(rootX.string()));
    runEvents(100);
    // The current setlist stays usable while scanning.
    check(vm.itemCount() == 1 && vm.itemNameAt(0).contains("Current"), "current setlist replaced mid-scan");
    check(vm.isLoading(), "isLoading false while scanning");
    vm.openServiceOrderRootFolderAsync(QString::fromStdString(rootY.string()));
    check(waitFor([&] { return !finished.empty(); }, 6000), "second scan never finished");
    runEvents(1800); // long enough for X's result to arrive if it were not dropped
    std::cout << "  supersede: max UI stall " << meter.maxGapMs() << "ms\n";
    check(meter.maxGapMs() <= kMaxStallMs, "UI thread stalled " + std::to_string(meter.maxGapMs()) + "ms");
    check(opened == 1, "serviceOrderOpened emitted " + std::to_string(opened) + " times, want 1");
    check(finished.size() == 1 && finished[0], "serviceOrderOpenFinished not emitted once for the newest");
    check(vm.itemCount() == 4, "the older scan's result was applied");
    check(vm.currentSongIndex() == 0, "song 0 not cued");
}

// ---------- (b) mix-state autosave ----------

struct SaveRecord {
    std::thread::id thread;
    qint64 startMs;
    qint64 endMs;
    std::string folder;
    float volume0;
};

struct SaveLog {
    std::mutex mutex;
    std::vector<SaveRecord> saves;
    int active{0};
    int maxActive{0};
    QElapsedTimer clock;
    SaveLog() { clock.start(); }

    AudioMixerViewModel::MixStateSaver saver(std::chrono::milliseconds delay) {
        return [this, delay](const std::string& folder, std::vector<MediaStem> stems) {
            qint64 start;
            {
                std::lock_guard lock(mutex);
                ++active;
                maxActive = std::max(maxActive, active);
                start = clock.elapsed();
            }
            std::this_thread::sleep_for(delay);
            std::lock_guard lock(mutex);
            --active;
            saves.push_back({std::this_thread::get_id(), start, clock.elapsed(), folder,
                             stems.empty() ? -1.0f : stems[0].volume()});
            return true;
        };
    }
    std::size_t count() { std::lock_guard lock(mutex); return saves.size(); }
    bool started() { std::lock_guard lock(mutex); return active > 0 || !saves.empty(); }
};

std::vector<MediaStem> songStems(const std::string& folder) {
    return {MediaStem("1", "Drums", (fs::temp_directory_path() / folder / "drums.wav").string()),
            MediaStem("2", "Bass", (fs::temp_directory_path() / folder / "bass.wav").string())};
}

void testSlowAutosaveDoesNotBlock() {
    SaveLog log;
    const auto uiThread = std::this_thread::get_id();
    std::vector<bool> results;
    {
        AudioMixerViewModel vm;
        vm.setMixStateSaverForTesting(log.saver(2000ms));
        QObject::connect(&vm, &AudioMixerViewModel::mixSaveFinished, [&](bool ok) { results.push_back(ok); });
        check(vm.loadSongStems(songStems("hs177_songA")), "load songA failed");

        StallMeter meter;
        runEvents(30);
        meter.reset();
        vm.setStemVolume(0, 0.3f);
        check(waitFor([&] { return log.started(); }, 3000), "autosave never started");
        // Change the mix while the first save is writing: the in-flight copy must not change.
        vm.setStemVolume(0, 0.9f);
        runEvents(700);   // debounce fires while the first save is still writing
        vm.setStemVolume(0, 0.7f);
        check(waitFor([&] { return results.size() >= 2; }, 8000), "coalesced save never finished");
        runEvents(800);   // any extra (non-coalesced) save would show up here
        std::cout << "  autosave: max UI stall " << meter.maxGapMs() << "ms\n";
        check(meter.maxGapMs() <= kMaxStallMs, "UI thread stalled " + std::to_string(meter.maxGapMs()) + "ms during autosave");
    }
    std::lock_guard lock(log.mutex);
    check(log.saves.size() == 2, "want 2 saves (first + one coalesced), got " + std::to_string(log.saves.size()));
    check(log.maxActive == 1, "saves overlapped");
    for (const auto& s : log.saves) {
        check(s.thread != uiThread, "save ran on the UI thread");
        check(fs::path(s.folder) == fs::temp_directory_path() / "hs177_songA", "wrong folder: " + s.folder);
    }
    check(std::abs(log.saves[0].volume0 - 0.3f) < 1e-4, "first save did not get a copy taken at request time");
    check(std::abs(log.saves[1].volume0 - 0.7f) < 1e-4, "coalesced save does not carry the newest mix");
    check(results == std::vector<bool>({true, true}), "mixSaveFinished(true) not emitted per save");
}

void testPreSwitchFlushWaitsForPendingSave() {
    SaveLog log;
    {
        AudioMixerViewModel vm;
        vm.setMixStateSaverForTesting(log.saver(1000ms));
        check(vm.loadSongStems(songStems("hs177_flushA")), "load flushA failed");

        StallMeter meter;
        runEvents(30);
        meter.reset();
        vm.setStemVolume(0, 0.2f);
        check(waitFor([&] { return log.started(); }, 3000), "first save never started");
        vm.setStemVolume(0, 0.4f);          // debounced, not yet started
        vm.flushPendingMixSave();           // #205: before switching songs
        check(vm.loadSongStems(songStems("hs177_flushB")), "load flushB failed");
        check(waitFor([&] { return log.count() >= 2; }, 5000), "flushed save never ran");
        runEvents(900);                     // the old debounce must not save songB
        std::cout << "  flush: max UI stall " << meter.maxGapMs() << "ms\n";
        check(meter.maxGapMs() <= kMaxStallMs, "UI thread stalled " + std::to_string(meter.maxGapMs()) + "ms during flush");
    }
    std::lock_guard lock(log.mutex);
    check(log.saves.size() == 2, "want 2 saves, got " + std::to_string(log.saves.size()));
    check(log.maxActive == 1, "flushed save overlapped the one writing");
    check(log.saves[1].startMs >= log.saves[0].endMs, "flushed save started before the first ended");
    check(fs::path(log.saves[1].folder) == fs::temp_directory_path() / "hs177_flushA", "flush saved the wrong song: " + log.saves[1].folder);
    check(std::abs(log.saves[1].volume0 - 0.4f) < 1e-4, "flush lost the pending change");
}

} // namespace

int main(int argc, char** argv) {
    QCoreApplication app(argc, argv);
    struct Case { const char* name; void (*fn)(); };
    const Case cases[] = {
        {"scan_does_not_block_and_opens_order", testScanDoesNotBlockAndOpensOrder},
        {"second_open_supersedes_first", testSecondOpenSupersedesFirst},
        {"slow_autosave_does_not_block", testSlowAutosaveDoesNotBlock},
        {"pre_switch_flush_waits_for_pending_save", testPreSwitchFlushWaitsForPendingSave},
    };
    int failed = 0;
    for (const auto& c : cases) {
        try {
            c.fn();
            std::cout << "PASS " << c.name << "\n";
        } catch (const std::exception& e) {
            ++failed;
            std::cout << "FAIL " << c.name << ": " << e.what() << "\n";
        }
    }
    return failed == 0 ? 0 : 1;
}
