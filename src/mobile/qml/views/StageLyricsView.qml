import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    color: "#0f0f12"

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 16

        // Header: Active Song Title and Timer
        RowLayout {
            Layout.fillWidth: true

            Label {
                text: confidenceViewModel ? confidenceViewModel.currentSongTitle : "No Active Song"
                color: "#a5b4fc"
                font.pixelSize: 18
                font.bold: true
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }

            Rectangle {
                width: 80
                height: 30
                radius: 15
                color: "#1e1b4b"
                border.color: "#6366f1"

                Text {
                    anchors.centerIn: parent
                    text: confidenceViewModel ? confidenceViewModel.timerText : "00:00"
                    color: "#f4f4f5"
                    font.pixelSize: 14
                    font.bold: true
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#27272a"
        }

        // Active Lyric Line (Current)
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 180
            color: "#1e1e24"
            radius: 12
            border.color: "#4f46e5"
            border.width: 2

            Text {
                anchors.fill: parent
                anchors.margins: 16
                text: confidenceViewModel ? confidenceViewModel.currentLyricLine : "No Active Lyric"
                color: "#ffffff"
                font.pixelSize: 32
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                wrapMode: Text.WordWrap
                minimumPixelSize: 16
                fontSizeMode: Text.Fit
            }
        }

        // Next Lyric Line (Preview)
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 120
            color: "#18181b"
            radius: 12
            border.color: "#3f3f46"
            border.width: 1

            Text {
                anchors.fill: parent
                anchors.margins: 16
                text: confidenceViewModel ? confidenceViewModel.nextLyricLine : ""
                color: "#a1a1aa"
                font.pixelSize: 22
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                wrapMode: Text.WordWrap
                minimumPixelSize: 14
                fontSizeMode: Text.Fit
            }
        }

        Item { Layout.fillHeight: true } // spacer
    }
}
