#ifndef HARMONYSYNC_WEB_SOCKET_TRANSPORT_HPP
#define HARMONYSYNC_WEB_SOCKET_TRANSPORT_HPP

#include <cstdint>
#include <functional>
#include <memory>
#include <string>

namespace HarmonySync::Core {

/**
 * @brief One established WebSocket peer, text frames only.
 * Handlers run on the transport's event thread; implementations must tolerate the handler destroying the connection.
 */
class IWebSocketConnection {
public:
    IWebSocketConnection() = default;
    IWebSocketConnection(const IWebSocketConnection&) = delete;
    IWebSocketConnection& operator=(const IWebSocketConnection&) = delete;
    virtual ~IWebSocketConnection() = default;

    virtual void sendText(const std::string& text) = 0;
    virtual void close() = 0;
    virtual void setTextHandler(std::function<void(const std::string&)> handler) = 0;
    virtual void setDisconnectHandler(std::function<void()> handler) = 0;
};

class IWebSocketServer {
public:
    using ConnectionHandler = std::function<void(std::shared_ptr<IWebSocketConnection>)>;

    IWebSocketServer() = default;
    IWebSocketServer(const IWebSocketServer&) = delete;
    IWebSocketServer& operator=(const IWebSocketServer&) = delete;
    virtual ~IWebSocketServer() = default;

    virtual bool listen(uint16_t port) = 0;
    virtual void close() = 0;
    virtual void setConnectionHandler(ConnectionHandler handler) = 0;
};

class IWebSocketClient : public IWebSocketConnection {
public:
    virtual void open(const std::string& host, uint16_t port) = 0;
    virtual void setConnectedHandler(std::function<void()> handler) = 0;
    virtual void setErrorHandler(std::function<void(int errorCode)> handler) = 0;
};

// Production transports backed by Qt WebSockets (see QtWebSocketTransport.cpp).
std::unique_ptr<IWebSocketServer> createQtWebSocketServer();
std::unique_ptr<IWebSocketClient> createQtWebSocketClient();

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_WEB_SOCKET_TRANSPORT_HPP
