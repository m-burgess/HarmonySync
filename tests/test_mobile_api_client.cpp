#include "MobileApiClient.hpp"
#include "fake_web_socket.hpp"
#include "test_check.hpp"
#include <QByteArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <iostream>
#include <string>
#include <vector>

using namespace HarmonySync::Core;

namespace {

struct Harness {
    FakeWebSocketClient* transport;
    // Declared before the client: its destructor reports a final state change.
    std::vector<ConnectionState> states;
    MobileApiClient client;

    Harness()
        : Harness(std::make_unique<FakeWebSocketClient>()) {
        client.setStateCallback([this](ConnectionState state) { states.push_back(state); });
    }

private:
    explicit Harness(std::unique_ptr<FakeWebSocketClient> fake)
        : transport(fake.get())
        , client(std::move(fake)) {}
};

QJsonObject parse(const std::string& message) {
    return QJsonDocument::fromJson(QByteArray::fromStdString(message)).object();
}

void testDefaultTransportConstructs() {
    std::cout << "[TEST] Running testDefaultTransportConstructs..." << std::endl;
    // Builds the Qt transport but never connects, so no socket is opened.
    MobileApiClient client;
    HS_CHECK(client.currentState() == ConnectionState::Disconnected);
    std::cout << "[PASS] testDefaultTransportConstructs passed." << std::endl;
}

void testConnectAuthenticatesWithPin() {
    std::cout << "[TEST] Running testConnectAuthenticatesWithPin..." << std::endl;
    Harness h;
    HS_CHECK(h.client.currentState() == ConnectionState::Disconnected);

    h.client.connectToHost("192.168.1.50", 8080, "4829");
    HS_CHECK(h.client.currentState() == ConnectionState::Connecting);
    HS_CHECK(h.transport->openedHost == "192.168.1.50");
    HS_CHECK(h.transport->openedPort == 8080);

    h.transport->fireConnected();
    HS_CHECK(h.client.currentState() == ConnectionState::Connected);
    HS_CHECK(h.transport->sent.size() == 1);
    const QJsonObject auth = parse(h.transport->sent[0]);
    HS_CHECK(auth["action"].toString() == "auth");
    HS_CHECK(auth["payload"].toString() == "4829");

    HS_CHECK(h.states.size() == 2);
    HS_CHECK(h.states[0] == ConnectionState::Connecting);
    HS_CHECK(h.states[1] == ConnectionState::Connected);
    std::cout << "[PASS] testConnectAuthenticatesWithPin passed." << std::endl;
}

void testConnectionFailure() {
    std::cout << "[TEST] Running testConnectionFailure..." << std::endl;
    Harness h;
    h.client.connectToHost("10.0.0.1", 8080, "1111");
    h.transport->fireError(1);
    HS_CHECK(h.client.currentState() == ConnectionState::ConnectionFailed);
    HS_CHECK(h.states.back() == ConnectionState::ConnectionFailed);
    HS_CHECK(!h.client.sendCommand("NEXT_SLIDE", "{}"));
    std::cout << "[PASS] testConnectionFailure passed." << std::endl;
}

void testRemoteDisconnect() {
    std::cout << "[TEST] Running testRemoteDisconnect..." << std::endl;
    Harness h;
    h.client.connectToHost("10.0.0.1", 8080, "1111");
    h.transport->fireConnected();
    h.transport->fireDisconnected();
    HS_CHECK(h.client.currentState() == ConnectionState::Disconnected);
    std::cout << "[PASS] testRemoteDisconnect passed." << std::endl;
}

void testLocalDisconnect() {
    std::cout << "[TEST] Running testLocalDisconnect..." << std::endl;
    Harness h;
    h.client.connectToHost("10.0.0.1", 8080, "1111");
    h.transport->fireConnected();

    h.client.disconnect();
    HS_CHECK(h.transport->closeCalls == 1);
    HS_CHECK(h.client.currentState() == ConnectionState::Disconnected);
    std::cout << "[PASS] testLocalDisconnect passed." << std::endl;
}

void testSendCommand() {
    std::cout << "[TEST] Running testSendCommand..." << std::endl;
    Harness h;
    HS_CHECK(!h.client.sendCommand("SET_MIXER_VOL", "{}"));
    HS_CHECK(h.transport->sent.empty());

    h.client.connectToHost("10.0.0.1", 8080, "1111");
    HS_CHECK(!h.client.sendCommand("SET_MIXER_VOL", "{}"));

    h.transport->fireConnected();
    HS_CHECK(h.client.sendCommand("SET_MIXER_VOL", R"({"stemId":2,"volume":0.8})"));
    HS_CHECK(h.transport->sent.size() == 2);
    const QJsonObject command = parse(h.transport->sent[1]);
    HS_CHECK(command["action"].toString() == "SET_MIXER_VOL");
    HS_CHECK(command["payload"].toString() == R"({"stemId":2,"volume":0.8})");
    std::cout << "[PASS] testSendCommand passed." << std::endl;
}

void testEvents() {
    std::cout << "[TEST] Running testEvents..." << std::endl;
    Harness h;
    // Dropped silently while no callback is set.
    h.transport->fireText(R"({"event":"EARLY","payload":""})");

    int calls = 0;
    std::string event;
    std::string payload;
    h.client.setEventCallback([&](const std::string& e, const std::string& p) {
        ++calls;
        event = e;
        payload = p;
    });

    h.transport->fireText(R"({"event":"SESSION_STARTED","payload":"{\"song\":1}"})");
    HS_CHECK(calls == 1);
    HS_CHECK(event == "SESSION_STARTED");
    HS_CHECK(payload == "{\"song\":1}");

    h.transport->fireText("garbage");
    h.transport->fireText("[]");
    HS_CHECK(calls == 1);
    std::cout << "[PASS] testEvents passed." << std::endl;
}

void testCallbacksMayQueryClient() {
    std::cout << "[TEST] Running testCallbacksMayQueryClient..." << std::endl;
    Harness h;
    ConnectionState seen = ConnectionState::Disconnected;
    h.client.setStateCallback([&](ConnectionState) { seen = h.client.currentState(); });

    h.client.connectToHost("10.0.0.1", 8080, "1111");
    HS_CHECK(seen == ConnectionState::Connecting);
    h.client.setStateCallback(nullptr);
    std::cout << "[PASS] testCallbacksMayQueryClient passed." << std::endl;
}

} // namespace

int main() {
    testDefaultTransportConstructs();
    testConnectAuthenticatesWithPin();
    testConnectionFailure();
    testRemoteDisconnect();
    testLocalDisconnect();
    testSendCommand();
    testEvents();
    testCallbacksMayQueryClient();
    std::cout << "\nALL MOBILE API CLIENT UNIT TESTS PASSED" << std::endl;
    return EXIT_SUCCESS;
}
