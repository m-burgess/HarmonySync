#include "WebSocketTransport.hpp"

#include <QHostAddress>
#include <QString>
#include <QUrl>
#include <QWebSocket>
#include <QWebSocketServer>
#include <utility>

namespace HarmonySync::Core {

namespace {

// Qt signal lambdas capture this state rather than the adapter, so they stay valid if the adapter is destroyed first.
struct SocketHandlers {
    // Cleared on QObject::destroyed; a raw pointer avoids QPointer, which trips a clang-tidy 18 false positive.
    QWebSocket* socket = nullptr;
    std::function<void(const std::string&)> text;
    std::function<void()> disconnected;
    std::function<void()> connected;
    std::function<void(int)> error;
};

void wireCommonSignals(QWebSocket* socket, const std::shared_ptr<SocketHandlers>& handlers) {
    QObject::connect(socket, &QWebSocket::textMessageReceived, socket, [handlers](const QString& message) {
        const auto handler = handlers->text;
        if (handler) {
            handler(message.toStdString());
        }
    });
    QObject::connect(socket, &QWebSocket::disconnected, socket, [handlers]() {
        const auto handler = handlers->disconnected;
        if (handler) {
            handler();
        }
    });
}

class QtWebSocketConnection final : public IWebSocketConnection {
public:
    explicit QtWebSocketConnection(QWebSocket* socket)
        : m_handlers(std::make_shared<SocketHandlers>()) {
        m_handlers->socket = socket;
        QObject::connect(socket, &QObject::destroyed, socket,
                         [handlers = m_handlers]() { handlers->socket = nullptr; });
        wireCommonSignals(socket, m_handlers);
    }

    QtWebSocketConnection(const QtWebSocketConnection&) = delete;
    QtWebSocketConnection& operator=(const QtWebSocketConnection&) = delete;

    ~QtWebSocketConnection() override {
        m_handlers->text = nullptr;
        m_handlers->disconnected = nullptr;
        if (m_handlers->socket != nullptr) {
            m_handlers->socket->deleteLater();
        }
    }

    void sendText(const std::string& text) override {
        if (m_handlers->socket != nullptr) {
            m_handlers->socket->sendTextMessage(QString::fromStdString(text));
        }
    }

    void close() override {
        if (m_handlers->socket != nullptr) {
            m_handlers->socket->close();
        }
    }

    void setTextHandler(std::function<void(const std::string&)> handler) override {
        m_handlers->text = std::move(handler);
    }

    void setDisconnectHandler(std::function<void()> handler) override { m_handlers->disconnected = std::move(handler); }

private:
    std::shared_ptr<SocketHandlers> m_handlers;
};

class QtWebSocketServerTransport final : public IWebSocketServer {
public:
    QtWebSocketServerTransport()
        : m_server(QStringLiteral("HarmonySync Remote API"), QWebSocketServer::NonSecureMode) {
        QObject::connect(&m_server, &QWebSocketServer::newConnection, &m_server, [this]() {
            QWebSocket* socket = m_server.nextPendingConnection();
            if (socket == nullptr) {
                return;
            }
            if (m_onConnection) {
                m_onConnection(std::make_shared<QtWebSocketConnection>(socket));
            } else {
                socket->deleteLater();
            }
        });
    }

    bool listen(uint16_t port) override { return m_server.listen(QHostAddress::Any, port); }

    void close() override { m_server.close(); }

    void setConnectionHandler(ConnectionHandler handler) override { m_onConnection = std::move(handler); }

private:
    QWebSocketServer m_server;
    ConnectionHandler m_onConnection;
};

class QtWebSocketClient final : public IWebSocketClient {
public:
    QtWebSocketClient()
        : m_socket(QString(), QWebSocketProtocol::VersionLatest)
        , m_handlers(std::make_shared<SocketHandlers>()) {
        wireCommonSignals(&m_socket, m_handlers);
        QObject::connect(&m_socket, &QWebSocket::connected, &m_socket, [handlers = m_handlers]() {
            const auto handler = handlers->connected;
            if (handler) {
                handler();
            }
        });
        // QWebSocket::errorOccurred replaced the overloaded error() signal in Qt 6.5.
#if QT_VERSION >= QT_VERSION_CHECK(6, 5, 0)
        QObject::connect(&m_socket, &QWebSocket::errorOccurred, &m_socket,
#else
        QObject::connect(&m_socket, QOverload<QAbstractSocket::SocketError>::of(&QWebSocket::error), &m_socket,
#endif
                         [handlers = m_handlers](QAbstractSocket::SocketError error) {
                             const auto handler = handlers->error;
                             if (handler) {
                                 handler(static_cast<int>(error));
                             }
                         });
    }

    QtWebSocketClient(const QtWebSocketClient&) = delete;
    QtWebSocketClient& operator=(const QtWebSocketClient&) = delete;

    ~QtWebSocketClient() override {
        m_handlers->text = nullptr;
        m_handlers->disconnected = nullptr;
        m_handlers->connected = nullptr;
        m_handlers->error = nullptr;
    }

    void open(const std::string& host, uint16_t port) override {
        QUrl url;
        url.setScheme(QStringLiteral("ws"));
        url.setHost(QString::fromStdString(host));
        url.setPort(port);
        m_socket.open(url);
    }

    void sendText(const std::string& text) override { m_socket.sendTextMessage(QString::fromStdString(text)); }

    void close() override { m_socket.close(); }

    void setTextHandler(std::function<void(const std::string&)> handler) override {
        m_handlers->text = std::move(handler);
    }

    void setDisconnectHandler(std::function<void()> handler) override { m_handlers->disconnected = std::move(handler); }

    void setConnectedHandler(std::function<void()> handler) override { m_handlers->connected = std::move(handler); }

    void setErrorHandler(std::function<void(int)> handler) override { m_handlers->error = std::move(handler); }

private:
    QWebSocket m_socket;
    std::shared_ptr<SocketHandlers> m_handlers;
};

} // namespace

std::unique_ptr<IWebSocketServer> createQtWebSocketServer() {
    return std::make_unique<QtWebSocketServerTransport>();
}

std::unique_ptr<IWebSocketClient> createQtWebSocketClient() {
    return std::make_unique<QtWebSocketClient>();
}

} // namespace HarmonySync::Core
