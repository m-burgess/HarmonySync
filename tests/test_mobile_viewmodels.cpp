#include "MusicianSessionViewModel.hpp"
#include "MusicianConfidenceViewModel.hpp"
#include "MobileApiClient.hpp"
#include "fake_web_socket.hpp"
#include "test_check.hpp"

#include <QCoreApplication>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QVariantList>
#include <QVariantMap>

#include <memory>
#include <string>

using namespace HarmonySync::ViewModels;
using namespace HarmonySync::Core;

void testMusicianSessionViewModel() {
    auto fake = std::make_unique<FakeWebSocketClient>();
    auto* transport = fake.get();
    auto apiClient = std::make_shared<MobileApiClient>(std::move(fake));
    MusicianSessionViewModel vm(apiClient);

    HS_CHECK(vm.hostIp() == QStringLiteral("192.168.1.50"));
    vm.setHostIp(QStringLiteral("10.0.0.1"));
    vm.setHostIp(QStringLiteral("10.0.0.1"));
    vm.setPairingPin(QStringLiteral("1234"));
    vm.setPairingPin(QStringLiteral("1234"));
    HS_CHECK(vm.hostIp() == QStringLiteral("10.0.0.1"));
    HS_CHECK(vm.pairingPin() == QStringLiteral("1234"));
    HS_CHECK(transport->sent.empty());
    HS_CHECK(!vm.isConnected());
    HS_CHECK(!vm.isConnecting());
    HS_CHECK(!vm.hasAuthError());

    vm.connectToHost();
    HS_CHECK(vm.isConnecting());
    HS_CHECK(transport->openedHost == "10.0.0.1");
    HS_CHECK(transport->openedPort == 8080);
    transport->fireConnected();
    HS_CHECK(vm.isConnected());
    HS_CHECK(!vm.isConnecting());
    vm.disconnectFromHost();
    HS_CHECK(!vm.isConnected());

    vm.connectToHost();
    transport->fireError(1);
    HS_CHECK(!vm.isConnected());
    HS_CHECK(!vm.isConnecting());
    HS_CHECK(!vm.hasAuthError());
}

void testMusicianConfidenceViewModel() {
    auto fake = std::make_unique<FakeWebSocketClient>();
    auto* transport = fake.get();
    auto apiClient = std::make_shared<MobileApiClient>(std::move(fake));
    MusicianConfidenceViewModel vm(apiClient);

    HS_CHECK(vm.currentSongTitle() == QStringLiteral("Waiting for Host..."));
    HS_CHECK(vm.currentLyricLine().isEmpty());
    HS_CHECK(vm.nextLyricLine().isEmpty());
    HS_CHECK(vm.timerText() == QStringLiteral("00:00"));

    vm.setCapoEnabled(true); // no song map yet, so structure generation returns early
    vm.setCapoEnabled(false);

    QJsonObject line{{QStringLiteral("lyric"), QStringLiteral("Amazing grace")},
                     {QStringLiteral("timestamp"), QStringLiteral("00:12")},
                     {QStringLiteral("chords"), QStringLiteral("1 4 5")}};
    QJsonObject section{{QStringLiteral("name"), QStringLiteral("Verse")}, {QStringLiteral("lines"), QJsonArray{line}}};
    QJsonObject song{{QStringLiteral("title"), QStringLiteral("Grace")},
                     {QStringLiteral("originalKey"), QStringLiteral("D")},
                     {QStringLiteral("sections"), QJsonArray{section}}};
    const std::string songPayload = QJsonDocument(song).toJson(QJsonDocument::Compact).toStdString();
    const QJsonObject event{{QStringLiteral("event"), QStringLiteral("SONG_MAP_UPDATED")},
                            {QStringLiteral("payload"), QString::fromStdString(songPayload)}};
    transport->fireText(QJsonDocument(event).toJson(QJsonDocument::Compact).toStdString());

    HS_CHECK(vm.currentSongTitle() == QStringLiteral("Grace"));
    HS_CHECK(vm.originalKey() == QStringLiteral("D"));
    HS_CHECK(vm.selectedKey() == QStringLiteral("D"));
    QVariantList structure = vm.songStructure();
    HS_CHECK(structure.size() == 1);
    QVariantMap sectionMap = structure[0].toMap();
    HS_CHECK(sectionMap.value("name").toString() == QStringLiteral("Verse"));
    QVariantList lines = sectionMap.value("lines").toList();
    HS_CHECK(lines.size() == 1);
    HS_CHECK(lines[0].toMap().value("lyric").toString() == QStringLiteral("Amazing grace"));
    HS_CHECK(lines[0].toMap().value("timestamp").toString() == QStringLiteral("00:12"));
    HS_CHECK(lines[0].toMap().value("chords").toString() == QStringLiteral("D G A"));

    vm.setSelectedKey(QStringLiteral("G"));
    HS_CHECK(vm.selectedKey() == QStringLiteral("G"));
    HS_CHECK(vm.songStructure()[0].toMap().value("lines").toList()[0].toMap().value("chords").toString() ==
             QStringLiteral("G C D"));
    vm.setCagedEnabled(true);
    HS_CHECK(vm.songStructure()[0].toMap().value("lines").toList()[0].toMap().value("chords").toString() ==
             QStringLiteral("G [D-shape] C [C-shape] D [A-shape]"));
    vm.setCapoEnabled(true);
    HS_CHECK(vm.songStructure()[0].toMap().value("lines").toList()[0].toMap().value("chords").toString() ==
             QStringLiteral("G C D"));
    vm.setCapoEnabled(true);
    vm.setCagedEnabled(true);

    const QJsonObject invalidSongEvent{{QStringLiteral("event"), QStringLiteral("SONG_MAP_UPDATED")},
                                       {QStringLiteral("payload"), QStringLiteral("not-json")}};
    transport->fireText(QJsonDocument(invalidSongEvent).toJson(QJsonDocument::Compact).toStdString());
    HS_CHECK(vm.currentSongTitle() == QStringLiteral("Grace"));
    HS_CHECK(vm.songStructure().size() == 1);

    const QJsonObject ignoredLyricsEvent{{QStringLiteral("event"), QStringLiteral("LYRICS_UPDATE")},
                                         {QStringLiteral("payload"), QStringLiteral("ignored")}};
    transport->fireText(QJsonDocument(ignoredLyricsEvent).toJson(QJsonDocument::Compact).toStdString());
    HS_CHECK(vm.currentLyricLine().isEmpty());

    const QJsonObject timerEvent{{QStringLiteral("event"), QStringLiteral("TIMER_UPDATE")},
                                 {QStringLiteral("payload"), QStringLiteral("01:23")}};
    transport->fireText(QJsonDocument(timerEvent).toJson(QJsonDocument::Compact).toStdString());
    HS_CHECK(vm.timerText() == QStringLiteral("01:23"));
}

int main() {
    int argc = 0;
    char* argv[] = {nullptr};
    QCoreApplication app(argc, argv);
    testMusicianSessionViewModel();
    testMusicianConfidenceViewModel();
    return 0;
}
