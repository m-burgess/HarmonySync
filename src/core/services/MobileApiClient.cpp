#include "MobileApiClient.hpp"
#include <mutex>
#include <iostream>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QtWebSockets/QWebSocket>
#include <QJsonDocument>
#include <QJsonObject>
#include <QUrl>
#include <QTimer>
#endif

namespace HarmonySync::Core {

struct MobileApiClient::Impl {
    std::string currentIp;
    uint16_t currentPort{0};
    std::string currentPin;
    
    ConnectionState state{ConnectionState::Disconnected};
    ClientStateCallback stateCallback;
    ClientEventCallback eventCallback;
    
    mutable std::mutex mutex;

#ifdef HARMONYSYNC_QT_AVAILABLE
    QWebSocket* webSocket{nullptr};
#endif

    void updateState(ConnectionState newState) {
        state = newState;
        if (stateCallback) {
            stateCallback(newState);
        }
    }
};

MobileApiClient::MobileApiClient()
    : m_impl(std::make_unique<Impl>())
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->webSocket = new QWebSocket(QString(), QWebSocketProtocol::VersionLatest, this);
    
    connect(m_impl->webSocket, &QWebSocket::connected, this, [this]() {
        std::lock_guard<std::mutex> lock(m_impl->mutex);
        m_impl->updateState(ConnectionState::Connected);
        std::cout << "[MobileApiClient] Connected to host." << std::endl;
        
        // Optionally send a connect/auth message with the PIN here
        QJsonObject authObj;
        authObj["action"] = "auth";
        authObj["payload"] = QString::fromStdString(m_impl->currentPin);
        QJsonDocument doc(authObj);
        m_impl->webSocket->sendTextMessage(QString::fromUtf8(doc.toJson(QJsonDocument::Compact)));
    });
    
    connect(m_impl->webSocket, &QWebSocket::disconnected, this, [this]() {
        std::lock_guard<std::mutex> lock(m_impl->mutex);
        m_impl->updateState(ConnectionState::Disconnected);
        std::cout << "[MobileApiClient] Disconnected from host." << std::endl;
    });

#if QT_VERSION >= QT_VERSION_CHECK(6, 5, 0)
    connect(m_impl->webSocket, &QWebSocket::errorOccurred, this, [this](QAbstractSocket::SocketError error) {
#else
    connect(m_impl->webSocket, QOverload<QAbstractSocket::SocketError>::of(&QWebSocket::error), this, [this](QAbstractSocket::SocketError error) {
#endif
        std::lock_guard<std::mutex> lock(m_impl->mutex);
        std::cerr << "[MobileApiClient] WebSocket Error: " << error << std::endl;
        m_impl->updateState(ConnectionState::ConnectionFailed);
    });
    
    connect(m_impl->webSocket, &QWebSocket::textMessageReceived, this, [this](const QString &message) {
        ClientEventCallback cb;
        {
            std::lock_guard<std::mutex> lock(m_impl->mutex);
            cb = m_impl->eventCallback;
        }
        if (cb) {
            QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
            if (!doc.isNull() && doc.isObject()) {
                QJsonObject obj = doc.object();
                QString event = obj["event"].toString();
                QString payload = obj["payload"].toString();
                cb(event.toStdString(), payload.toStdString());
            }
        }
    });
#endif
}

MobileApiClient::~MobileApiClient() {
    disconnect();
}

void MobileApiClient::connectToHost(const std::string& ipAddress, uint16_t port, const std::string& pin) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    
    m_impl->currentIp = ipAddress;
    m_impl->currentPort = port;
    m_impl->currentPin = pin;
    
    m_impl->updateState(ConnectionState::Connecting);

#ifdef HARMONYSYNC_QT_AVAILABLE
    QUrl url;
    url.setScheme("ws");
    url.setHost(QString::fromStdString(ipAddress));
    url.setPort(port);
    m_impl->webSocket->open(url);
#else
    // Mock for non-Qt builds
    m_impl->updateState(ConnectionState::Connected);
#endif
}

void MobileApiClient::disconnect() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
#ifdef HARMONYSYNC_QT_AVAILABLE
    if (m_impl->webSocket) {
        m_impl->webSocket->close();
    }
#endif
    m_impl->updateState(ConnectionState::Disconnected);
}

ConnectionState MobileApiClient::currentState() const noexcept {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    return m_impl->state;
}

void MobileApiClient::setStateCallback(ClientStateCallback callback) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->stateCallback = std::move(callback);
}

void MobileApiClient::setEventCallback(ClientEventCallback callback) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    m_impl->eventCallback = std::move(callback);
}

bool MobileApiClient::sendCommand(const std::string& action, const std::string& payload) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (m_impl->state != ConnectionState::Connected) {
        return false;
    }
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    QJsonObject obj;
    obj["action"] = QString::fromStdString(action);
    obj["payload"] = QString::fromStdString(payload);
    QJsonDocument doc(obj);
    m_impl->webSocket->sendTextMessage(QString::fromUtf8(doc.toJson(QJsonDocument::Compact)));
    return true;
#else
    return true;
#endif
}

} // namespace HarmonySync::Core
