import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "../theme"

Rectangle {
    id: root
    color: Theme.backgroundCard
    border.color: Theme.borderDark
    border.width: 1
    radius: Theme.borderRadius

    property bool isEditing: false
    property string rawLyricsText: "[ VERSE 1 ]\nAmazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see\n\n[ CHORUS ]\nMy chains are gone, I've been set free\nMy God, my Savior has ransomed me\nAnd like a flood His mercy reigns\nUnending love, amazing grace"
    property int activeSlideIndex: -1

    // Dynamic Column Collapsing Requirement
    visible: setlistViewModel ? setlistViewModel.hasActiveSongMap : true

    // Subtle Left Accent Line
    Rectangle {
        width: 3
        height: parent.height - 16
        anchors.left: parent.left
        anchors.leftMargin: 2
        anchors.verticalCenter: parent.verticalCenter
        radius: 1.5
        color: Theme.accentPrimary
    }

    // Logic to parse raw text into 2-line blocks
    function parseLyrics() {
        lyricsModel.clear()
        
        let lines = root.rawLyricsText.split(/\r?\n/)
        let currentBlock = ""
        let lineCount = 0
        let isSectionHeader = false

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim()
            if (line === "") {
                if (currentBlock !== "") {
                    lyricsModel.append({ "textBlock": currentBlock, "isHeader": false })
                    currentBlock = ""
                    lineCount = 0
                }
                continue
            }

            // Check if line is a section header e.g., [ VERSE 1 ]
            if (line.startsWith("[") && line.endsWith("]")) {
                if (currentBlock !== "") {
                    lyricsModel.append({ "textBlock": currentBlock, "isHeader": isSectionHeader })
                    currentBlock = ""
                    lineCount = 0
                }
                lyricsModel.append({ "textBlock": line, "isHeader": true })
                continue
            }

            if (currentBlock === "") {
                currentBlock = line
                isSectionHeader = false
                lineCount = 1
            } else {
                currentBlock += "\n" + line
                lineCount++
            }

            if (lineCount === 2) {
                lyricsModel.append({ "textBlock": currentBlock, "isHeader": false })
                currentBlock = ""
                lineCount = 0
            }
        }
        
        // Append any remaining
        if (currentBlock !== "") {
            lyricsModel.append({ "textBlock": currentBlock, "isHeader": false })
        }
    }

    Component.onCompleted: {
        parseLyrics()
    }

    ListModel {
        id: lyricsModel
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        anchors.leftMargin: 16
        spacing: 12

        // Panel Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Label {
                text: "LYRICS & SONG MAP"
                font.family: Theme.fontFamily
                font.pixelSize: 13
                font.bold: true
                color: Theme.textPrimary
                font.letterSpacing: 1.2
                Layout.fillWidth: true
            }

            Button {
                id: editBtn
                text: root.isEditing ? "SAVE" : "EDIT"
                font.pixelSize: 10
                font.bold: true
                font.family: Theme.fontFamily
                Layout.preferredHeight: 22
                background: Rectangle {
                    color: root.isEditing ? Theme.success : (editBtn.hovered ? Theme.borderDark : "transparent")
                    border.color: root.isEditing ? Theme.success : Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text {
                    text: editBtn.text
                    color: (root.isEditing || editBtn.hovered) ? "#ffffff" : Theme.textPrimary
                    font: editBtn.font
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: {
                    if (root.isEditing) {
                        // Saving
                        root.rawLyricsText = lyricsEditor.text
                        parseLyrics()
                        root.isEditing = false
                    } else {
                        // Editing
                        lyricsEditor.text = root.rawLyricsText
                        root.isEditing = true
                    }
                }
            }

            Rectangle {
                width: 72
                height: 20
                radius: 4
                color: Qt.darker(Theme.accentPrimary, 1.8)
                border.color: Theme.accentPrimary
                border.width: 1

                Text {
                    anchors.centerIn: parent
                    text: "SONG ACTIVE"
                    color: "#ffffff"
                    font.family: Theme.fontFamily
                    font.pixelSize: 10
                    font.bold: true
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: Theme.borderDark
        }

        // Lyrics Content Area
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: root.isEditing ? 1 : 0

            // View Mode: Clickable List
            ListView {
                id: lyricsListView
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                model: lyricsModel
                spacing: 6
                ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

                delegate: Rectangle {
                    width: ListView.view.width
                    height: isHeader ? 28 : 60
                    radius: 4
                    color: root.activeSlideIndex === index ? Theme.accentPrimary : (mouseArea.containsMouse ? Theme.borderDark : "transparent")
                    border.color: root.activeSlideIndex === index ? Theme.accentPrimary : Theme.borderDark
                    border.width: isHeader ? 0 : 1

                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }

                    Text {
                        anchors.fill: parent
                        anchors.margins: 10
                        text: textBlock
                        color: (root.activeSlideIndex === index || isHeader) ? "#ffffff" : Theme.textPrimary
                        font.pixelSize: isHeader ? 12 : 14
                        font.family: Theme.fontFamily
                        font.bold: isHeader
                        wrapMode: Text.WordWrap
                        verticalAlignment: Text.AlignVCenter
                        opacity: isHeader ? 0.6 : 1.0
                    }

                    MouseArea {
                        id: mouseArea
                        anchors.fill: parent
                        hoverEnabled: true
                        onClicked: {
                            if (!isHeader) {
                                root.activeSlideIndex = index
                                window.activeLyricText = textBlock
                                
                                let foundNext = false
                                for (let i = index + 1; i < lyricsModel.count; i++) {
                                    let item = lyricsModel.get(i)
                                    if (!item.isHeader) {
                                        window.nextLyricText = item.textBlock
                                        foundNext = true
                                        break
                                    }
                                }
                                if (!foundNext) window.nextLyricText = "---"
                            }
                        }
                    }
                }
            }

            // Edit Mode: Raw Text Editor
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
                ScrollBar.vertical.policy: ScrollBar.AsNeeded

                TextArea {
                    id: lyricsEditor
                    color: Theme.textPrimary
                    font.pixelSize: 14
                    font.family: Theme.fontFamily
                    wrapMode: Text.Wrap
                    background: Rectangle {
                        color: Theme.backgroundDark
                        border.color: Theme.accentPrimary
                        border.width: 1
                        radius: 4
                    }
                    selectByMouse: true
                }
            }
        }
    }
}
