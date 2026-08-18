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
    property string rawLyricsText: setlistViewModel ? setlistViewModel.currentLyricsContent : ""
    onRawLyricsTextChanged: parseLyrics()
    property int activeSlideIndex: setlistViewModel ? setlistViewModel.activeLyricIndex : -1

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
        let globalLineIndex = 0
        let blockLineStart = 0

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim()
            if (line === "") {
                if (currentBlock !== "") {
                    lyricsModel.append({ "textBlock": currentBlock, "isHeader": false, "lineStart": blockLineStart })
                    currentBlock = ""
                    lineCount = 0
                }
                continue
            }

            // Check if line is a section header e.g., [ VERSE 1 ]
            if (line.startsWith("[") && line.endsWith("]")) {
                if (currentBlock !== "") {
                    lyricsModel.append({ "textBlock": currentBlock, "isHeader": isSectionHeader, "lineStart": blockLineStart })
                    currentBlock = ""
                    lineCount = 0
                }
                lyricsModel.append({ "textBlock": line, "isHeader": true, "lineStart": globalLineIndex })
                globalLineIndex++
                continue
            }

            if (currentBlock === "") {
                currentBlock = line
                isSectionHeader = false
                lineCount = 1
                blockLineStart = globalLineIndex
                globalLineIndex++
            } else {
                currentBlock += "\n" + line
                lineCount++
                globalLineIndex++
            }

            if (lineCount === 2) {
                lyricsModel.append({ "textBlock": currentBlock, "isHeader": false, "lineStart": blockLineStart })
                currentBlock = ""
                lineCount = 0
            }
        }
        
        // Append any remaining
        if (currentBlock !== "") {
            lyricsModel.append({ "textBlock": currentBlock, "isHeader": false, "lineStart": blockLineStart })
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

            // AUTO-SYNC TOGGLE
            RowLayout {
                spacing: 4
                Label {
                    text: "AUTO-SYNC"
                    font.family: Theme.fontFamily
                    font.pixelSize: 10
                    font.bold: true
                    color: Theme.textSecondary
                }
                Switch {
                    id: autoSyncSwitch
                    checked: setlistViewModel ? setlistViewModel.autoLyricsEnabled : false
                    onCheckedChanged: {
                        if (setlistViewModel && setlistViewModel.autoLyricsEnabled !== checked) {
                            setlistViewModel.autoLyricsEnabled = checked
                        }
                    }
                }
            }

            // AI ALIGN LYRICS BUTTON
            Button {
                id: aiAlignBtn
                text: (setlistViewModel && setlistViewModel.isGeneratingTimestamps) ? "GENERATING..." : "AI ALIGN LYRICS"
                enabled: setlistViewModel && !setlistViewModel.isGeneratingTimestamps
                font.pixelSize: 10
                font.bold: true
                font.family: Theme.fontFamily
                Layout.preferredHeight: 22
                background: Rectangle {
                    color: aiAlignBtn.enabled ? (aiAlignBtn.hovered ? Theme.accentHover : Theme.accentPrimary) : Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text {
                    text: aiAlignBtn.text
                    color: "#ffffff"
                    font: aiAlignBtn.font
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: {
                    if (setlistViewModel) {
                        setlistViewModel.generateAITimestamps("reference")
                    }
                }
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
                    property int blockIndex: index
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
                                if (setlistViewModel) {
                                    setlistViewModel.setActiveLyricIndex(index)
                                }
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
