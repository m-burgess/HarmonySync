#include "MidiMappingViewModel.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct MidiMappingViewModel::Impl {
    std::shared_ptr<Media::MidiHardwareDevice> device;
    std::unordered_map<std::string, MidiTargetBinding> bindings;
    std::string activeLearnTarget;
    bool isLearning{false};

    explicit Impl(std::shared_ptr<Media::MidiHardwareDevice> dev)
        : device(std::move(dev)) {
        if (!device) {
            device = std::make_shared<Media::MidiHardwareDevice>();
        }
    }
};

MidiMappingViewModel::MidiMappingViewModel(std::shared_ptr<Media::MidiHardwareDevice> device)
    : m_impl(std::make_unique<Impl>(std::move(device))) {
    m_impl->device->setMidiCallback([this](const Media::MidiMessage& msg) {
        if (m_impl->isLearning && !m_impl->activeLearnTarget.empty()) {
            bindControl(
#ifdef HARMONYSYNC_QT_AVAILABLE
                QString::fromStdString(m_impl->activeLearnTarget),
#else
                m_impl->activeLearnTarget,
#endif
                msg.controlNumber, msg.channel, msg.type == Media::MidiMessageType::ControlChange);
            cancelMidiLearn();
        }
    });
}

MidiMappingViewModel::~MidiMappingViewModel() = default;

bool MidiMappingViewModel::isConnected() const noexcept {
    return m_impl->device->isConnected();
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString MidiMappingViewModel::connectedPortName() const {
    return QString::fromStdString(m_impl->device->connectedPortName());
}

QString MidiMappingViewModel::activeLearnTarget() const {
    return QString::fromStdString(m_impl->activeLearnTarget);
}
#else
std::string MidiMappingViewModel::connectedPortName() const {
    return m_impl->device->connectedPortName();
}

std::string MidiMappingViewModel::activeLearnTarget() const {
    return m_impl->activeLearnTarget;
}
#endif

std::string MidiMappingViewModel::connectedPortNameStd() const {
    return m_impl->device->connectedPortName();
}

std::string MidiMappingViewModel::activeLearnTargetStd() const {
    return m_impl->activeLearnTarget;
}

bool MidiMappingViewModel::isLearning() const noexcept {
    return m_impl->isLearning;
}

std::vector<std::string> MidiMappingViewModel::availablePorts() const {
    return m_impl->device->availablePorts();
}

#ifdef HARMONYSYNC_QT_AVAILABLE
bool MidiMappingViewModel::connectPort(const QString& portName) {
    bool ok = m_impl->device->connectPort(portName.toStdString());
    if (ok) {
        emit connectionStateChanged();
    }
    return ok;
}

void MidiMappingViewModel::disconnectPort() {
    m_impl->device->disconnectPort();
    emit connectionStateChanged();
}

void MidiMappingViewModel::startMidiLearn(const QString& targetAction) {
    m_impl->activeLearnTarget = targetAction.toStdString();
    m_impl->isLearning = true;
    emit learnStateChanged();
}

void MidiMappingViewModel::cancelMidiLearn() {
    m_impl->activeLearnTarget.clear();
    m_impl->isLearning = false;
    emit learnStateChanged();
}

void MidiMappingViewModel::bindControl(const QString& targetAction, int controlNumber, int channel, bool isCC) {
    std::string key = targetAction.toStdString();
    MidiTargetBinding binding;
    binding.targetAction = key;
    binding.controlNumber = static_cast<uint8_t>(controlNumber);
    binding.channel = static_cast<uint8_t>(channel);
    binding.isCC = isCC;
    m_impl->bindings[key] = binding;
}

void MidiMappingViewModel::clearBinding(const QString& targetAction) {
    m_impl->bindings.erase(targetAction.toStdString());
}

QString MidiMappingViewModel::saveProfileJson() const {
    return QString::fromStdString(saveProfileJsonStd());
}

bool MidiMappingViewModel::loadProfileJson(const QString& jsonString) {
    return loadProfileJsonStd(jsonString.toStdString());
}

#else

bool MidiMappingViewModel::connectPort(const std::string& portName) {
    return m_impl->device->connectPort(portName);
}

void MidiMappingViewModel::disconnectPort() {
    m_impl->device->disconnectPort();
}

void MidiMappingViewModel::startMidiLearn(const std::string& targetAction) {
    m_impl->activeLearnTarget = targetAction;
    m_impl->isLearning = true;
}

void MidiMappingViewModel::cancelMidiLearn() {
    m_impl->activeLearnTarget.clear();
    m_impl->isLearning = false;
}

void MidiMappingViewModel::bindControl(const std::string& targetAction, int controlNumber, int channel, bool isCC) {
    MidiTargetBinding binding;
    binding.targetAction = targetAction;
    binding.controlNumber = static_cast<uint8_t>(controlNumber);
    binding.channel = static_cast<uint8_t>(channel);
    binding.isCC = isCC;
    m_impl->bindings[targetAction] = binding;
}

void MidiMappingViewModel::clearBinding(const std::string& targetAction) {
    m_impl->bindings.erase(targetAction);
}

std::string MidiMappingViewModel::saveProfileJson() const {
    return saveProfileJsonStd();
}

bool MidiMappingViewModel::loadProfileJson(const std::string& jsonString) {
    return loadProfileJsonStd(jsonString);
}

#endif

std::string MidiMappingViewModel::saveProfileJsonStd() const {
    std::string json = "{\n  \"profile\": \"Korg nanoKONTROL2\",\n  \"bindings\": [\n";
    bool first = true;
    for (const auto& [key, binding] : m_impl->bindings) {
        if (!first) {
            json += ",\n";
        }
        first = false;
        json += "    {\"action\": \"" + binding.targetAction +
                "\", \"control\": " + std::to_string(binding.controlNumber) +
                ", \"channel\": " + std::to_string(binding.channel) + "}";
    }
    json += "\n  ]\n}";
    return json;
}

bool MidiMappingViewModel::loadProfileJsonStd(const std::string& jsonString) {
    return !jsonString.empty();
}

const MidiTargetBinding* MidiMappingViewModel::getBindingForTarget(const std::string& targetAction) const {
    auto it = m_impl->bindings.find(targetAction);
    if (it != m_impl->bindings.end()) {
        return &it->second;
    }
    return nullptr;
}

} // namespace HarmonySync::ViewModels
