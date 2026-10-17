#include "AudioSink.hpp"

#include <QAudioDevice>
#include <QAudioFormat>
#include <QAudioSink>
#include <QIODevice>
#include <QMediaDevices>
#include <iostream>

namespace HarmonySync::Media {

namespace {

// Forwards QAudioSink pulls to the source.
class PcmSourceDevice final : public QIODevice {
public:
    PcmSourceDevice() { open(QIODevice::ReadOnly | QIODevice::Unbuffered); }

    void setSource(IPcmSource* source) { m_source = source; }

    bool isSequential() const override { return true; }

    bool seek(qint64 /*pos*/) override { return false; }

    qint64 bytesAvailable() const override { return static_cast<qint64>(m_source->bytesAvailable()); }

protected:
    qint64 readData(char* data, qint64 maxlen) override {
        return static_cast<qint64>(m_source->read(data, static_cast<std::size_t>(maxlen)));
    }

    qint64 writeData(const char* /*data*/, qint64 /*len*/) override { return 0; }

private:
    IPcmSource* m_source = nullptr;
};

class QtAudioSink final : public IAudioSink {
public:
    QtAudioSink(const QAudioDevice& device, const QAudioFormat& format)
        : m_sink(device, format) {
        m_sink.setBufferSize(std::size_t{44100} * 2 * sizeof(float) / 10); // ~100ms buffer
    }

    void start(IPcmSource& source) override {
        m_device.setSource(&source);
        m_sink.start(&m_device);
    }

    void stop() override { m_sink.stop(); }

    bool isRunning() const override { return m_sink.state() != QAudio::StoppedState; }

    bool isActive() const override { return m_sink.state() == QAudio::ActiveState; }

private:
    PcmSourceDevice m_device;
    QAudioSink m_sink;
};

} // namespace

std::unique_ptr<IAudioSink> createQtAudioSink() {
    QAudioFormat format;
    format.setSampleRate(44100);
    format.setChannelCount(2);
    format.setSampleFormat(QAudioFormat::Int16);

    const QAudioDevice device = QMediaDevices::defaultAudioOutput();
    if (!device.isFormatSupported(format)) {
        std::cerr << "Warning: Audio format not supported!\n";
        return nullptr;
    }
    return std::make_unique<QtAudioSink>(device, format);
}

} // namespace HarmonySync::Media
