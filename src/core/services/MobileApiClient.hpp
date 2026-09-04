#ifndef HARMONYSYNC_MOBILE_API_CLIENT_HPP
#define HARMONYSYNC_MOBILE_API_CLIENT_HPP

#include <string>
#include <memory>
#include <functional>
#include <cstdint>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::Core {

enum class ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    AuthenticationFailed,
    ConnectionFailed
};

using ClientStateCallback = std::function<void(ConnectionState state)>;
using ClientEventCallback = std::function<void(const std::string& eventName, const std::string& payload)>;

/**
 * @brief Thread-safe network client for mobile devices to connect to the main HarmonySync host via WebSocket/REST.
 */
class MobileApiClient
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
#endif
public:
    MobileApiClient();
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
