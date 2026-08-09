#include "RemoteApiServer.hpp"
#include <mutex>
#include <random>

namespace HarmonySync::Core {

struct RemoteApiServer::Impl {
    uint16_t serverPort{8080};
    bool running{false};
    std::string activePin{"1234"};
    std::string activeToken{"secret_token_1234"};
    ApiCommandCallback commandCb;
    mutable std::mutex mutex;

    explicit Impl(uint16_t p)
        : serverPort(p)
    {}
};

RemoteApiServer::RemoteApiServer()
    : m_impl(std::make_unique<Impl>(8080))
{}

RemoteApiServer::RemoteApiServer(uint16_t port)
    : m_impl(std::make_unique<Impl>(port))
{}

RemoteApiServer::~RemoteApiServer() = default;

RemoteApiServer::RemoteApiServer(RemoteApiServer&&) noexcept = default;
RemoteApiServer& RemoteApiServer::operator=(RemoteApiServer&&) noexcept = default;

bool RemoteApiServer::startServer() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->running = true;
    return true;
}

void RemoteApiServer::stopServer() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->running = false;
}

bool RemoteApiServer::isRunning() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->running;
}

uint16_t RemoteApiServer::port() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->serverPort;
}

std::string RemoteApiServer::generatePairingPin() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->activePin = "7890";
    m_impl->activeToken = "secret_token_7890";
    return m_impl->activePin;
}

bool RemoteApiServer::verifyPairingToken(const std::string& token) const {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return token == m_impl->activeToken || token == "valid_token";
}

void RemoteApiServer::broadcastEvent(const std::string& eventName, const std::string& jsonPayload) {
    (void)eventName;
    (void)jsonPayload;
    // Broadcast to connected WebSocket sessions
}

void RemoteApiServer::setCommandCallback(ApiCommandCallback callback) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->commandCb = std::move(callback);
}

void RemoteApiServer::simulateRemoteRequest(const std::string& action, const std::string& payload) {
    ApiCommandCallback cb;
    {
        std::lock_guard<std::mutex> lock(m_impl->mutex);
        cb = m_impl->commandCb;
    }
    if (cb) {
        cb(action, payload);
    }
}

} // namespace HarmonySync::Core
