#include "MusicianSessionViewModel.hpp"
#include <utility>

namespace HarmonySync::ViewModels {

struct MusicianSessionViewModel::Impl {
    std::shared_ptr<Core::MobileApiClient> apiClient;
    std::string ip{"192.168.1.50"};
    std::string pin{""};
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    MusicianSessionViewModel* qmlParent{nullptr};
#endif

    Impl(std::shared_ptr<Core::MobileApiClient> client)
        : apiClient(std::move(client))
    {
        if (!apiClient) {
            apiClient = std::make_shared<Core::MobileApiClient>();
        }
    }
    
    void setupCallbacks() {
        apiClient->setStateCallback([this](Core::ConnectionState state) {
#ifdef HARMONYSYNC_QT_AVAILABLE
            if (qmlParent) {
                // Ensure signals are emitted safely across threads
                QMetaObject::invokeMethod(qmlParent, "connectionStateChanged", Qt::QueuedConnection);
            }
#endif
        });
    }
};

MusicianSessionViewModel::MusicianSessionViewModel(std::shared_ptr<Core::MobileApiClient> client)
    : m_impl(std::make_unique<Impl>(std::move(client)))
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->qmlParent = this;
#endif
    m_impl->setupCallbacks();
}

MusicianSessionViewModel::~MusicianSessionViewModel() = default;

bool MusicianSessionViewModel::isConnected() const noexcept {
    return m_impl->apiClient->currentState() == Core::ConnectionState::Connected;
}

bool MusicianSessionViewModel::isConnecting() const noexcept {
    return m_impl->apiClient->currentState() == Core::ConnectionState::Connecting;
}

bool MusicianSessionViewModel::hasAuthError() const noexcept {
    return m_impl->apiClient->currentState() == Core::ConnectionState::AuthenticationFailed;
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString MusicianSessionViewModel::hostIp() const {
    return QString::fromStdString(m_impl->ip);
}

void MusicianSessionViewModel::setHostIp(const QString& ip) {
    std::string ipStr = ip.toStdString();
    if (m_impl->ip != ipStr) {
        m_impl->ip = ipStr;
        emit hostIpChanged();
    }
}

QString MusicianSessionViewModel::pairingPin() const {
    return QString::fromStdString(m_impl->pin);
}

void MusicianSessionViewModel::setPairingPin(const QString& pin) {
    std::string pStr = pin.toStdString();
    if (m_impl->pin != pStr) {
        m_impl->pin = pStr;
        emit pairingPinChanged();
    }
}

void MusicianSessionViewModel::connectToHost() {
    m_impl->apiClient->connectToHost(m_impl->ip, 8080, m_impl->pin);
}

void MusicianSessionViewModel::disconnectFromHost() {
    m_impl->apiClient->disconnect();
}
#else
std::string MusicianSessionViewModel::hostIp() const {
    return m_impl->ip;
}

void MusicianSessionViewModel::setHostIp(const std::string& ip) {
    m_impl->ip = ip;
}

std::string MusicianSessionViewModel::pairingPin() const {
    return m_impl->pin;
}

void MusicianSessionViewModel::setPairingPin(const std::string& pin) {
    m_impl->pin = pin;
}

void MusicianSessionViewModel::connectToHost() {
    m_impl->apiClient->connectToHost(m_impl->ip, 8080, m_impl->pin);
}

void MusicianSessionViewModel::disconnectFromHost() {
    m_impl->apiClient->disconnect();
}
#endif

} // namespace HarmonySync::ViewModels
