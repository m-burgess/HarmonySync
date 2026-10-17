#ifndef HARMONYSYNC_MOBILE_API_CLIENT_HPP
#define HARMONYSYNC_MOBILE_API_CLIENT_HPP

#include "WebSocketTransport.hpp"
#include <cstdint>
#include <functional>
#include <memory>
#include <string>

// main.cpp and the viewmodels key their Qt-only code off this macro, which they receive through this header.
#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::Core {

enum class ConnectionState { Disconnected, Connecting, Connected, AuthenticationFailed, ConnectionFailed };

using ClientStateCallback = std::function<void(ConnectionState state)>;
using ClientEventCallback = std::function<void(const std::string& eventName, const std::string& payload)>;

/**
 * @brief Thread-safe network client for mobile devices to connect to the main HarmonySync host via WebSocket/REST.
 */
class MobileApiClient {
public:
    /** @param transport WebSocket client; defaults to the Qt WebSocket client. */
    explicit MobileApiClient(std::unique_ptr<IWebSocketClient> transport = nullptr);
    ~MobileApiClient();

    MobileApiClient(const MobileApiClient&) = delete;
    MobileApiClient& operator=(const MobileApiClient&) = delete;

    // Connection Management
    void connectToHost(const std::string& ipAddress, uint16_t port, const std::string& pin);
    void disconnect();
    [[nodiscard]] ConnectionState currentState() const noexcept;

    // Asynchronous Callbacks
    void setStateCallback(ClientStateCallback callback);
    void setEventCallback(ClientEventCallback callback);

    // Command API
    bool sendCommand(const std::string& action, const std::string& payload);

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_MOBILE_API_CLIENT_HPP
