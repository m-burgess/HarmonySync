// #177: the sink must keep pulling audio while the GUI/main thread is blocked.
//
// Needs a real audio output (e.g. a PulseAudio null sink:
//   pactl load-module module-null-sink sink_name=qa_sink && pactl set-default-sink qa_sink).
// With no audio device it prints SKIP and exits 0, so CI without sound stays green.
#include "AudioEngine.hpp"
#ifdef HARMONYSYNC_HAS_QT
#include <QCoreApplication>
#endif
#include <cassert>
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

using namespace HarmonySync::Core;
using namespace HarmonySync::Media;
using namespace std::chrono_literals;

namespace {

/// Writes a 16-bit stereo 44.1kHz WAV of `seconds` and returns its path.
std::string writeWav(const std::filesystem::path& path, std::uint32_t seconds) {
    const std::uint16_t channels = 2, bits = 16, pcm = 1, blockAlign = 4;
    const std::uint32_t rate = 44100, frames = seconds * rate, dataSize = frames * blockAlign;
    const std::uint32_t byteRate = rate * blockAlign, riffSize = 36 + dataSize, fmtSize = 16;
    std::ofstream out(path, std::ios::binary);
    auto put = [&out](const auto& v) { out.write(reinterpret_cast<const char*>(&v), sizeof(v)); };
    out.write("RIFF", 4); put(riffSize); out.write("WAVE", 4);
    out.write("fmt ", 4); put(fmtSize); put(pcm); put(channels); put(rate);
    put(byteRate); put(blockAlign); put(bits);
    out.write("data", 4); put(dataSize);
    std::vector<std::int16_t> samples(static_cast<std::size_t>(frames) * channels);
    for (std::size_t i = 0; i < samples.size(); ++i) {
        samples[i] = static_cast<std::int16_t>((i % 100) * 50); // quiet click-like ramp
    }
    out.write(reinterpret_cast<const char*>(samples.data()),
              static_cast<std::streamsize>(samples.size() * sizeof(std::int16_t)));
    return path.string();
}

} // namespace

int main(int argc, char** argv) {
#ifdef HARMONYSYNC_HAS_QT
    // Like the app: an application object on the main thread, whose event loop we then block.
    QCoreApplication app(argc, argv);
#else
    (void)argc;
    (void)argv;
    std::cout << "SKIP test_audio_thread: built without Qt." << std::endl;
    return EXIT_SUCCESS;
#endif

    const auto dir = std::filesystem::temp_directory_path() / "harmonysync_test_audio_thread";
    std::filesystem::create_directories(dir);
    int result = EXIT_SUCCESS;
    {
        AudioEngine engine;
        if (!engine.hasAudioOutputForTesting()) {
            std::cout << "SKIP test_audio_thread: no audio output device available." << std::endl;
            std::filesystem::remove_all(dir);
            return EXIT_SUCCESS;
        }

        std::cout << "[TEST] Running testAudioKeepsFlowingWhileMainThreadIsBlocked..." << std::endl;
        assert(engine.loadStems({MediaStem("c1", "Click", writeWav(dir / "click.wav", 10))}));
        engine.play();
        assert(engine.isPlaying());

        // Wait for steady pulling first: a PulseAudio stream can take ~2s to start asking for
        // data. Events are processed here so a sink owned by the main thread gets a fair start.
        const auto settleDeadline = std::chrono::steady_clock::now() + 6s;
        while (engine.audioCallbackCountForTesting() < 8
               && std::chrono::steady_clock::now() < settleDeadline) {
            QCoreApplication::processEvents();
            std::this_thread::sleep_for(5ms);
        }
        std::cout << "  readData() calls before the block: " << engine.audioCallbackCountForTesting()
                  << std::endl;

        // Now block the main thread for 2s without processing events, as a slow folder scan
        // or autosave on the GUI thread would.
        const std::uint64_t before = engine.audioCallbackCountForTesting();
        std::this_thread::sleep_for(2s);
        const std::uint64_t after = engine.audioCallbackCountForTesting();
        const std::thread::id callbackThread = engine.audioCallbackThreadForTesting();

        std::cout << "  readData() calls during the 2s block: " << (after - before)
                  << " (total " << after << "), on main thread: "
                  << (callbackThread == std::this_thread::get_id() ? "yes" : "no") << std::endl;

        // Steady state is ~12 pulls/s of ~93ms each; 2s of audio needs well over 10.
        if (after - before < 10) {
            std::cerr << "FAIL: the sink stopped pulling audio while the main thread was blocked."
                      << std::endl;
            result = EXIT_FAILURE;
        } else if (callbackThread == std::this_thread::get_id()) {
            std::cerr << "FAIL: readData() ran on the main thread." << std::endl;
            result = EXIT_FAILURE;
        } else {
            assert(engine.isPlaying());
            std::cout << "[PASS] testAudioKeepsFlowingWhileMainThreadIsBlocked passed." << std::endl;
        }
        engine.stop();
    }
    std::filesystem::remove_all(dir);
    return result;
}
