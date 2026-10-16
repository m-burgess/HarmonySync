#include "MobileApiClient.hpp"
#include <QByteArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QString>
#include <iostream>
#include <mutex>
#include <utility>

namespace HarmonySync::Core {

namespace {

std::string buildCommandMessage(const std::string& action, const std::string& payload) {
    QJsonObject obj;
    obj["action"] = QString::fromStdString(action);
    obj["payload"] = QString::fromStdString(payload);
    const QByteArray json = QJsonDocument(obj).toJson(QJsonDocument::Compact);
    return std::string(json.constData(), static_cast<std::size_t>(json.size()));
}

} // namespace

struct MobileApiClient::Impl {
    std::string currentPin;

    ConnectionState state{ConnectionState::Disconnected};
    ClientStateCallback stateCallback;
    ClientEventCallback eventCallback;

    mutable std::mutex mutex;
    // Declared last: destroyed first, so no transport handler can fire into destroyed members.
    std::unique_ptr<IWebSocketClient> transport;

    explicit Impl(std::unique_ptr<IWebSocketClient> t)
        : transport(std::move(t)) {}

    // Callbacks run outside the lock so they may call back into the client.
    void updateState(ConnectionState newState) {
        ClientStateCallback cb;
        {
            std::lock_guard<std::mutex> lock(mutex);
            state = newState;
            cb = stateCallback;
        }
        if (cb) {
            cb(newState);
        }
    }

    void onConnected() {
        updateState(ConnectionState::Connected);
        std::cout << "[MobileApiClient] Connected to host." << '\n';

        std::string pin;
        {
            std::lock_guard<std::mutex> lock(mutex);
            pin = currentPin;
        }
        transport->sendText(buildCommandMessage("auth", pin));
    }

    void onMessage(const std::string& message) {
        ClientEventCallback cb;
        {
            std::lock_guard<std::mutex> lock(mutex);
            cb = eventCallback;
        }
        if (!cb) {
            return;
        }
        const QJsonDocument doc = QJsonDocument::fromJson(QByteArray::fromStdString(message));
        if (!doc.isObject()) {
            return;
        }
        const QJsonObject obj = doc.object();
        cb(obj["event"].toString().toStdString(), obj["payload"].toString().toStdString());
    }
};

MobileApiClient::MobileApiClient(std::unique_ptr<IWebSocketClient> transport)
    : m_impl(std::make_unique<Impl>(transport ? std::move(transport) : createQtWebSocketClient())) {
    Impl* impl = m_impl.get();
    impl->transport->setConnectedHandler([impl]() { impl->onConnected(); });
    impl->transport->setDisconnectHandler([impl]() {
        impl->updateState(ConnectionState::Disconnected);
        std::cout << "[MobileApiClient] Disconnected from host." << '\n';
    });
    impl->transport->setErrorHandler([impl](int errorCode) {
        std::cerr << "[MobileApiClient] WebSocket Error: " << errorCode << '\n';
        impl->updateState(ConnectionState::ConnectionFailed);
    });
    impl->transport->setTextHandler([impl](const std::string& message) { impl->onMessage(message); });
}

MobileApiClient::~MobileApiClient() {
    disconnect();
}

void MobileApiClient::connectToHost(const std::string& ipAddress, uint16_t port, const std::string& pin) {
    {
        std::lock_guard<std::mutex> lock(m_impl->mutex);
        m_impl->currentPin = pin;
    }
    m_impl->updateState(ConnectionState::Connecting);
    if (currentState() != ConnectionState::Connecting) {
        return;
    }
    m_impl->transport->open(ipAddress, port);
}

void MobileApiClient::disconnect() {
    m_impl->transport->close();
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
    if (currentState() != ConnectionState::Connected) {
        return false;
    }
    m_impl->transport->sendText(buildCommandMessage(action, payload));
    return true;
}

} // namespace HarmonySync::Core
