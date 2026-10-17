#ifndef HARMONYSYNC_MIDI_MAPPING_VIEWMODEL_HPP
#define HARMONYSYNC_MIDI_MAPPING_VIEWMODEL_HPP

#include "MidiHardwareDevice.hpp"
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

struct MidiTargetBinding {
    std::string targetAction; // e.g. "MasterVolume", "NextSlide", "Stem1Volume"
    uint8_t controlNumber{0};
    uint8_t channel{1};
    bool isCC{true};
};

/**
 * @brief ViewModel managing interactive MIDI learn mode, action bindings, and hardware profiles.
 */
class MidiMappingViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(bool isConnected READ isConnected NOTIFY connectionStateChanged)
    Q_PROPERTY(QString connectedPortName READ connectedPortName NOTIFY connectionStateChanged)
    Q_PROPERTY(bool isLearning READ isLearning NOTIFY learnStateChanged)
    Q_PROPERTY(QString activeLearnTarget READ activeLearnTarget NOTIFY learnStateChanged)
#endif

public:
    explicit MidiMappingViewModel(std::shared_ptr<Media::MidiHardwareDevice> device = nullptr);
#ifdef HARMONYSYNC_QT_AVAILABLE
    ~MidiMappingViewModel() override;
#else
    ~MidiMappingViewModel();
#endif

    MidiMappingViewModel(const MidiMappingViewModel&) = delete;
    MidiMappingViewModel& operator=(const MidiMappingViewModel&) = delete;

    // Accessors
    [[nodiscard]] bool isConnected() const noexcept;
#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString connectedPortName() const;
    [[nodiscard]] QString activeLearnTarget() const;
#else
    [[nodiscard]] std::string connectedPortName() const;
    [[nodiscard]] std::string activeLearnTarget() const;
#endif
    [[nodiscard]] std::string connectedPortNameStd() const;
    [[nodiscard]] std::string activeLearnTargetStd() const;

    [[nodiscard]] bool isLearning() const noexcept;
    [[nodiscard]] std::vector<std::string> availablePorts() const;

    // Commands
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_INVOKABLE bool connectPort(const QString& portName);
    Q_INVOKABLE void disconnectPort();
    Q_INVOKABLE void startMidiLearn(const QString& targetAction);
    Q_INVOKABLE void cancelMidiLearn();
    Q_INVOKABLE void bindControl(const QString& targetAction, int controlNumber, int channel = 1, bool isCC = true);
    Q_INVOKABLE void clearBinding(const QString& targetAction);
    Q_INVOKABLE QString saveProfileJson() const;
    Q_INVOKABLE bool loadProfileJson(const QString& jsonString);
#else
    bool connectPort(const std::string& portName);
    void disconnectPort();
    void startMidiLearn(const std::string& targetAction);
    void cancelMidiLearn();
    void bindControl(const std::string& targetAction, int controlNumber, int channel = 1, bool isCC = true);
    void clearBinding(const std::string& targetAction);
    std::string saveProfileJson() const;
    bool loadProfileJson(const std::string& jsonString);
#endif
    [[nodiscard]] std::string saveProfileJsonStd() const;
    bool loadProfileJsonStd(const std::string& jsonString);

    [[nodiscard]] const MidiTargetBinding* getBindingForTarget(const std::string& targetAction) const;

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void connectionStateChanged();
    void learnStateChanged();
    void controlTriggered(const QString& targetAction, float floatValue);
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_MIDI_MAPPING_VIEWMODEL_HPP
