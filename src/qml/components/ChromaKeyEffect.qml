import QtQuick
import QtQuick.Controls

Item {
    id: root
    width: 1920
    height: 1080

    property color keyColor: "#00FF00"
    property real thresholdSensitivity: 0.4
    property real smoothing: 0.1
    property bool chromaKeyEnabled: true

    Rectangle {
        anchors.fill: parent
        color: "#0B0F19"

        Text {
            anchors.centerIn: parent
            text: root.chromaKeyEnabled ? "GPU Chroma Key Engine Active (Key: " + root.keyColor + ")" : "Raw Background Stream"
            color: root.chromaKeyEnabled ? "#10B981" : "#94A3B8"
            font.pixelSize: 24
            font.bold: true
        }
    }
}
