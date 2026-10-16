#include "ConfidenceMonitorViewModel.hpp"
#include "JsonSyntaxHighlighter.hpp"
#include "LowerThirdOverlayViewModel.hpp"
#include "PresentationWindowViewModel.hpp"
#include "SlideDisplayViewModel.hpp"
#include "VideoBackgroundPlayer.hpp"
#include "test_check.hpp"
#include "test_temp_dir.hpp"

#include <QColor>
#include <QCoreApplication>
#include <QTextBlock>
#include <QTextDocument>
#include <QTextLayout>

#include <memory>
#include <string>

using namespace HarmonySync::ViewModels;

namespace {
struct VideoState {
    bool loadResult{true};
    std::string primary;
    std::string secondary;
    int playCalls{0};
    int pauseCalls{0};
    int transitionCalls{0};
};

class TestVideoBackend final : public HarmonySync::Media::IVideoPlayerBackend {
public:
    explicit TestVideoBackend(std::shared_ptr<VideoState> state)
        : m_state(std::move(state)) {}

    bool loadPrimary(const std::string& path) override {
        m_state->primary = path;
        return m_state->loadResult;
    }
    bool loadSecondary(const std::string& path) override {
        m_state->secondary = path;
        return m_state->loadResult;
    }
    void play() override { ++m_state->playCalls; }
    void pause() override { ++m_state->pauseCalls; }
    void stop() override {}
    void setLooping(bool) override {}
    void transition(HarmonySync::Media::VideoTransitionMode, int) override { ++m_state->transitionCalls; }

private:
    std::shared_ptr<VideoState> m_state;
};

QTextCharFormat formatAt(const QTextBlock& block, int position) {
    for (const auto& range : block.layout()->formats()) {
        if (position >= range.start && position < range.start + range.length) {
            return range.format;
        }
    }
    return {};
}

void testSlideDisplay() {
    TempDir directory;
    writeFile(directory.path() / "01 Welcome.png", "image");
    writeFile(directory.path() / "02 Reading.jpg", "image");

    SlideDisplayViewModel vm;
    HS_CHECK(vm.activeSlideIndex() == -1);
    HS_CHECK(vm.slideCount() == 0);
    HS_CHECK(vm.activeSlideTitleStd().empty());
    HS_CHECK(!vm.isBlackScreen());
    HS_CHECK(!vm.isClearScreen());
    HS_CHECK(!vm.loadSlideFolder(QString::fromStdString((directory.path() / "missing").string())));
    HS_CHECK(vm.slides().empty());

    HS_CHECK(vm.loadSlideFolder(QString::fromStdString(directory.path().string())));
    HS_CHECK(vm.slideCount() == 2);
    HS_CHECK(vm.activeSlideIndex() == 0);
    HS_CHECK(!vm.activeSlideTitleStd().empty());
    vm.selectSlide(1);
    const auto selectedTitle = vm.activeSlideTitleStd();
    HS_CHECK(vm.activeSlideIndex() == 1);
    HS_CHECK(!selectedTitle.empty());
    vm.selectSlide(1); // selecting the current slide is a no-op
    vm.selectSlide(-1);
    vm.selectSlide(2);
    HS_CHECK(vm.activeSlideIndex() == 1);
    vm.nextSlide(); // already at the end
    HS_CHECK(vm.activeSlideIndex() == 1);
    vm.previousSlide();
    HS_CHECK(vm.activeSlideIndex() == 0);
    vm.previousSlide(); // already at the beginning
    HS_CHECK(vm.activeSlideIndex() == 0);
    vm.toggleBlackScreen();
    vm.toggleClearScreen();
    HS_CHECK(vm.isBlackScreen());
    HS_CHECK(vm.isClearScreen());
    vm.toggleBlackScreen();
    vm.toggleClearScreen();
    HS_CHECK(!vm.isBlackScreen());
    HS_CHECK(!vm.isClearScreen());
}

void testPresentationWindow() {
    auto state = std::make_shared<VideoState>();
    auto player =
        std::make_shared<HarmonySync::Media::VideoBackgroundPlayer>(std::make_unique<TestVideoBackend>(state));
    PresentationWindowViewModel vm(player);
    HS_CHECK(vm.isChromaKeyEnabled());
    HS_CHECK(vm.keyColorHexStd() == "#00FF00");
    vm.setChromaKeyEnabled(false);
    vm.setChromaKeyEnabled(false);
    HS_CHECK(!vm.isChromaKeyEnabled());
    vm.setChromaKeyEnabled(true);
    vm.setKeyColorHex(QStringLiteral("#123456"));
    vm.setKeyColorHex(QStringLiteral("#123456"));
    HS_CHECK(vm.keyColorHexStd() == "#123456");
    HS_CHECK(vm.keyColorHex() == QStringLiteral("#123456"));

    HS_CHECK(vm.loadBackgroundVideo(QStringLiteral("stage.mp4")));
    HS_CHECK(vm.activeVideoPathStd() == "stage.mp4");
    HS_CHECK(vm.activeVideoPath() == QStringLiteral("stage.mp4"));
    HS_CHECK(player->loadSecondaryVideo("backup.mp4"));
    state->loadResult = false;
    HS_CHECK(!vm.loadBackgroundVideo(QStringLiteral("missing.mp4")));
    HS_CHECK(vm.activeVideoPathStd() == "stage.mp4");
    vm.playVideo();
    vm.pauseVideo();
    vm.triggerCrossfade();
    HS_CHECK(state->playCalls == 1);
    HS_CHECK(state->pauseCalls == 1);
    HS_CHECK(state->transitionCalls == 1);
    HS_CHECK(vm.activeVideoPath() == QStringLiteral("backup.mp4"));
}

void testOverlayAndConfidenceMonitor() {
    LowerThirdOverlayViewModel overlay;
    HS_CHECK(overlay.isVisible());
    HS_CHECK(overlay.titleStd() == "Way Maker");
    HS_CHECK(overlay.subtitleStd() == "Sinach");
    overlay.setVisible(false);
    overlay.setVisible(false);
    overlay.setTitle(QStringLiteral("New title"));
    overlay.setTitle(QStringLiteral("New title"));
    overlay.setSubtitle(QStringLiteral("New subtitle"));
    HS_CHECK(!overlay.isVisible());
    HS_CHECK(overlay.titleStd() == "New title");
    HS_CHECK(overlay.subtitleStd() == "New subtitle");
    HS_CHECK(overlay.title() == QStringLiteral("New title"));
    HS_CHECK(overlay.subtitle() == QStringLiteral("New subtitle"));

    ConfidenceMonitorViewModel monitor;
    HS_CHECK(monitor.currentLyricLineStd().empty());
    HS_CHECK(monitor.nextLyricLineStd().empty());
    HS_CHECK(monitor.timerSecondsRemaining() == 0);
    HS_CHECK(monitor.clockTimeString() == QStringLiteral("10:30 AM"));
    monitor.setLyricLines("Current line", "Next line");
    HS_CHECK(monitor.currentLyricLineStd() == "Current line");
    HS_CHECK(monitor.nextLyricLineStd() == "Next line");
    monitor.setTimerSecondsRemaining(30);
    monitor.setTimerSecondsRemaining(30);
    HS_CHECK(monitor.timerSecondsRemaining() == 30);
}

void testJsonSyntaxHighlightingRules() {
    QTextDocument document;
    JsonSyntaxHighlighter highlighter(&document);
    document.setPlainText(QStringLiteral("{\"key\": \"value\", \"count\": 12, \"ok\": true, \"empty\": null}"));
    highlighter.rehighlight();
    const QTextBlock block = document.begin();
    const QString text = block.text();

    const auto key = formatAt(block, text.indexOf(QStringLiteral("key")));
    const auto value = formatAt(block, text.indexOf(QStringLiteral("value")));
    const auto number = formatAt(block, text.indexOf(QStringLiteral("12")));
    const auto boolean = formatAt(block, text.indexOf(QStringLiteral("true")));
    const auto nullValue = formatAt(block, text.indexOf(QStringLiteral("null")));
    HS_CHECK(key.foreground().color() == QColor(QStringLiteral("#9CDCFE")));
    HS_CHECK(value.foreground().color() == QColor(QStringLiteral("#CE9178")));
    HS_CHECK(number.foreground().color() == QColor(QStringLiteral("#B5CEA8")));
    HS_CHECK(boolean.foreground().color() == QColor(QStringLiteral("#569CD6")));
    HS_CHECK(nullValue.foreground().color() == QColor(QStringLiteral("#569CD6")));
}
} // namespace

int main() {
    int argc = 0;
    char* argv[] = {nullptr};
    QCoreApplication app(argc, argv);
    testSlideDisplay();
    testPresentationWindow();
    testOverlayAndConfidenceMonitor();
    testJsonSyntaxHighlightingRules();
    return 0;
}
