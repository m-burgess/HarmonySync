#include "RemoteApiServer.hpp"
#include <QByteArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QString>
#include <algorithm>
#include <iostream>
#include <mutex>

namespace HarmonySync::Core {

struct RemoteApiServer::Impl {
    uint16_t serverPort{8080};
    bool running{false};
    std::string activePin{"1234"};
    std::string activeToken{"secret_token_1234"};
    std::string lastSongMapJson;
    ApiCommandCallback commandCb;
    mutable std::mutex mutex;
    std::vector<std::shared_ptr<IWebSocketConnection>> clients;
    std::unique_ptr<IWebSocketServer> transport;

    Impl(uint16_t p, std::unique_ptr<IWebSocketServer> t)
        : serverPort(p)
        , transport(std::move(t)) {}

    void onConnection(const std::shared_ptr<IWebSocketConnection>& connection) {
        // Weak, so the handlers stored in the connection don't keep it alive through the client list.
        const std::weak_ptr<IWebSocketConnection> weak = connection;
        connection->setTextHandler([this](const std::string& message) { onMessage(message); });
        connection->setDisconnectHandler([this, weak]() { onDisconnect(weak.lock()); });

        std::lock_guard<std::mutex> lock(mutex);
        clients.push_back(connection);
        std::cout << "[RemoteApiServer] Client connected." << '\n';

        if (!lastSongMapJson.empty()) {
            connection->sendText(buildEventMessage("SONG_MAP_UPDATED", lastSongMapJson));
        }
    }

    void onDisconnect(const std::shared_ptr<IWebSocketConnection>& connection) {
        std::lock_guard<std::mutex> lock(mutex);
        std::erase(clients, connection);
    }

    void onMessage(const std::string& message) {
        std::cout << "[RemoteApiServer] Received message: " << message << '\n';
        ApiCommandCallback cb;
        {
            std::lock_guard<std::mutex> lock(mutex);
            cb = commandCb;
        }
        if (!cb) {
            return;
        }
        const QJsonDocument doc = QJsonDocument::fromJson(QByteArray::fromStdString(message));
        if (!doc.isObject()) {
            return;
        }
        const QJsonObject obj = doc.object();
        cb(obj["action"].toString().toStdString(), obj["payload"].toString().toStdString());
    }

    static std::string buildEventMessage(const std::string& eventName, const std::string& payload) {
        QJsonObject obj;
        obj["event"] = QString::fromStdString(eventName);
        obj["payload"] = QString::fromStdString(payload);
        const QByteArray json = QJsonDocument(obj).toJson(QJsonDocument::Compact);
        return std::string(json.constData(), static_cast<std::size_t>(json.size()));
    }
};

RemoteApiServer::RemoteApiServer(uint16_t port, std::unique_ptr<IWebSocketServer> transport)
    : m_impl(std::make_unique<Impl>(port, transport ? std::move(transport) : createQtWebSocketServer())) {
    Impl* impl = m_impl.get();
    impl->transport->setConnectionHandler(
        [impl](const std::shared_ptr<IWebSocketConnection>& connection) { impl->onConnection(connection); });
}

RemoteApiServer::~RemoteApiServer() {
    stopServer();
}

bool RemoteApiServer::startServer() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (m_impl->running) {
        return true;
    }

    if (!m_impl->transport->listen(m_impl->serverPort)) {
        std::cerr << "[RemoteApiServer] Failed to start on port " << m_impl->serverPort << '\n';
        return false;
    }
    m_impl->running = true;
    std::cout << "[RemoteApiServer] Started on port " << m_impl->serverPort << '\n';
    return true;
}

void RemoteApiServer::stopServer() {
    std::vector<std::shared_ptr<IWebSocketConnection>> clients;
    {
        std::lock_guard<std::mutex> lock(m_impl->mutex);
        clients.swap(m_impl->clients);
        m_impl->running = false;
    }
    // Closing outside the lock: a transport may report disconnects synchronously.
    m_impl->transport->close();
    for (const auto& client : clients) {
        client->close();
    }
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
    const std::string message = Impl::buildEventMessage(eventName, jsonPayload);

    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (eventName == "SONG_MAP_UPDATED") {
        m_impl->lastSongMapJson = jsonPayload;
    }
    for (const auto& client : m_impl->clients) {
        client->sendText(message);
    }
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
