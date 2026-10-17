#include "AudioFxViewModel.hpp"
#include "AudioMixerViewModel.hpp"
#include "test_check.hpp"

#include <memory>
#include <string>
#include <vector>

using HarmonySync::Core::MediaStem;
using HarmonySync::Media::AudioDynamicsCompressor;
using HarmonySync::Media::AudioEngine;
using HarmonySync::Media::MultiBandEqualizer;
using HarmonySync::ViewModels::AudioFxViewModel;
using HarmonySync::ViewModels::AudioMixerViewModel;

namespace {
std::string stemName(const AudioMixerViewModel& vm, int index) {
#ifdef HARMONYSYNC_QT_AVAILABLE
    return vm.stemName(index).toStdString();
#else
    return vm.stemName(index);
#endif
}

std::string activeVideo(const AudioMixerViewModel& vm) {
#ifdef HARMONYSYNC_QT_AVAILABLE
    return vm.activeBackgroundVideo().toStdString();
#else
    return vm.activeBackgroundVideo();
#endif
}

void testAudioFxViewModel() {
    auto eq = std::make_shared<MultiBandEqualizer>();
    auto compressor = std::make_shared<AudioDynamicsCompressor>();
    AudioFxViewModel vm(eq, compressor);

    HS_CHECK(vm.isEqEnabled());
    HS_CHECK(vm.isCompressorEnabled());
    HS_CHECK(vm.thresholdDb() == -12.0f);
    HS_CHECK(vm.ratio() == 4.0f);

    vm.setEqEnabled(false);
    vm.setEqEnabled(false); // unchanged values are a no-op
    vm.setCompressorEnabled(false);
    vm.setCompressorEnabled(false);
    HS_CHECK(!vm.isEqEnabled());
    HS_CHECK(!vm.isCompressorEnabled());
    vm.setEqEnabled(true);
    vm.setCompressorEnabled(true);

    vm.setThresholdDb(-24.0f);
    vm.setThresholdDb(-24.0f);
    vm.setRatio(6.0f);
    vm.setRatio(6.0f);
    HS_CHECK(vm.thresholdDb() == -24.0f);
    HS_CHECK(vm.ratio() == 6.0f);

    for (int band = 0; band < 5; ++band) {
        const float gain = static_cast<float>(band) - 2.0f;
        vm.setEqBandGain(band, gain);
        HS_CHECK(vm.eqBandGain(band) == gain);
    }
    vm.setEqBandGain(-1, 9.0f);
    vm.setEqBandGain(5, 9.0f);
    HS_CHECK(vm.eqBandGain(-1) == 0.0f);
    HS_CHECK(vm.eqBandGain(5) == 0.0f);

    AudioFxViewModel defaults;
    HS_CHECK(defaults.isEqEnabled());
    HS_CHECK(defaults.isCompressorEnabled());
    defaults.setEqEnabled(false);
    defaults.setCompressorEnabled(false);
    HS_CHECK(!defaults.isEqEnabled());
    HS_CHECK(!defaults.isCompressorEnabled());
}

void testAudioMixerViewModel() {
    auto engine = std::make_shared<AudioEngine>(nullptr);
    auto nextEngine = std::make_shared<AudioEngine>(nullptr);
    AudioMixerViewModel vm(engine, nextEngine);
    HS_CHECK(vm.masterVolume() == 1.0f);
    HS_CHECK(vm.pitchShiftSemitones() == 0);
    HS_CHECK(!vm.isPlaying());
    HS_CHECK(vm.loadedStemCount() == 0);
    HS_CHECK(vm.durationSeconds() == 0.0);
    HS_CHECK(vm.positionSeconds() == 0.0);
    HS_CHECK(stemName(vm, -1).empty());
    HS_CHECK(stemName(vm, 0).empty());
    HS_CHECK(vm.stemVolume(-1) == 1.0f);
    HS_CHECK(!vm.stemIsMuted(-1));
    HS_CHECK(!vm.stemIsSoloed(-1));

    vm.setMasterVolume(0.75f);
    vm.setMasterVolume(0.75f);
    vm.setPitchShiftSemitones(2);
    vm.setPitchShiftSemitones(2);
    HS_CHECK(vm.masterVolume() == 0.75f);
    HS_CHECK(vm.pitchShiftSemitones() == 2);

    const std::vector<MediaStem> stems{MediaStem("drums", "Drums", "missing-drums.wav"),
                                       MediaStem("keys", "Keys", "missing-keys.wav")};
    HS_CHECK(vm.loadSongStems(stems));
    HS_CHECK(vm.loadedStemCount() == 2);
    HS_CHECK(stemName(vm, 0) == "Drums");
    HS_CHECK(stemName(vm, 1) == "Keys");
    HS_CHECK(stemName(vm, 2).empty());

    vm.setStemVolume(1, 0.4f);
    HS_CHECK(vm.stemVolume(1) == 0.4f);
    vm.toggleStemMute(0);
    HS_CHECK(vm.stemIsMuted(0));
    vm.toggleStemMute(0);
    HS_CHECK(!vm.stemIsMuted(0));
    vm.toggleStemSolo(1);
    HS_CHECK(vm.stemIsSoloed(1));
    vm.toggleStemSolo(1);
    HS_CHECK(!vm.stemIsSoloed(1));
    vm.toggleStemMute(-1);
    vm.toggleStemSolo(2);

    vm.play();
    HS_CHECK(vm.isPlaying());
    vm.seek(0.25);
    vm.pause();
    HS_CHECK(!vm.isPlaying());
    vm.stop();
    HS_CHECK(!vm.isPlaying());

    vm.setCrossfadePosition(-1.0f);
    HS_CHECK(vm.crossfadePosition() == 0.0f);
    vm.setCrossfadePosition(0.5f);
    vm.setCrossfadePosition(0.5f);
    HS_CHECK(vm.crossfadePosition() == 0.5f);
    vm.setCrossfadePosition(2.0f);
    HS_CHECK(vm.crossfadePosition() == 1.0f);
    HS_CHECK(!vm.isBackgroundVideoLooping());
    HS_CHECK(vm.shouldAutoFadeOutVideo());
    vm.setBackgroundVideoLooping(true);
    vm.setBackgroundVideoLooping(true);
    HS_CHECK(vm.isBackgroundVideoLooping());
    HS_CHECK(!vm.shouldAutoFadeOutVideo());
    vm.setNextBackgroundVideoLooping(false);
    vm.loadNextBackgroundVideo(
#ifdef HARMONYSYNC_QT_AVAILABLE
        QStringLiteral("next.mp4")
#else
        "next.mp4"
#endif
    );
    vm.setActiveBackgroundVideo(
#ifdef HARMONYSYNC_QT_AVAILABLE
        QStringLiteral("current.mp4")
#else
        "current.mp4"
#endif
    );
    vm.setActiveBackgroundVideo(
#ifdef HARMONYSYNC_QT_AVAILABLE
        QStringLiteral("current.mp4")
#else
        "current.mp4"
#endif
    );
    vm.finalizeCrossfade();
    HS_CHECK(vm.crossfadePosition() == 0.0f);
    HS_CHECK(activeVideo(vm) == "next.mp4");
    HS_CHECK(!vm.isBackgroundVideoLooping());
    HS_CHECK(vm.shouldAutoFadeOutVideo());

    HS_CHECK(!vm.isPreloadedSong({}));
    HS_CHECK(!vm.isPreloadedSong(stems));
    vm.preloadNextSong({});
    vm.clearPreloadedSong();
    vm.clearPreloadedSongKeepingPendingAdvance();
    HS_CHECK(vm.loadNextSongStems({MediaStem("next", "Next", "next.wav")}));
    HS_CHECK(vm.loadedStemCount() == 1);
    vm.unloadCurrentSong();
    HS_CHECK(vm.loadedStemCount() == 0);
    HS_CHECK(!vm.isPlaying());
}
} // namespace

int main() {
    testAudioFxViewModel();
    testAudioMixerViewModel();
    return 0;
}
