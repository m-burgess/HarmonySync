import QtQuick
import QtQuick.Controls

Item {
    id: root
    width: 1920
    height: 200
    anchors.bottom: parent.bottom
    anchors.bottomMargin: 40

    property string songTitle: "Way Maker"
    property string songArtist: "Sinach"
    property bool overlayVisible: true

    Rectangle {
        anchors.left: parent.left
        anchors.leftMargin: 80
        width: contentRow.width + 40
        height: 100
        radius: 12
        color: "#E00B0F19"
        border.color: "#3B82F6"
        border.width: 2
        visible: root.overlayVisible

        Row {
            id: contentRow
            anchors.centerIn: parent
            spacing: 20

            Rectangle {
                width: 6
                height: 60
                color: "#3B82F6"
                radius: 3
            }

            Column {
                anchors.verticalCenter: parent.verticalCenter
                spacing: 4

                Text {
                    text: root.songTitle
                    color: "#FFFFFF"
                    font.pixelSize: 26
                    font.bold: true
                }

                Text {
                    text: root.songArtist
                    color: "#94A3B8"
                    font.pixelSize: 18
                }
            }
        }
    }
}
