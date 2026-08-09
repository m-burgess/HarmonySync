import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    color: "#1e1e24"
    border.color: "#33333d"
    border.width: 1
    radius: 6

    // Dynamic Column Collapsing Requirement (Skill C Directive)
    visible: setlistViewModel ? setlistViewModel.hasActiveSongMap : true

    // Subtle Indigo Left Accent Line
    Rectangle {
        width: 3
        height: parent.height - 16
        anchors.left: parent.left
        anchors.leftMargin: 2
        anchors.verticalCenter: parent.verticalCenter
        radius: 1.5
        color: "#6366f1"
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        anchors.leftMargin: 16
        spacing: 10

        // Panel Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Label {
                text: "🎤 Lyrics & Song Map"
                font.pixelSize: 15
                font.bold: true
                color: "#f4f4f5"
                Layout.fillWidth: true
            }

            Rectangle {
                width: 72
                height: 20
                radius: 4
                color: "#312e81"
                border.color: "#6366f1"

                Text {
                    anchors.centerIn: parent
                    text: "SONG ACTIVE"
                    color: "#a5b4fc"
                    font.pixelSize: 10
                    font.bold: true
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#27272a"
        }

        // Lyrics Scrollable Content
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            TextArea {
                text: "[ VERSE 1 ]\nAmazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see\n\n[ CHORUS ]\nMy chains are gone, I've been set free\nMy God, my Savior has ransomed me\nAnd like a flood His mercy reigns\nUnending love, amazing grace\n\n[ VERSE 2 ]\n'Twas grace that taught my heart to fear\nAnd grace my fears relieved..."
                color: "#e4e4e7"
                font.pixelSize: 14
                font.family: "Inter, Roboto, sans-serif"
                readOnly: true
                wrapMode: Text.Wrap
                background: null
                selectByMouse: true
            }
        }
    }
}
