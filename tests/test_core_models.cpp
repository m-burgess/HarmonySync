#include "AppSettings.hpp"
#include "MediaStem.hpp"
#include "ServiceOrder.hpp"
#include "SlideItem.hpp"
#include "SongMap.hpp"
#include "test_check.hpp"

#include <iostream>
#include <utility>

using namespace HarmonySync::Core;

namespace {

void testMediaStemDefaults() {
    MediaStem stem;
    HS_CHECK(stem.id().empty());
    HS_CHECK(stem.name().empty());
    HS_CHECK(stem.filePath().empty());
    HS_CHECK(stem.volume() == 1.0f);
    HS_CHECK(stem.pan() == 0.0f);
    HS_CHECK(!stem.isMuted());
    HS_CHECK(!stem.isSolo());
    HS_CHECK(stem.pitchShiftSemitones() == 0);
}

void testMediaStemClampsVolumeAndPan() {
    MediaStem stem("id", "Bass", "/bass.wav");
    stem.setVolume(2.5f);
    HS_CHECK(stem.volume() == 1.0f);
    stem.setVolume(-1.0f);
    HS_CHECK(stem.volume() == 0.0f);
    stem.setVolume(0.5f);
    HS_CHECK(stem.volume() == 0.5f);

    stem.setPan(-3.0f);
    HS_CHECK(stem.pan() == -1.0f);
    stem.setPan(3.0f);
    HS_CHECK(stem.pan() == 1.0f);
    stem.setPan(0.25f);
    HS_CHECK(stem.pan() == 0.25f);
}

void testMediaStemMutators() {
    MediaStem stem("id", "Keys", "/keys.wav");
    stem.setMuted(true);
    stem.setSolo(true);
    stem.setPitchShiftSemitones(3);
    HS_CHECK(stem.isMuted());
    HS_CHECK(stem.isSolo());
    HS_CHECK(stem.pitchShiftSemitones() == 3);
    stem.setMuted(false);
    stem.setSolo(false);
    HS_CHECK(!stem.isMuted());
    HS_CHECK(!stem.isSolo());
}

void testMediaStemCopyAndMove() {
    MediaStem original("id", "Drums", "/drums.wav");
    original.setVolume(0.4f);
    original.setPan(-0.5f);

    MediaStem copy(original);
    original.setVolume(0.9f);
    HS_CHECK(copy.volume() == 0.4f);
    HS_CHECK(copy.pan() == -0.5f);
    HS_CHECK(copy.name() == "Drums");

    MediaStem assigned;
    assigned = original;
    HS_CHECK(assigned.volume() == 0.9f);

    MediaStem& self = assigned;
    assigned = self;
    HS_CHECK(assigned.volume() == 0.9f);

    MediaStem moved(std::move(copy));
    HS_CHECK(moved.id() == "id");
    HS_CHECK(moved.volume() == 0.4f);

    MediaStem moveAssigned;
    moveAssigned = std::move(moved);
    HS_CHECK(moveAssigned.name() == "Drums");
}

void testSlideItemDefaultsAndAccessors() {
    SlideItem blank;
    HS_CHECK(blank.id().empty());
    HS_CHECK(blank.title().empty());
    HS_CHECK(blank.type() == SlideType::Unknown);
    HS_CHECK(blank.contentPath().empty());
    HS_CHECK(blank.thumbnailPath().empty());
    HS_CHECK(!blank.loopImages());
    HS_CHECK(blank.autoplayBackgroundVideo());

    SlideItem slide("s1", "Welcome", SlideType::Image);
    HS_CHECK(slide.id() == "s1");
    HS_CHECK(slide.title() == "Welcome");
    HS_CHECK(slide.type() == SlideType::Image);

    slide.setContentPath("/img/a.png");
    slide.setThumbnailPath("/img/a_thumb.png");
    slide.setLoopImages(true);
    slide.setAutoplayBackgroundVideo(false);
    HS_CHECK(slide.contentPath() == "/img/a.png");
    HS_CHECK(slide.thumbnailPath() == "/img/a_thumb.png");
    HS_CHECK(slide.loopImages());
    HS_CHECK(!slide.autoplayBackgroundVideo());
}

void testSlideItemCopyAndMove() {
    SlideItem original("s1", "Intro", SlideType::Video);
    original.setContentPath("/v.mp4");

    SlideItem copy(original);
    original.setContentPath("/other.mp4");
    HS_CHECK(copy.contentPath() == "/v.mp4");

    SlideItem assigned;
    assigned = original;
    HS_CHECK(assigned.contentPath() == "/other.mp4");

    SlideItem& self = assigned;
    assigned = self;
    HS_CHECK(assigned.title() == "Intro");

    SlideItem moved(std::move(copy));
    HS_CHECK(moved.type() == SlideType::Video);

    SlideItem moveAssigned;
    moveAssigned = std::move(moved);
    HS_CHECK(moveAssigned.contentPath() == "/v.mp4");
}

void testSongMapDefaults() {
    SongMap song;
    HS_CHECK(song.id().empty());
    HS_CHECK(song.title().empty());
    HS_CHECK(song.artist().empty());
    HS_CHECK(song.originalKey() == "C");
    HS_CHECK(song.currentKey() == "C");
    HS_CHECK(song.timing() == "4/4");
    HS_CHECK(song.length() == "0:00");
    HS_CHECK(song.lyricsURL().empty());
    HS_CHECK(song.tempoBpm() == 120.0);
    HS_CHECK(song.stems().empty());
    HS_CHECK(song.sections().empty());
    HS_CHECK(song.lyricsContent().empty());
    HS_CHECK(song.timedLyrics().empty());
    HS_CHECK(!song.hasSongMap());
    HS_CHECK(song.folderPath().empty());
    HS_CHECK(song.backgroundVideoPath().empty());
}

void testSongMapMutators() {
    SongMap song("id", "Title", "Artist");
    song.setKeys("D", "E");
    song.setTempoBpm(90.0);
    song.setTiming("6/8");
    song.setLength("4:05");
    song.setLyricsURL("https://example.test/lyrics");
    song.setLyricsContent("la la la");
    song.setHasSongMap(true);
    song.setFolderPath("/songs/title");
    song.setBackgroundVideoPath("/songs/title/bg.mp4");

    HS_CHECK(song.originalKey() == "D");
    HS_CHECK(song.currentKey() == "E");
    HS_CHECK(song.tempoBpm() == 90.0);
    HS_CHECK(song.timing() == "6/8");
    HS_CHECK(song.length() == "4:05");
    HS_CHECK(song.lyricsURL() == "https://example.test/lyrics");
    HS_CHECK(song.lyricsContent() == "la la la");
    HS_CHECK(song.hasSongMap());
    HS_CHECK(song.folderPath() == "/songs/title");
    HS_CHECK(song.backgroundVideoPath() == "/songs/title/bg.mp4");
}

void testSongMapSectionsTimedLyricsAndStems() {
    SongMap song("id", "Title", "Artist");

    SongSection verse;
    verse.name = "Verse 1";
    verse.chords = "G C D";
    verse.lines.push_back(SongLine{"First line", 1.5, "60", "61"});
    song.setSections({verse});
    HS_CHECK(song.sections().size() == 1);
    HS_CHECK(song.sections()[0].name == "Verse 1");
    HS_CHECK(song.sections()[0].lines[0].timestampSeconds == 1.5);
    HS_CHECK(song.sections()[0].lines[0].nextSlideMidiNote == "60");
    HS_CHECK(song.sections()[0].lines[0].lightSceneMidiNote == "61");

    song.setTimedLyrics({TimedLyricLine{2.0, "hello"}, TimedLyricLine{4.0, "world"}});
    HS_CHECK(song.timedLyrics().size() == 2);
    HS_CHECK(song.timedLyrics()[1].text == "world");

    song.addStem(MediaStem("a", "A", "/a.wav"));
    song.addStem(MediaStem("b", "B", "/b.wav"));
    HS_CHECK(song.stems().size() == 2);
    song.clearStems();
    HS_CHECK(song.stems().empty());
}

void testSongMapCopyAndMove() {
    SongMap original("id", "Title", "Artist");
    original.addStem(MediaStem("a", "A", "/a.wav"));

    SongMap copy(original);
    original.clearStems();
    HS_CHECK(copy.stems().size() == 1);

    SongMap assigned;
    assigned = copy;
    HS_CHECK(assigned.stems().size() == 1);

    SongMap& self = assigned;
    assigned = self;
    HS_CHECK(assigned.title() == "Title");

    SongMap moved(std::move(copy));
    HS_CHECK(moved.stems().size() == 1);

    SongMap moveAssigned;
    moveAssigned = std::move(moved);
    HS_CHECK(moveAssigned.artist() == "Artist");
}

void testServiceOrderDefaultsAndMetadata() {
    ServiceOrder order;
    HS_CHECK(order.id().empty());
    HS_CHECK(order.title().empty());
    HS_CHECK(order.dateString().empty());
    HS_CHECK(order.playlistUrl().empty());
    HS_CHECK(order.songs().empty());
    HS_CHECK(order.slides().empty());

    order.setTitle("Evening");
    order.setDateString("2026-09-01");
    order.setPlaylistUrl("https://example.test/playlist");
    HS_CHECK(order.title() == "Evening");
    HS_CHECK(order.dateString() == "2026-09-01");
    HS_CHECK(order.playlistUrl() == "https://example.test/playlist");
}

void testServiceOrderSongEditingBounds() {
    ServiceOrder order("id", "Title", "2026-09-01");
    order.addSong(SongMap("s1", "One", "A"));
    order.addSong(SongMap("s2", "Two", "B"));

    order.updateSongAt(1, SongMap("s2b", "Two Updated", "B"));
    HS_CHECK(order.songs()[1].title() == "Two Updated");

    // Out-of-range indices are ignored.
    order.updateSongAt(5, SongMap("x", "Ignored", "X"));
    order.removeSongAt(5);
    HS_CHECK(order.songs().size() == 2);

    order.removeSongAt(0);
    HS_CHECK(order.songs().size() == 1);
    HS_CHECK(order.songs()[0].id() == "s2b");
}

void testServiceOrderSlidesAndClear() {
    ServiceOrder order("id", "Title", "2026-09-01");
    order.addSong(SongMap("s1", "One", "A"));
    order.addSlide(SlideItem("sl1", "Slide", SlideType::Header));
    HS_CHECK(order.slides().size() == 1);
    HS_CHECK(order.slides()[0].title() == "Slide");

    order.clearAll();
    HS_CHECK(order.songs().empty());
    HS_CHECK(order.slides().empty());
    HS_CHECK(order.title() == "Title");
}

void testServiceOrderCopyAndMove() {
    ServiceOrder original("id", "Title", "2026-09-01");
    original.addSong(SongMap("s1", "One", "A"));

    ServiceOrder copy(original);
    original.clearAll();
    HS_CHECK(copy.songs().size() == 1);

    ServiceOrder assigned;
    assigned = copy;
    HS_CHECK(assigned.songs().size() == 1);

    ServiceOrder& self = assigned;
    assigned = self;
    HS_CHECK(assigned.title() == "Title");

    ServiceOrder moved(std::move(copy));
    HS_CHECK(moved.songs().size() == 1);

    ServiceOrder moveAssigned;
    moveAssigned = std::move(moved);
    HS_CHECK(moveAssigned.id() == "id");
}

void testAppSettingsDefaultsAndMutators() {
    AppSettings settings;
    HS_CHECK(settings.presentationDisplayIndex() == 1);
    HS_CHECK(settings.confidenceDisplayIndex() == 2);
    HS_CHECK(settings.resolutionWidth() == 1920);
    HS_CHECK(settings.resolutionHeight() == 1080);
    HS_CHECK(settings.lyricsFontSize() == 48);
    HS_CHECK(settings.lowerThirdFontSize() == 26);
    HS_CHECK(settings.fontFamily() == "Inter");
    HS_CHECK(settings.textColorHex() == "#FFFFFF");
    HS_CHECK(settings.verticalAlignment() == TextVerticalAlignment::Bottom);
    HS_CHECK(settings.horizontalAlignment() == TextHorizontalAlignment::Center);
    HS_CHECK(settings.marginOffsetX() == 0);
    HS_CHECK(settings.marginOffsetY() == 40);

    settings.setPresentationDisplayIndex(3);
    settings.setConfidenceDisplayIndex(4);
    settings.setResolution(1280, 720);
    settings.setLyricsFontSize(64);
    settings.setLowerThirdFontSize(30);
    settings.setFontFamily("Roboto");
    settings.setTextColorHex("#00FF00");
    settings.setVerticalAlignment(TextVerticalAlignment::Top);
    settings.setHorizontalAlignment(TextHorizontalAlignment::Right);
    settings.setMarginOffsetX(7);
    settings.setMarginOffsetY(9);

    HS_CHECK(settings.presentationDisplayIndex() == 3);
    HS_CHECK(settings.lyricsFontSize() == 64);
    HS_CHECK(settings.fontFamily() == "Roboto");
    HS_CHECK(settings.verticalAlignment() == TextVerticalAlignment::Top);
    HS_CHECK(settings.confidenceDisplayIndex() == 4);
    HS_CHECK(settings.resolutionWidth() == 1280);
    HS_CHECK(settings.resolutionHeight() == 720);
    HS_CHECK(settings.lowerThirdFontSize() == 30);
    HS_CHECK(settings.textColorHex() == "#00FF00");
    HS_CHECK(settings.horizontalAlignment() == TextHorizontalAlignment::Right);
    HS_CHECK(settings.marginOffsetX() == 7);
    HS_CHECK(settings.marginOffsetY() == 9);

    settings.resetToDefaults();
    HS_CHECK(settings.resolutionWidth() == 1920);
    HS_CHECK(settings.textColorHex() == "#FFFFFF");
    HS_CHECK(settings.marginOffsetY() == 40);
}

void testAppSettingsCopyAndMove() {
    AppSettings original;
    original.setLyricsFontSize(70);

    AppSettings copy(original);
    original.setLyricsFontSize(10);
    HS_CHECK(copy.lyricsFontSize() == 70);

    AppSettings assigned;
    assigned = original;
    HS_CHECK(assigned.lyricsFontSize() == 10);

    AppSettings& self = assigned;
    assigned = self;
    HS_CHECK(assigned.lyricsFontSize() == 10);

    AppSettings moved(std::move(copy));
    HS_CHECK(moved.lyricsFontSize() == 70);

    AppSettings moveAssigned;
    moveAssigned = std::move(moved);
    HS_CHECK(moveAssigned.lyricsFontSize() == 70);
}

} // namespace

int main() {
    testMediaStemDefaults();
    testMediaStemClampsVolumeAndPan();
    testMediaStemMutators();
    testMediaStemCopyAndMove();
    testSlideItemDefaultsAndAccessors();
    testSlideItemCopyAndMove();
    testSongMapDefaults();
    testSongMapMutators();
    testSongMapSectionsTimedLyricsAndStems();
    testSongMapCopyAndMove();
    testServiceOrderDefaultsAndMetadata();
    testServiceOrderSongEditingBounds();
    testServiceOrderSlidesAndClear();
    testServiceOrderCopyAndMove();
    testAppSettingsDefaultsAndMutators();
    testAppSettingsCopyAndMove();
    std::cout << "ALL CORE MODEL COVERAGE TESTS PASSED" << std::endl;
    return EXIT_SUCCESS;
}
