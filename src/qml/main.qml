import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "components"

ApplicationWindow {
    id: window
    width: 1360
    height: 850
    visible: true
    title: "HarmonySync - C++ & Qt Worship Media System"
    color: "#0f0f12"

    SettingsDialog {
        id: settingsDialog
    }

    // Top Navigation & Header Bar
    header: ToolBar {
        background: Rectangle {
            color: "#09090b"
            border.color: "#27272a"
            border.width: 1
        }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 10
            spacing: 12

            RowLayout {
                spacing: 8

                Rectangle {
                    width: 10
                    height: 10
                    radius: 5
                    color: "#10b981"
                }

                Label {
                    text: "🎵 HarmonySync C++ / Qt 6 Engine"
                    font.pixelSize: 16
                    font.bold: true
                    color: "#f4f4f5"
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                width: 180
                height: 24
                radius: 12
                color: "#18181b"
                border.color: "#27272a"

                Text {
                    anchors.centerIn: parent
                    text: setlistViewModel ? setlistViewModel.title : "Sunday Service Order"
                    color: "#a1a1aa"
                    font.pixelSize: 12
                }
            }

            Button {
                id: settingsBtn
                text: "⚙️ Settings"
                font.pixelSize: 12
                font.bold: true

                background: Rectangle {
                    color: settingsBtn.hovered ? "#3f3f46" : "#27272a"
                    border.color: "#3f3f46"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text {
                    text: settingsBtn.text
                    color: "#f4f4f5"
                    font: settingsBtn.font
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: settingsDialog.open()
            }
        }
    }

    // Main Responsive Grid Layout Shell
    SplitView {
        anchors.fill: parent
        orientation: Qt.Horizontal

        // Left Pane: Service Order Subfolders List
        ServiceOrderPanel {
            SplitView.minimumWidth: 280
            SplitView.preferredWidth: 340
        }

        // Center Pane: Row with Lyrics and Slide Output
        RowLayout {
            SplitView.fillWidth: true
            SplitView.fillHeight: true
            spacing: 10

            // LyricsPanel shown when song map is active
            LyricsPanel {
                Layout.fillWidth: true
                Layout.fillHeight: true
                visible: setlistViewModel ? setlistViewModel.hasActiveSongMap : true
            }

            SlideDisplayPanel {
                Layout.fillWidth: true
                Layout.fillHeight: true
            }
        }

        // Right Pane: Stem Mixer Panel (Collapses dynamically when no audio stems present)
        StemMixerPanel {
            SplitView.preferredWidth: 300
            SplitView.minimumWidth: 260
            SplitView.fillHeight: true
            visible: setlistViewModel ? setlistViewModel.hasActiveSongMap : false
        }
    }

    // Status Footer Bar
    footer: ToolBar {
        background: Rectangle {
            color: "#09090b"
            border.color: "#27272a"
        }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 6
            spacing: 10

            Rectangle {
                width: 8
                height: 8
                radius: 4
                color: "#10b981"
            }

            Label {
                text: "Status: Ready | Mode: Cloud Service Order Directory | Engine: C++20 / Qt 6.10.2"
                color: "#71717a"
                font.pixelSize: 12
            }
        }
    }
}
