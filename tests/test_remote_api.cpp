#include "RemoteApiServer.hpp"
#include "fake_web_socket.hpp"
#include "test_check.hpp"
#include <QByteArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <iostream>
#include <string>
#include <future>
#include <latch>
#include <thread>

using namespace HarmonySync::Core;

namespace {

struct Harness {
    FakeWebSocketServer* transport;
    RemoteApiServer server;

    explicit Harness(uint16_t port = 8080)
        : Harness(port, std::make_unique<FakeWebSocketServer>()) {}

private:
    Harness(uint16_t port, std::unique_ptr<FakeWebSocketServer> fake)
        : transport(fake.get())
        , server(port, std::move(fake)) {}
};

QJsonObject parse(const std::string& message) {
    return QJsonDocument::fromJson(QByteArray::fromStdString(message)).object();
}

void testLifecycle() {
    std::cout << "[TEST] Running testLifecycle..." << '\n';
    Harness h(9001);
    HS_CHECK(!h.server.isRunning());
    HS_CHECK(h.server.port() == 9001);

    HS_CHECK(h.server.startServer());
    HS_CHECK(h.server.isRunning());
    HS_CHECK(h.transport->listenedPort == 9001);

    // A second start does not listen again.
    HS_CHECK(h.server.startServer());
    HS_CHECK(h.transport->listenCalls == 1);

    h.server.stopServer();
    HS_CHECK(!h.server.isRunning());
    HS_CHECK(h.transport->closed);
    std::cout << "[PASS] testLifecycle passed." << '\n';
}

void testStartFailure() {
    std::cout << "[TEST] Running testStartFailure..." << '\n';
    Harness h;
    h.transport->listenResult = false;
    HS_CHECK(!h.server.startServer());
    HS_CHECK(!h.server.isRunning());
    std::cout << "[PASS] testStartFailure passed." << '\n';
}

void testDefaultTransportConstructs() {
    std::cout << "[TEST] Running testDefaultTransportConstructs..." << '\n';
    // Builds the Qt transport but never listens, so no socket is opened.
    RemoteApiServer server;
    HS_CHECK(server.port() == 8080);
    HS_CHECK(!server.isRunning());
    std::cout << "[PASS] testDefaultTransportConstructs passed." << '\n';
}

void testPairing() {
    std::cout << "[TEST] Running testPairing..." << '\n';
    Harness h;
    HS_CHECK(h.server.verifyPairingToken("secret_token_1234"));
    HS_CHECK(h.server.verifyPairingToken("valid_token"));
    HS_CHECK(!h.server.verifyPairingToken("secret_token_7890"));

    HS_CHECK(h.server.generatePairingPin() == "7890");
    HS_CHECK(h.server.verifyPairingToken("secret_token_7890"));
    HS_CHECK(!h.server.verifyPairingToken("secret_token_1234"));
    HS_CHECK(!h.server.verifyPairingToken("invalid_token"));
    std::cout << "[PASS] testPairing passed." << '\n';
}

void testBroadcastReachesAllClients() {
    std::cout << "[TEST] Running testBroadcastReachesAllClients..." << '\n';
    Harness h;
    h.server.broadcastEvent("NOBODY_LISTENING", "{}");

    auto first = h.transport->accept();
    auto second = h.transport->accept();
    HS_CHECK(first->sent.empty());

    h.server.broadcastEvent("SLIDE_CHANGED", "{\"index\":3}");
    HS_CHECK(first->sent.size() == 1);
    HS_CHECK(second->sent.size() == 1);
    const QJsonObject event = parse(first->sent[0]);
    HS_CHECK(event["event"].toString() == "SLIDE_CHANGED");
    HS_CHECK(event["payload"].toString() == "{\"index\":3}");
    std::cout << "[PASS] testBroadcastReachesAllClients passed." << '\n';
}

void testNewClientGetsLatestSongMap() {
    std::cout << "[TEST] Running testNewClientGetsLatestSongMap..." << '\n';
    Harness h;
    auto early = h.transport->accept();
    HS_CHECK(early->sent.empty());

    h.server.broadcastEvent("SONG_MAP_UPDATED", "{\"v\":1}");
    h.server.broadcastEvent("SONG_MAP_UPDATED", "{\"v\":2}");
    h.server.broadcastEvent("SLIDE_CHANGED", "{}");

    auto late = h.transport->accept();
    HS_CHECK(late->sent.size() == 1);
    const QJsonObject replay = parse(late->sent[0]);
    HS_CHECK(replay["event"].toString() == "SONG_MAP_UPDATED");
    HS_CHECK(replay["payload"].toString() == "{\"v\":2}");
    std::cout << "[PASS] testNewClientGetsLatestSongMap passed." << '\n';
}

void testIncomingCommands() {
    std::cout << "[TEST] Running testIncomingCommands..." << '\n';
    Harness h;
    auto client = h.transport->accept();

    // Without a callback the message is dropped.
    client->receive(R"({"action":"IGNORED","payload":""})");

    int calls = 0;
    std::string action;
    std::string payload;
    h.server.setCommandCallback([&](const std::string& a, const std::string& p) {
        ++calls;
        action = a;
        payload = p;
    });

    client->receive(R"({"action":"NEXT_SLIDE","payload":"{}"})");
    HS_CHECK(calls == 1);
    HS_CHECK(action == "NEXT_SLIDE");
    HS_CHECK(payload == "{}");

    client->receive("not json at all");
    client->receive("[1,2,3]");
    HS_CHECK(calls == 1);

    // Missing fields arrive as empty strings.
    client->receive("{}");
    HS_CHECK(calls == 2);
    HS_CHECK(action.empty());
    HS_CHECK(payload.empty());
    std::cout << "[PASS] testIncomingCommands passed." << '\n';
}

void testDisconnectedClientStopsReceiving() {
    std::cout << "[TEST] Running testDisconnectedClientStopsReceiving..." << '\n';
    Harness h;
    auto gone = h.transport->accept();
    auto staying = h.transport->accept();

    gone->disconnect();
    h.server.broadcastEvent("PING", "{}");
    HS_CHECK(gone->sent.empty());
    HS_CHECK(staying->sent.size() == 1);
    std::cout << "[PASS] testDisconnectedClientStopsReceiving passed." << '\n';
}

void testStopClosesClients() {
    std::cout << "[TEST] Running testStopClosesClients..." << '\n';
    Harness h;
    h.server.startServer();
    auto client = h.transport->accept();

    h.server.stopServer();
    HS_CHECK(client->closed);

    h.server.broadcastEvent("PING", "{}");
    HS_CHECK(client->sent.empty());
    std::cout << "[PASS] testStopClosesClients passed." << '\n';
}

void testSimulateRemoteRequest() {
    std::cout << "[TEST] Running testSimulateRemoteRequest..." << '\n';
    Harness h;
    h.server.simulateRemoteRequest("NO_CALLBACK", "{}");

    std::string action;
    h.server.setCommandCallback([&](const std::string& a, const std::string&) { action = a; });
    h.server.simulateRemoteRequest("NEXT_SLIDE", "{}");
    HS_CHECK(action == "NEXT_SLIDE");
    std::cout << "[PASS] testSimulateRemoteRequest passed." << '\n';
}

} // namespace

