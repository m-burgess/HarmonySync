#include "NdiVideoOutputService.hpp"
#include <mutex>
#include <utility>
#include <limits>

namespace HarmonySync::Media {

struct NdiVideoOutputService::Impl {
    std::string name{"HarmonySync Program Out"};
    bool streaming{false};
    int width{1920};
    int height{1080};
    mutable std::mutex mutex;
    std::unique_ptr<INdiSender> sender;

    Impl(std::string sName, std::unique_ptr<INdiSender> output)
        : name(std::move(sName))
        , sender(std::move(output)) {}
    ~Impl() {
        if (streaming) {
            sender->stop();
        }
    }
    Impl(const Impl&) = delete;
    Impl& operator=(const Impl&) = delete;
};

NdiVideoOutputService::NdiVideoOutputService()
    : NdiVideoOutputService("HarmonySync Program Out") {}

NdiVideoOutputService::NdiVideoOutputService(const std::string& streamName)
    : NdiVideoOutputService(streamName, createOfflineNdiSender()) {}

NdiVideoOutputService::NdiVideoOutputService(const std::string& streamName, std::unique_ptr<INdiSender> sender)
    : m_impl(std::make_unique<Impl>(streamName, std::move(sender))) {}

NdiVideoOutputService::~NdiVideoOutputService() = default;

NdiVideoOutputService::NdiVideoOutputService(NdiVideoOutputService&&) noexcept = default;
NdiVideoOutputService& NdiVideoOutputService::operator=(NdiVideoOutputService&&) noexcept = default;

bool NdiVideoOutputService::startStreaming() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (!m_impl->streaming) {
        m_impl->streaming = m_impl->sender && m_impl->sender->start(m_impl->name);
    }
    return m_impl->streaming;
}

void NdiVideoOutputService::stopStreaming() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (m_impl->streaming) {
        m_impl->sender->stop();
    }
    m_impl->streaming = false;
}

bool NdiVideoOutputService::isStreaming() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->streaming;
}

std::string NdiVideoOutputService::streamName() const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->name;
}

void NdiVideoOutputService::setResolution(int width, int height) noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (width <= 0 || height <= 0) {
        return;
    }
    m_impl->width = width;
    m_impl->height = height;
}

std::pair<int, int> NdiVideoOutputService::resolution() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return {m_impl->width, m_impl->height};
}

void NdiVideoOutputService::sendFrame(const uint8_t* rgbaBuffer, size_t bufferSize) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (!m_impl->streaming || !rgbaBuffer) {
        return;
    }
    const auto width = static_cast<size_t>(m_impl->width);
    const auto height = static_cast<size_t>(m_impl->height);
    if (width > std::numeric_limits<size_t>::max() / 4 / height) {
        return;
    }
    const auto required = width * height * 4;
    if (bufferSize < required) {
        return;
    }
    m_impl->sender->send({rgbaBuffer, required}, m_impl->width, m_impl->height);
}

} // namespace HarmonySync::Media
