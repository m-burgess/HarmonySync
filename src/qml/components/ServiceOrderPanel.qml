import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Dialogs
import "../theme"

Rectangle {
    id: root
    color: Theme.backgroundCard
    border.color: Theme.borderDark
    border.width: 1
    radius: Theme.borderRadius

    FolderDialog {
        id: folderDialog
        title: "Select Service Order Directory"
        palette.window: Theme.backgroundCard
        palette.windowText: Theme.textPrimary
        palette.base: Theme.backgroundDark
        palette.text: Theme.textPrimary
        palette.button: Theme.surfaceHover
        palette.buttonText: Theme.textPrimary
        palette.highlight: Theme.accentPrimary
        palette.highlightedText: Theme.textOnAccent
        palette.mid: Theme.borderDark
        palette.dark: Theme.textMuted
        palette.light: Theme.surfaceHover
        palette.placeholderText: Theme.textSecondary
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
                text: "SERVICE ORDER"
                font.family: Theme.fontFamily
                font.pixelSize: 13
                font.bold: true
                font.letterSpacing: 1.2
                color: Theme.textPrimary
                Layout.fillWidth: true
            }

            Rectangle {
                width: 28
                height: 20
                radius: 10
                color: Theme.backgroundDark
                border.color: Theme.borderDark
                visible: setlistViewModel && setlistViewModel.itemCount > 0

                Text {
                    anchors.centerIn: parent
                    text: setlistViewModel ? setlistViewModel.itemCount : 0
                    color: Theme.textSecondary
                    font.family: Theme.fontFamily
                    font.pixelSize: 11
                    font.bold: true
                }
            }

            Button {
                id: openBtn
                text: "OPEN FOLDER"
                font.family: Theme.fontFamily
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 0.5

                background: Rectangle {
                    color: openBtn.hovered ? Theme.accentHover : Theme.accentPrimary
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
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
            color: Theme.borderDark
        }

        // Empty State Guidance Placeholder
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true
            visible: setlistViewModel && setlistViewModel.itemCount === 0

            ColumnLayout {
                anchors.centerIn: parent
                spacing: 8

                Label {
                    text: "NO DIRECTORY LOADED"
                    color: Theme.textPrimary
                    font.family: Theme.fontFamily
                    font.pixelSize: 13
                    font.bold: true
                    font.letterSpacing: 1.0
                    Layout.alignment: Qt.AlignHCenter
                }

                Label {
                    text: "Click 'OPEN FOLDER' to load subfolders\nfrom Dropbox or Google Drive."
                    color: Theme.textSecondary
                    font.family: Theme.fontFamily
                    font.pixelSize: 11
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
                radius: 4

                property bool isSelected: setlistViewModel && setlistViewModel.currentSongIndex === index
                property bool hasSongMap: setlistViewModel ? setlistViewModel.itemHasSongMapAt(index) : false
                property string itemName: setlistViewModel ? setlistViewModel.itemNameAt(index) : ""

                color: isSelected ? Theme.accentActive : (mouseArea.containsMouse ? Theme.borderDark : Theme.backgroundDark)
                border.color: isSelected ? Theme.accentPrimary : (mouseArea.containsMouse ? Theme.borderDark : Theme.backgroundDark)
                border.width: 1

                Behavior on color { ColorAnimation { duration: Theme.animDuration } }

                // Active Selection Left Indicator Bar
                Rectangle {
                    width: 3
                    height: parent.height - 8
                    anchors.left: parent.left
                    anchors.verticalCenter: parent.verticalCenter
                    radius: 2
                    color: Theme.textPrimary
                    visible: itemRect.isSelected
                }

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: itemRect.isSelected ? 12 : 10
                    anchors.rightMargin: 8
                    spacing: 8

                    Rectangle {
                        width: 46
                        height: 20
                        radius: 3
                        color: itemRect.hasSongMap ? Theme.success : Theme.info
                        border.color: itemRect.hasSongMap ? Qt.darker(Theme.success, 1.2) : Qt.darker(Theme.info, 1.2)

                        Text {
                            anchors.centerIn: parent
                            text: itemRect.hasSongMap ? "SONG" : "MEDIA"
                            color: "#ffffff"
                            font.family: Theme.fontFamily
                            font.pixelSize: 10
                            font.bold: true
                        }
                    }

                    Label {
                        text: (index + 1) + ". " + (itemRect.itemName !== "" ? itemRect.itemName : ("Item #" + (index + 1)))
                        color: itemRect.isSelected ? "#ffffff" : Theme.textPrimary
                        font.family: Theme.fontFamily
                        font.pixelSize: 12
                        font.bold: itemRect.isSelected
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    Button {
                        id: removeBtn
                        text: "✕"
                        font.pixelSize: 11
                        font.bold: true
                        font.family: Theme.fontFamily
                        Layout.preferredWidth: 24
                        Layout.preferredHeight: 24
                        background: Rectangle {
                            color: removeBtn.hovered ? Theme.danger : "transparent"
                            radius: 12
                            Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                        }
                        contentItem: Text { 
                            text: parent.text; 
                            color: removeBtn.hovered ? "#ffffff" : Theme.textSecondary; 
                            font: parent.font; 
                            horizontalAlignment: Text.AlignHCenter; 
                            verticalAlignment: Text.AlignVCenter 
                        }
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
