#ifndef HARMONYSYNC_REMOTE_API_SERVER_HPP
#define HARMONYSYNC_REMOTE_API_SERVER_HPP

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <cstdint>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::Core {

using ApiCommandCallback = std::function<void(const std::string& action, const std::string& payload)>;

/**
 * @brief Thread-safe embedded HTTP & WebSocket server exposing REST endpoints and push notifications for mobile remote control.
 */
class RemoteApiServer
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
#endif
public:
    explicit RemoteApiServer(uint16_t port = 8080);
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
