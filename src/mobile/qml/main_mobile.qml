import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "views"

ApplicationWindow {
    id: window
    width: 400
    height: 800
    visible: true
    title: "HarmonySync Musician"
    color: "#0f0f12"

    // Material theme defaults for mobile
    font.family: "Inter"

    header: ToolBar {
        background: Rectangle { color: "#09090b" }
        RowLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8

            Rectangle {
                width: 12
                height: 12
                radius: 6
                color: sessionViewModel && sessionViewModel.isConnected ? "#10b981" : "#ef4444"
            }

            Label {
                text: sessionViewModel && sessionViewModel.isConnected ? "Connected to Host" : "Disconnected"
                color: "#f4f4f5"
                font.pixelSize: 14
                font.bold: true
                Layout.fillWidth: true
            }
        }
    }

    StackLayout {
        id: stackLayout
        anchors.fill: parent
        currentIndex: tabBar.currentIndex

        // Index 0: Stage Lyrics / Confidence Monitor
        StageLyricsView {
            id: lyricsView
        }

        // Index 1: Pairing & Settings
        Rectangle {
            color: "#1e1e24"
            ColumnLayout {
                anchors.centerIn: parent
                spacing: 16
                width: parent.width * 0.8

                Label {
                    text: "Host Connection"
                    color: "#f4f4f5"
                    font.pixelSize: 20
                    font.bold: true
                    Layout.alignment: Qt.AlignHCenter
                }

                TextField {
                    placeholderText: "Host IP Address"
                    text: sessionViewModel ? sessionViewModel.hostIp : ""
                    Layout.fillWidth: true
                    color: "#f4f4f5"
                    onTextChanged: if (sessionViewModel) sessionViewModel.hostIp = text
                }

                TextField {
                    placeholderText: "Pairing PIN"
                    text: sessionViewModel ? sessionViewModel.pairingPin : ""
                    Layout.fillWidth: true
                    color: "#f4f4f5"
                    passwordCharacter: "*"
                    echoMode: TextInput.Password
                    onTextChanged: if (sessionViewModel) sessionViewModel.pairingPin = text
                }

                Button {
                    text: (sessionViewModel && sessionViewModel.isConnected) ? "Disconnect" : "Connect"
                    Layout.fillWidth: true
                    background: Rectangle {
                        color: (sessionViewModel && sessionViewModel.isConnected) ? "#ef4444" : "#6366f1"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        if (!sessionViewModel) return;
                        if (sessionViewModel.isConnected) {
                            sessionViewModel.disconnectFromHost()
                        } else {
                            sessionViewModel.connectToHost()
                        }
                    }
                }
            }
        }
    }

    footer: TabBar {
        id: tabBar
        width: parent.width
        background: Rectangle { color: "#09090b" }

        TabButton {
            text: "🎤 Lyrics"
            contentItem: Text { text: parent.text; color: parent.checked ? "#6366f1" : "#a1a1aa"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            background: Rectangle { color: "transparent" }
        }
        TabButton {
            text: "⚙️ Connect"
            contentItem: Text { text: parent.text; color: parent.checked ? "#6366f1" : "#a1a1aa"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            background: Rectangle { color: "transparent" }
        }
    }
}
