#include "MobileApiClient.hpp"
#include <mutex>
#include <thread>
#include <atomic>
#include <chrono>

namespace HarmonySync::Core {

struct MobileApiClient::Impl {
    std::string currentIp;
    uint16_t currentPort{0};
    std::string currentPin;
    
    std::atomic<ConnectionState> state{ConnectionState::Disconnected};
    ClientStateCallback stateCallback;
    ClientEventCallback eventCallback;
    
    std::mutex mutex;
    std::atomic<bool> keepRunning{false};
    std::unique_ptr<std::thread> networkThread;
    
    void updateState(ConnectionState newState) {
        state = newState;
        if (stateCallback) {
            stateCallback(newState);
        }
    }
    
    void mockNetworkLoop() {
        updateState(ConnectionState::Connecting);
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
        
        if (!keepRunning) return;
        
        // Mock authentication check
        if (currentPin.length() >= 4) { // Accept any 4+ char PIN for mock testing
            updateState(ConnectionState::Connected);
            
            // Mock receiving an initial event
            if (eventCallback) {
                eventCallback("SESSION_STARTED", "{\"status\":\"ok\"}");
            }
        } else {
            updateState(ConnectionState::AuthenticationFailed);
            return;
        }
        
        while (keepRunning) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
};

MobileApiClient::MobileApiClient()
    : m_impl(std::make_unique<Impl>())
{}

MobileApiClient::~MobileApiClient() {
    disconnect();
}

MobileApiClient::MobileApiClient(MobileApiClient&&) noexcept = default;
MobileApiClient& MobileApiClient::operator=(MobileApiClient&&) noexcept = default;

void MobileApiClient::connectToHost(const std::string& ipAddress, uint16_t port, const std::string& pin) {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (m_impl->keepRunning) {
        return; // Already connecting or connected
    }
    
    m_impl->currentIp = ipAddress;
    m_impl->currentPort = port;
    m_impl->currentPin = pin;
    
    m_impl->keepRunning = true;
    m_impl->networkThread = std::make_unique<std::thread>(&Impl::mockNetworkLoop, m_impl.get());
}

void MobileApiClient::disconnect() {
    std::lock_guard<std::mutex> lock(m_impl->mutex);
    if (m_impl->keepRunning) {
        m_impl->keepRunning = false;
        if (m_impl->networkThread && m_impl->networkThread->joinable()) {
            m_impl->networkThread->join();
        }
        m_impl->networkThread.reset();
        m_impl->updateState(ConnectionState::Disconnected);
    }
}

ConnectionState MobileApiClient::currentState() const noexcept {
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
    if (m_impl->state != ConnectionState::Connected) {
        return false; // Cannot send commands if disconnected
    }
    
    // Simulate sending command to server
    // In a real Qt implementation, this would post a QNetworkRequest or send a WebSocket frame.
    return true;
}

} // namespace HarmonySync::Core
