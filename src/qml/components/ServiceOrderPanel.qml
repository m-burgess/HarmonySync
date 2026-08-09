import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Dialogs

Rectangle {
    id: root
    color: "#1e1e24"
    border.color: "#33333d"
    border.width: 1
    radius: 6

    FolderDialog {
        id: folderDialog
        title: "Select Service Order Directory"
        onAccepted: {
            var selectedPath = folderDialog.selectedFolder.toString();
            if (selectedPath.startsWith("file://")) {
                selectedPath = selectedPath.substring(7);
            }
            setlistViewModel.openServiceOrderRootFolder(selectedPath);
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 12

        // Header Section
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Label {
                text: "📋 Service Order"
                font.pixelSize: 15
                font.bold: true
                color: "#f4f4f5"
                Layout.fillWidth: true
            }

            Rectangle {
                width: 28
                height: 20
                radius: 10
                color: "#33333d"
                visible: setlistViewModel && setlistViewModel.itemCount > 0

                Text {
                    anchors.centerIn: parent
                    text: setlistViewModel ? setlistViewModel.itemCount : 0
                    color: "#a1a1aa"
                    font.pixelSize: 11
                    font.bold: true
                }
            }

            Button {
                id: openBtn
                text: "📁 Open Folder"
                font.pixelSize: 12
                font.bold: true

                background: Rectangle {
                    color: openBtn.hovered ? "#4f46e5" : "#6366f1"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text {
                    text: openBtn.text
                    color: "#ffffff"
                    font: openBtn.font
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: folderDialog.open()
            }
        }

        // Divider
        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#27272a"
        }

        // Empty State Guidance Placeholder
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true
            visible: setlistViewModel && setlistViewModel.itemCount === 0

            ColumnLayout {
                anchors.centerIn: parent
                spacing: 8

                Text {
                    text: "📂"
                    font.pixelSize: 36
                    Layout.alignment: Qt.AlignHCenter
                }

                Label {
                    text: "No Service Order Loaded"
                    color: "#f4f4f5"
                    font.pixelSize: 14
                    font.bold: true
                    Layout.alignment: Qt.AlignHCenter
                }

                Label {
                    text: "Click 'Open Folder' to load subfolders\nfrom Dropbox or Google Drive."
                    color: "#71717a"
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    Layout.alignment: Qt.AlignHCenter
                }
            }
        }

        // Setlist Items Subfolders List
        ListView {
            id: setlistView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 6
            visible: setlistViewModel && setlistViewModel.itemCount > 0
            model: setlistViewModel ? setlistViewModel.itemCount : 0

            delegate: Rectangle {
                id: itemRect
                width: setlistView.width
                height: 44
                radius: 6

                property bool isSelected: setlistViewModel && setlistViewModel.currentSongIndex === index
                property bool hasSongMap: setlistViewModel ? setlistViewModel.itemHasSongMapAt(index) : false
                property string itemName: setlistViewModel ? setlistViewModel.itemNameAt(index) : ""

                color: isSelected ? "#3730a3" : (mouseArea.containsMouse ? "#27272a" : "#18181b")
                border.color: isSelected ? "#6366f1" : (mouseArea.containsMouse ? "#3f3f46" : "#27272a")
                border.width: 1

                Behavior on color { ColorAnimation { duration: 150 } }

                // Active Selection Left Indicator Bar
                Rectangle {
                    width: 4
                    height: parent.height - 8
                    anchors.left: parent.left
                    anchors.verticalCenter: parent.verticalCenter
                    radius: 2
                    color: "#818cf8"
                    visible: itemRect.isSelected
                }

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: itemRect.isSelected ? 12 : 10
                    anchors.rightMargin: 8
                    spacing: 8

                    Text {
                        text: itemRect.hasSongMap ? "🎵" : "🖼️"
                        font.pixelSize: 15
                    }

                    Label {
                        text: (index + 1) + ". " + (itemRect.itemName !== "" ? itemRect.itemName : ("Item #" + (index + 1)))
                        color: itemRect.isSelected ? "#ffffff" : "#e4e4e7"
                        font.pixelSize: 13
                        font.bold: itemRect.isSelected
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    Rectangle {
                        width: 50
                        height: 20
                        radius: 4
                        color: itemRect.hasSongMap ? "#15803d" : "#0369a1"

                        Text {
                            anchors.centerIn: parent
                            text: itemRect.hasSongMap ? "SONG" : "MEDIA"
                            color: "#ffffff"
                            font.pixelSize: 10
                            font.bold: true
                        }
                    }

                    Button {
                        id: removeBtn
                        text: "✕"
                        font.pixelSize: 12
                        flat: true
                        onClicked: setlistViewModel.removeSongAt(index)
                    }
                }

                MouseArea {
                    id: mouseArea
                    anchors.fill: parent
                    hoverEnabled: true
                    onClicked: setlistViewModel.setCurrentSongIndex(index)
                }
            }
        }
    }
}
