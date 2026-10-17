#ifndef HARMONYSYNC_REMOTE_API_SERVER_HPP
#define HARMONYSYNC_REMOTE_API_SERVER_HPP

#include "WebSocketTransport.hpp"
#include <cstdint>
#include <functional>
#include <memory>
#include <string>
#include <vector>

// main.cpp and the viewmodels key their Qt-only code off this macro, which they receive through this header.
#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::Core {

using ApiCommandCallback = std::function<void(const std::string& action, const std::string& payload)>;

/**
 * @brief Thread-safe embedded WebSocket server exposing push notifications and commands for mobile remote control.
 */
class RemoteApiServer {
public:
    /** @param transport Server transport; defaults to the Qt WebSocket server. */
    explicit RemoteApiServer(uint16_t port = 8080, std::unique_ptr<IWebSocketServer> transport = nullptr);
    ~RemoteApiServer();

    RemoteApiServer(const RemoteApiServer&) = delete;
    RemoteApiServer& operator=(const RemoteApiServer&) = delete;

    bool startServer();
    void stopServer();
    [[nodiscard]] bool isRunning() const noexcept;
    [[nodiscard]] uint16_t port() const noexcept;

    // Security & Pairing
    [[nodiscard]] std::string generatePairingPin();
    [[nodiscard]] bool verifyPairingToken(const std::string& token) const;

    // Messaging & Events
    void broadcastEvent(const std::string& eventName, const std::string& jsonPayload);
    void setCommandCallback(ApiCommandCallback callback);

    // Test helper to simulate incoming remote request
    void simulateRemoteRequest(const std::string& action, const std::string& payload);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_REMOTE_API_SERVER_HPP
