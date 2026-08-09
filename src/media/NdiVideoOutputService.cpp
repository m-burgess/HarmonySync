#include "NdiVideoOutputService.hpp"
#include <mutex>
#include <utility>

namespace HarmonySync::Media {

struct NdiVideoOutputService::Impl {
    std::string name{"HarmonySync Program Out"};
    bool streaming{false};
    int width{1920};
    int height{1080};
    mutable std::mutex mutex;

    explicit Impl(std::string sName)
        : name(std::move(sName))
    {}
};

NdiVideoOutputService::NdiVideoOutputService()
    : m_impl(std::make_unique<Impl>("HarmonySync Program Out"))
{}

NdiVideoOutputService::NdiVideoOutputService(const std::string& streamName)
    : m_impl(std::make_unique<Impl>(streamName))
{}

NdiVideoOutputService::~NdiVideoOutputService() = default;

NdiVideoOutputService::NdiVideoOutputService(NdiVideoOutputService&&) noexcept = default;
NdiVideoOutputService& NdiVideoOutputService::operator=(NdiVideoOutputService&&) noexcept = default;

bool NdiVideoOutputService::startStreaming() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->streaming = true;
    return true;
}

void NdiVideoOutputService::stopStreaming() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
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
    m_impl->width = width;
    m_impl->height = height;
}

std::pair<int, int> NdiVideoOutputService::resolution() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return {m_impl->width, m_impl->height};
}

void NdiVideoOutputService::sendFrame(const uint8_t* rgbaBuffer, size_t bufferSize) {
    (void)rgbaBuffer;
    (void)bufferSize;
    // Send RGBA video frame to NDI output buffer
}

} // namespace HarmonySync::Media