void testRetainedConnections() {
    std::shared_ptr<FakeWebSocketConnection> stopped;
    std::shared_ptr<FakeWebSocketConnection> disconnected;
    int calls = 0;
    {
        Harness h;
        h.server.setCommandCallback([&](const std::string&, const std::string&) { ++calls; });
        stopped = h.transport->accept();
        disconnected = h.transport->accept();
        disconnected->disconnect();
        disconnected->receive(R"({"action":"IGNORED"})");
        h.server.stopServer();
        stopped->receive(R"({"action":"IGNORED"})");
    }
    stopped->receive(R"({"action":"IGNORED"})");
    stopped->disconnect();
    disconnected->receive(R"({"action":"IGNORED"})");
    disconnected->disconnect();
    HS_CHECK(calls == 0);
}

void testStartWaitsForStop() {
    class BlockingServer final : public FakeWebSocketServer {
    public:
        std::latch closing{1};
        std::latch releaseClose{1};
        bool listening{false};
        bool blockClose{true};
        bool listen(uint16_t port) override {
            listening = true;
            return FakeWebSocketServer::listen(port);
        }
        void close() override {
            if (blockClose) {
                closing.count_down();
                releaseClose.wait();
            }
            listening = false;
        }
    };
    auto transport = std::make_unique<BlockingServer>();
    auto* fake = transport.get();
    RemoteApiServer server(8080, std::move(transport));
    std::thread stopper([&] { server.stopServer(); });
    fake->closing.wait();
    std::latch starting{1};
    auto start = std::async(std::launch::async, [&] {
        starting.count_down();
        return server.startServer();
    });
    starting.wait();
    // State queries remain available while transport close is blocked.
    HS_CHECK(!server.isRunning());
    fake->releaseClose.count_down();
    stopper.join();
    HS_CHECK(start.get());
    HS_CHECK(server.isRunning());
    HS_CHECK(fake->listening);
    fake->blockClose = false;
}

int main() {
    testRetainedConnections();
    testStartWaitsForStop();
    testLifecycle();
    testStartFailure();
    testDefaultTransportConstructs();
    testPairing();
    testBroadcastReachesAllClients();
    testNewClientGetsLatestSongMap();
    testIncomingCommands();
    testDisconnectedClientStopsReceiving();
    testStopClosesClients();
    testSimulateRemoteRequest();
    std::cout << "\nALL REMOTE API UNIT TESTS PASSED" << '\n';
    return EXIT_SUCCESS;
}
