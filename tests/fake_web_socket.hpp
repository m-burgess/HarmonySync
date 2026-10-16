#ifndef HARMONYSYNC_TESTS_FAKE_WEB_SOCKET_HPP
#define HARMONYSYNC_TESTS_FAKE_WEB_SOCKET_HPP

#include "WebSocketTransport.hpp"
#include <memory>
#include <string>
#include <vector>

// In-memory transports: tests drive events by hand, so there is no network and no event loop.

class FakeWebSocketConnection : public HarmonySync::Core::IWebSocketConnection {
public:
    std::vector<std::string> sent;
    bool closed{false};

    void sendText(const std::string& text) override { sent.push_back(text); }
    void close() override { closed = true; }
    void setTextHandler(std::function<void(const std::string&)> handler) override { m_text = std::move(handler); }
    void setDisconnectHandler(std::function<void()> handler) override { m_disconnect = std::move(handler); }

    void receive(const std::string& text) {
        const auto handler = m_text;
        if (handler) {
            handler(text);
        }
    }

    void disconnect() {
        const auto handler = m_disconnect;
        if (handler) {
            handler();
        }
    }

private:
    std::function<void(const std::string&)> m_text;
    std::function<void()> m_disconnect;
};

class FakeWebSocketServer : public HarmonySync::Core::IWebSocketServer {
public:
    bool listenResult{true};
    int listenCalls{0};
    uint16_t listenedPort{0};
    bool closed{false};

    bool listen(uint16_t port) override {
        ++listenCalls;
        listenedPort = port;
        return listenResult;
    }
    void close() override { closed = true; }
    void setConnectionHandler(ConnectionHandler handler) override { m_onConnection = std::move(handler); }

    std::shared_ptr<FakeWebSocketConnection> accept() {
        auto connection = std::make_shared<FakeWebSocketConnection>();
        m_onConnection(connection);
        return connection;
    }

private:
    ConnectionHandler m_onConnection;
};

class FakeWebSocketClient : public HarmonySync::Core::IWebSocketClient {
public:
    std::string openedHost;
    uint16_t openedPort{0};
    int openCalls{0};
    int closeCalls{0};
    std::vector<std::string> sent;

    void open(const std::string& host, uint16_t port) override {
        ++openCalls;
        openedHost = host;
        openedPort = port;
    }
    void sendText(const std::string& text) override { sent.push_back(text); }
    void close() override { ++closeCalls; }
    void setTextHandler(std::function<void(const std::string&)> handler) override { m_text = std::move(handler); }
    void setDisconnectHandler(std::function<void()> handler) override { m_disconnect = std::move(handler); }
    void setConnectedHandler(std::function<void()> handler) override { m_connected = std::move(handler); }
    void setErrorHandler(std::function<void(int)> handler) override { m_error = std::move(handler); }

    void fireConnected() { m_connected(); }
    void fireDisconnected() { m_disconnect(); }
    void fireError(int code) { m_error(code); }
    void fireText(const std::string& text) { m_text(text); }

private:
    std::function<void(const std::string&)> m_text;
    std::function<void()> m_disconnect;
    std::function<void()> m_connected;
    std::function<void(int)> m_error;
};

#endif // HARMONYSYNC_TESTS_FAKE_WEB_SOCKET_HPP
