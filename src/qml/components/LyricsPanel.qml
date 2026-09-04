import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "../theme"
import HarmonySync.Helpers 1.0

Rectangle {
    id: root
    color: Theme.backgroundCard
    border.color: Theme.borderDark
    border.width: 1
    radius: Theme.borderRadius

    property bool isEditing: false
    property string jsonErrorMsg: ""
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

            // Check for metadata or chords and ignore them
            let lowerLine = line.toLowerCase()
            if (lowerLine.startsWith("title:") || 
                lowerLine.startsWith("artist:") || 
                lowerLine.startsWith("bpm:") || 
                lowerLine.startsWith("key:") || 
                lowerLine.startsWith("original key:") || 
                lowerLine.startsWith("timing:") || 
                lowerLine.startsWith("length:") || 
                lowerLine.startsWith("chords:") || 
                lowerLine.startsWith("lyricsurl:") ||
                lowerLine.startsWith("backgroundvideo:")) {
                continue
            }

            // Check if line is a section header e.g., [ VERSE 1 ]
            if (line.startsWith("[") && line.endsWith("]")) {
                // Ignore chord tags within brackets e.g. [Chords: 1-5-6-4]
                if (lowerLine.indexOf("chords:") !== -1) {
                    continue
                }
                
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
                        try {
                            let parsed = JSON.parse(lyricsEditor.text)
                            let formatted = JSON.stringify(parsed, null, 2)
                            if (setlistViewModel.saveSongMapJson(formatted)) {
                                root.jsonErrorMsg = ""
                                root.isEditing = false
                                // Since currentLyricsContent changed, parseLyrics gets called automatically
                            } else {
                                root.jsonErrorMsg = "Backend validation failed."
                            }
                        } catch (e) {
                            root.jsonErrorMsg = "Syntax Error: " + e.message
                        }
                    } else {
                        // Editing
                        lyricsEditor.text = setlistViewModel.currentSongMapJson
                        root.jsonErrorMsg = ""
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
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 4

                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded

                    TextArea {
                        id: lyricsEditor
                        color: Theme.textPrimary
                        font.pixelSize: 13
                        font.family: "Monospace"
                        wrapMode: Text.Wrap
                        background: Rectangle {
                            color: Theme.backgroundDark
                            border.color: root.jsonErrorMsg !== "" ? Theme.danger : Theme.accentPrimary
                            border.width: root.jsonErrorMsg !== "" ? 2 : 1
                            radius: 4
                        }
                        selectByMouse: true
                        
                        JsonSyntaxHighlighter {
                            textDocument: lyricsEditor.textDocument
                        }
                    }
                }

                Label {
                    text: root.jsonErrorMsg
                    color: Theme.danger
                    font.family: Theme.fontFamily
                    font.pixelSize: 12
                    font.bold: true
                    visible: root.jsonErrorMsg !== ""
                    Layout.fillWidth: true
                    wrapMode: Text.WordWrap
                }
            }
        }
    }

    // AI Progress Overlay
    Rectangle {
        id: aiProgressOverlay
        property bool isError: setlistViewModel ? setlistViewModel.aiSyncProgressMessage.startsWith("Error:") : false
        property bool isSuccess: setlistViewModel ? setlistViewModel.aiSyncProgressMessage.startsWith("Success:") : false
        property bool showMessage: isError || isSuccess
        
        anchors.fill: parent
        visible: (setlistViewModel && setlistViewModel.isGeneratingTimestamps) || (showMessage && hideTimer.running)
        color: Qt.rgba(Theme.backgroundDark.r, Theme.backgroundDark.g, Theme.backgroundDark.b, 0.95)
        radius: root.radius
        z: 10

        onShowMessageChanged: {
            if (showMessage) {
                hideTimer.restart()
            }
        }

        Timer {
            id: hideTimer
            interval: 4000 // Show success/errors for 4 seconds
            repeat: false
            onTriggered: {
                if (setlistViewModel) setlistViewModel.aiSyncProgressMessage = ""
            }
        }

        // Block mouse events
        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
        }

        ColumnLayout {
            anchors.centerIn: parent
            spacing: 24

            BusyIndicator {
                Layout.alignment: Qt.AlignHCenter
                running: aiProgressOverlay.visible && !aiProgressOverlay.showMessage
                visible: !aiProgressOverlay.showMessage
                width: 64
                height: 64
            }
            
            Rectangle {
                Layout.alignment: Qt.AlignHCenter
                visible: aiProgressOverlay.showMessage
                width: 64
                height: 64
                color: "transparent"
                Text {
                    anchors.centerIn: parent
                    text: aiProgressOverlay.isError ? "⚠" : "✓"
                    color: aiProgressOverlay.isError ? Theme.danger : Theme.success
                    font.pixelSize: 48
                }
            }

            Label {
                text: setlistViewModel ? setlistViewModel.aiSyncProgressMessage : ""
                font.family: Theme.fontFamily
                font.pixelSize: 22
                font.bold: true
                color: aiProgressOverlay.isError ? Theme.danger : (aiProgressOverlay.isSuccess ? Theme.success : Theme.textPrimary)
                Layout.alignment: Qt.AlignHCenter
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.WordWrap
                Layout.maximumWidth: root.width * 0.8
            }
        }
    }
}
