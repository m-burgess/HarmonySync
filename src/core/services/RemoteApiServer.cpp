#include "RemoteApiServer.hpp"
#include <mutex>
#include <random>
#include <iostream>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QtWebSockets/QWebSocketServer>
#include <QtWebSockets/QWebSocket>
#include <QJsonDocument>
#include <QJsonObject>
#include <QCoreApplication>
#endif

namespace HarmonySync::Core {

struct RemoteApiServer::Impl {
    uint16_t serverPort{8080};
    bool running{false};
    std::string activePin{"1234"};
    std::string activeToken{"secret_token_1234"};
    std::string lastSongMapJson;
    ApiCommandCallback commandCb;
    mutable std::mutex mutex;

#ifdef HARMONYSYNC_QT_AVAILABLE
    QWebSocketServer* webSocketServer{nullptr};
    std::vector<QWebSocket*> clients;
#endif

    explicit Impl(uint16_t p)
        : serverPort(p)
    {}
};

RemoteApiServer::RemoteApiServer(uint16_t port)
    : m_impl(std::make_unique<Impl>(port))
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->webSocketServer = new QWebSocketServer(QStringLiteral("HarmonySync Remote API"),
                                                   QWebSocketServer::NonSecureMode, this);
    connect(m_impl->webSocketServer, &QWebSocketServer::newConnection,
            this, [this]() {
        QWebSocket *pSocket = m_impl->webSocketServer->nextPendingConnection();
        connect(pSocket, &QWebSocket::textMessageReceived, this, [this, pSocket](const QString &message) {
            std::cout << "[RemoteApiServer] Received message: " << message.toStdString() << std::endl;
            ApiCommandCallback cb;
            {
                std::lock_guard<std::mutex> lock(m_impl->mutex);
                cb = m_impl->commandCb;
            }
            if (cb) {
                // Simplistic JSON parsing for demo
                QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
                if (!doc.isNull() && doc.isObject()) {
                    QJsonObject obj = doc.object();
                    QString action = obj["action"].toString();
                    QString payload = obj["payload"].toString();
                    cb(action.toStdString(), payload.toStdString());
                }
            }
        });
        connect(pSocket, &QWebSocket::disconnected, this, [this, pSocket]() {
            std::lock_guard<std::mutex> lock(m_impl->mutex);
            auto it = std::find(m_impl->clients.begin(), m_impl->clients.end(), pSocket);
            if (it != m_impl->clients.end()) {
                m_impl->clients.erase(it);
            }
            pSocket->deleteLater();
        });

        std::lock_guard<std::mutex> lock(m_impl->mutex);
        m_impl->clients.push_back(pSocket);
        std::cout << "[RemoteApiServer] Client connected." << std::endl;
        
        if (!m_impl->lastSongMapJson.empty()) {
            QJsonObject eventObj;
            eventObj["event"] = QStringLiteral("SONG_MAP_UPDATED");
            eventObj["payload"] = QString::fromStdString(m_impl->lastSongMapJson);
            QJsonDocument eventDoc(eventObj);
            pSocket->sendTextMessage(eventDoc.toJson(QJsonDocument::Compact));
        }
    });
#endif
}

RemoteApiServer::~RemoteApiServer() {
    stopServer();
}

bool RemoteApiServer::startServer() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (m_impl->running) return true;

#ifdef HARMONYSYNC_QT_AVAILABLE
    if (m_impl->webSocketServer->listen(QHostAddress::Any, m_impl->serverPort)) {
        m_impl->running = true;
        std::cout << "[RemoteApiServer] Started on port " << m_impl->serverPort << std::endl;
        return true;
    } else {
        std::cerr << "[RemoteApiServer] Failed to start on port " << m_impl->serverPort << std::endl;
        return false;
    }
#else
    m_impl->running = true;
    return true;
#endif
}

void RemoteApiServer::stopServer() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
#ifdef HARMONYSYNC_QT_AVAILABLE
    if (m_impl->webSocketServer) {
        m_impl->webSocketServer->close();
    }
    for (auto* client : m_impl->clients) {
        client->close();
        client->deleteLater();
    }
    m_impl->clients.clear();
#endif
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
#ifdef HARMONYSYNC_QT_AVAILABLE
    QJsonObject obj;
    obj["event"] = QString::fromStdString(eventName);
    obj["payload"] = QString::fromStdString(jsonPayload);
    QJsonDocument doc(obj);
    QString msg = QString::fromUtf8(doc.toJson(QJsonDocument::Compact));

    std::lock_guard<std::mutex> lock(m_impl->mutex);
    
    if (eventName == "SONG_MAP_UPDATED") {
        m_impl->lastSongMapJson = jsonPayload;
    }

    for (auto* client : m_impl->clients) {
        client->sendTextMessage(msg);
    }
#else
    (void)eventName;
    (void)jsonPayload;
#endif
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
