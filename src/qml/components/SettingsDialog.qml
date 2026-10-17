import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "../theme"

Dialog {
    id: root
    width: 700
    height: 580
    modal: true
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    padding: 0

    background: Rectangle {
        color: Theme.backgroundCard
        border.color: Theme.borderDark
        border.width: 1
        radius: Theme.borderRadius
    }

    contentItem: ColumnLayout {
        spacing: 0

        // Custom Themed Header Bar
        Rectangle {
            Layout.fillWidth: true
            height: 48
            color: Theme.backgroundHeader
            border.color: Theme.borderDark
            border.width: 1
            radius: Theme.borderRadius

            // Square off bottom corners so it sits flush with dialog
            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: Theme.borderRadius
                color: Theme.backgroundHeader
            }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 18
                anchors.rightMargin: 12

                Label {
                    text: "SETTINGS & CONFIGURATION"
                    color: Theme.textPrimary
                    font.family: Theme.fontFamily
                    font.pixelSize: Theme.fontSizeHeader
                    font.bold: true
                    font.letterSpacing: 1.2
                    Layout.alignment: Qt.AlignVCenter
                }

                Item { Layout.fillWidth: true }

                Button {
                    id: closeHeaderBtn
                    text: "✕"
                    font.pixelSize: 13
                    font.bold: true
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    background: Rectangle {
                        color: closeHeaderBtn.hovered ? Theme.surfaceHover : "transparent"
                        radius: 4
                    }
                    contentItem: Text {
                        text: closeHeaderBtn.text
                        color: closeHeaderBtn.hovered ? Theme.textPrimary : Theme.textSecondary
                        font: closeHeaderBtn.font
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: root.close()
                }
            }
        }

        // Dialog Body
        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 18
            spacing: 16

            // Styled Navigation TabBar
            TabBar {
                id: tabBar
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                background: Rectangle {
                    color: Theme.backgroundDark
                    radius: 4
                    border.color: Theme.borderDark
                    border.width: 1
                }

                component StyledTabButton: TabButton {
                    id: btn
                    font.family: Theme.fontFamily
                    font.pixelSize: Theme.fontSizeSmall
                    font.bold: true
                    background: Rectangle {
                        color: btn.checked ? Theme.backgroundCard : (btn.hovered ? Theme.surfaceHover : "transparent")
                        border.color: btn.checked ? Theme.accentPrimary : "transparent"
                        border.width: btn.checked ? 1 : 0
                        radius: 3
                        Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                    }
                    contentItem: Text {
                        text: btn.text
                        color: btn.checked ? Theme.accentPrimary : (btn.hovered ? Theme.textPrimary : Theme.textSecondary)
                        font: btn.font
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                StyledTabButton { text: "DISPLAYS" }
                StyledTabButton { text: "TYPOGRAPHY" }
                StyledTabButton { text: "ALIGNMENT & MARGINS" }
                StyledTabButton { text: "PRE-SERVICE MUSIC" }
                StyledTabButton { text: "NETWORK & SYNC" }
            }

            // Tabs Content Area
            StackLayout {
                id: stackLayout
                Layout.fillWidth: true
                Layout.fillHeight: true
                currentIndex: tabBar.currentIndex

                // Tab 0: DISPLAYS
                ColumnLayout {
                    spacing: 14

                    Label {
                        text: "Display routing for main projection and musician confidence monitors."
                        color: Theme.textSecondary
                        font.family: Theme.fontFamily
                        font.pixelSize: Theme.fontSizeBody
                    }

                    RowLayout {
                        Layout.fillWidth: true

                        Label {
                            text: "Presentation Output Display:"
                            color: Theme.textPrimary
                            font.bold: true
                            font.pixelSize: Theme.fontSizeBody
                            font.family: Theme.fontFamily
                            Layout.fillWidth: true
                        }

                        Button {
                            id: refreshBtn
                            text: "REFRESH DISPLAYS"
                            font.pixelSize: Theme.fontSizeSmall
                            font.bold: true
                            font.family: Theme.fontFamily
                            Layout.preferredHeight: 28
                            background: Rectangle {
                                color: refreshBtn.hovered ? Theme.surfaceHover : "transparent"
                                border.color: refreshBtn.hovered ? Theme.accentPrimary : Theme.borderDark
                                radius: 4
                                Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                            }
                            contentItem: Text {
                                text: refreshBtn.text
                                color: refreshBtn.hovered ? Theme.textPrimary : Theme.textSecondary
                                font: refreshBtn.font
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                            onClicked: { if (settingsViewModel) settingsViewModel.refreshDisplays() }
                        }
                    }

                    ComboBox {
                        id: presentationCombo
                        Layout.fillWidth: true
                        Layout.preferredHeight: 34
                        font.family: Theme.fontFamily
                        font.pixelSize: Theme.fontSizeBody
                        model: settingsViewModel ? settingsViewModel.availableDisplayNames : ["Display 1: Main Control Monitor (1920x1080)", "Display 2: Projector / Main Audience (1920x1080)"]
                        currentIndex: settingsViewModel && model.length > 0 ? Math.min(Math.max(0, settingsViewModel.presentationDisplayIndex - 1), model.length - 1) : 0
                        onActivated: function(index) {
                            if (settingsViewModel) settingsViewModel.presentationDisplayIndex = index + 1
                        }

                        background: Rectangle {
                            color: Theme.inputBackground
                            border.color: presentationCombo.hovered || presentationCombo.activeFocus ? Theme.accentPrimary : Theme.borderDark
                            radius: 4
                        }
                        contentItem: Text {
                            text: presentationCombo.currentText
                            color: Theme.textPrimary
                            font: presentationCombo.font
                            verticalAlignment: Text.AlignVCenter
                            leftPadding: 10
                            elide: Text.ElideRight
                        }
                        popup: Popup {
                            y: presentationCombo.height + 2
                            width: presentationCombo.width
                            implicitHeight: Math.min(200, contentItem.implicitHeight + 8)
                            padding: 4
                            contentItem: ListView {
                                clip: true
                                implicitHeight: contentHeight
                                model: presentationCombo.popup.visible ? presentationCombo.delegateModel : null
                                currentIndex: presentationCombo.highlightedIndex
                                ScrollIndicator.vertical: ScrollIndicator { }
                            }
                            background: Rectangle {
                                color: Theme.backgroundCard
                                border.color: Theme.borderDark
                                radius: 4
                            }
                        }
                        delegate: ItemDelegate {
                            width: presentationCombo.width - 8
                            implicitHeight: 30
                            contentItem: Text {
                                text: modelData
                                color: highlighted ? Theme.textOnAccent : Theme.textPrimary
                                font: presentationCombo.font
                                elide: Text.ElideRight
                                verticalAlignment: Text.AlignVCenter
                                leftPadding: 8
                            }
                            background: Rectangle {
                                color: highlighted ? Theme.accentPrimary : "transparent"
                                radius: 3
                            }
                        }
                    }

                    Item { height: 4 }

                    Label {
                        text: "Stage Confidence Monitor Display:"
                        color: Theme.textPrimary
                        font.bold: true
                        font.pixelSize: Theme.fontSizeBody
                        font.family: Theme.fontFamily
                    }

                    ComboBox {
                        id: confidenceCombo
                        Layout.fillWidth: true
                        Layout.preferredHeight: 34
                        font.family: Theme.fontFamily
                        font.pixelSize: Theme.fontSizeBody
                        model: settingsViewModel ? settingsViewModel.availableDisplayNames : ["Display 1: Main Control Monitor (1920x1080)", "Display 3: Stage Confidence Monitor (1920x1080)"]
                        currentIndex: settingsViewModel && model.length > 0 ? Math.min(Math.max(0, settingsViewModel.confidenceDisplayIndex - 1), model.length - 1) : 1
                        onActivated: function(index) {
                            if (settingsViewModel) settingsViewModel.confidenceDisplayIndex = index + 1
                        }

                        background: Rectangle {
                            color: Theme.inputBackground
                            border.color: confidenceCombo.hovered || confidenceCombo.activeFocus ? Theme.accentPrimary : Theme.borderDark
                            radius: 4
                        }
                        contentItem: Text {
                            text: confidenceCombo.currentText
                            color: Theme.textPrimary
                            font: confidenceCombo.font
                            verticalAlignment: Text.AlignVCenter
                            leftPadding: 10
                            elide: Text.ElideRight
                        }
                        popup: Popup {
                            y: confidenceCombo.height + 2
                            width: confidenceCombo.width
                            implicitHeight: Math.min(200, contentItem.implicitHeight + 8)
                            padding: 4
                            contentItem: ListView {
                                clip: true
                                implicitHeight: contentHeight
                                model: confidenceCombo.popup.visible ? confidenceCombo.delegateModel : null
                                currentIndex: confidenceCombo.highlightedIndex
                                ScrollIndicator.vertical: ScrollIndicator { }
                            }
                            background: Rectangle {
                                color: Theme.backgroundCard
                                border.color: Theme.borderDark
                                radius: 4
                            }
                        }
                        delegate: ItemDelegate {
                            width: confidenceCombo.width - 8
                            implicitHeight: 30
                            contentItem: Text {
                                text: modelData
                                color: highlighted ? Theme.textOnAccent : Theme.textPrimary
                                font: confidenceCombo.font
                                elide: Text.ElideRight
                                verticalAlignment: Text.AlignVCenter
                                leftPadding: 8
                            }
                            background: Rectangle {
                                color: highlighted ? Theme.accentPrimary : "transparent"
                                radius: 3
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }
                }

                // Tab 1: TYPOGRAPHY
                ColumnLayout {
                    spacing: 14

                    Label {
                        text: "Font family, point sizes, and text coloring for audience slides and broadcast lower thirds."
                        color: Theme.textSecondary
                        font.family: Theme.fontFamily
                        font.pixelSize: Theme.fontSizeBody
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 20

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label { text: "Lyrics Font Size (pt):"; color: Theme.textPrimary; font.bold: true; font.pixelSize: Theme.fontSizeBody; font.family: Theme.fontFamily }
                            SpinBox {
                                id: lyricsFontSpin
                                Layout.fillWidth: true
                                from: 20; to: 120
                                value: settingsViewModel ? settingsViewModel.lyricsFontSize : 48
                                onValueChanged: if (settingsViewModel) settingsViewModel.lyricsFontSize = value
                                contentItem: TextInput {
                                    text: lyricsFontSpin.textFromValue(lyricsFontSpin.value, lyricsFontSpin.locale)
                                    font.family: Theme.fontFamily
                                    font.pixelSize: Theme.fontSizeBody
                                    color: Theme.textPrimary
                                    selectionColor: Theme.accentPrimary
                                    selectedTextColor: Theme.textOnAccent
                                    horizontalAlignment: Qt.AlignHCenter
                                    verticalAlignment: Qt.AlignVCenter
                                    readOnly: !lyricsFontSpin.editable
                                    validator: lyricsFontSpin.validator
                                    inputMethodHints: Qt.ImhFormattedNumbersOnly
                                }
                                background: Rectangle {
                                    color: Theme.inputBackground
                                    border.color: Theme.borderDark
                                    radius: 4
                                }
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label { text: "Lower Third Font Size (pt):"; color: Theme.textPrimary; font.bold: true; font.pixelSize: Theme.fontSizeBody; font.family: Theme.fontFamily }
                            SpinBox {
                                id: lowerThirdFontSpin
                                Layout.fillWidth: true
                                from: 14; to: 60
                                value: settingsViewModel ? settingsViewModel.lowerThirdFontSize : 26
                                onValueChanged: if (settingsViewModel) settingsViewModel.lowerThirdFontSize = value
                                contentItem: TextInput {
                                    text: lowerThirdFontSpin.textFromValue(lowerThirdFontSpin.value, lowerThirdFontSpin.locale)
                                    font.family: Theme.fontFamily
                                    font.pixelSize: Theme.fontSizeBody
                                    color: Theme.textPrimary
                                    selectionColor: Theme.accentPrimary
                                    selectedTextColor: Theme.textOnAccent
                                    horizontalAlignment: Qt.AlignHCenter
                                    verticalAlignment: Qt.AlignVCenter
                                    readOnly: !lowerThirdFontSpin.editable
                                    validator: lowerThirdFontSpin.validator
                                    inputMethodHints: Qt.ImhFormattedNumbersOnly
                                }
                                background: Rectangle {
                                    color: Theme.inputBackground
                                    border.color: Theme.borderDark
                                    radius: 4
                                }
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 20

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label { text: "Font Family:"; color: Theme.textPrimary; font.bold: true; font.pixelSize: Theme.fontSizeBody; font.family: Theme.fontFamily }
                            TextField {
                                id: fontField
                                Layout.fillWidth: true
                                text: settingsViewModel ? settingsViewModel.fontFamily : "Inter"
                                font.family: Theme.fontFamily
                                font.pixelSize: Theme.fontSizeBody
                                color: Theme.textPrimary
                                selectionColor: Theme.accentPrimary
                                selectedTextColor: Theme.textOnAccent
                                placeholderText: "e.g. Inter, Roboto, Arial"
                                placeholderTextColor: Theme.textMuted
                                background: Rectangle {
                                    color: Theme.inputBackground
                                    border.color: fontField.activeFocus ? Theme.accentPrimary : Theme.borderDark
                                    radius: 4
                                }
                                onTextChanged: if (settingsViewModel) settingsViewModel.fontFamily = text
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label { text: "Text Color (Hex):"; color: Theme.textPrimary; font.bold: true; font.pixelSize: Theme.fontSizeBody; font.family: Theme.fontFamily }
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                TextField {
                                    id: colorField
                                    Layout.fillWidth: true
                                    text: settingsViewModel ? settingsViewModel.textColorHex : "#FFFFFF"
                                    font.family: Theme.fontFamily
                                    font.pixelSize: Theme.fontSizeBody
                                    color: Theme.textPrimary
                                    selectionColor: Theme.accentPrimary
                                    selectedTextColor: Theme.textOnAccent
                                    placeholderText: "#FFFFFF"
                                    placeholderTextColor: Theme.textMuted
                                    background: Rectangle {
                                        color: Theme.inputBackground
                                        border.color: colorField.activeFocus ? Theme.accentPrimary : Theme.borderDark
                                        radius: 4
                                    }
                                    onTextChanged: if (settingsViewModel) settingsViewModel.textColorHex = text
                                }

                                Rectangle {
                                    width: 32
                                    height: 32
                                    radius: 4
                                    color: {
                                        try { return colorField.text.trim(); }
                                        catch (e) { return "#FFFFFF"; }
                                    }
                                    border.color: Theme.borderDark
                                    border.width: 1
                                }
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }
                }

                // Tab 2: ALIGNMENT & MARGINS
                ColumnLayout {
                    spacing: 14

                    Label {
                        text: "Horizontal and vertical alignment anchors and pixel coordinate offsets."
                        color: Theme.textSecondary
                        font.family: Theme.fontFamily
                        font.pixelSize: Theme.fontSizeBody
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 20

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label { text: "Horizontal Alignment:"; color: Theme.textPrimary; font.bold: true; font.pixelSize: Theme.fontSizeBody; font.family: Theme.fontFamily }
                            ComboBox {
                                id: hAlignCombo
                                Layout.fillWidth: true
                                Layout.preferredHeight: 34
                                model: ["Left", "Center", "Right"]
                                currentIndex: settingsViewModel ? settingsViewModel.hAlign : 1
                                onActivated: function(index) {
                                    if (settingsViewModel) settingsViewModel.hAlign = index
                                }
                                background: Rectangle {
                                    color: Theme.inputBackground
                                    border.color: hAlignCombo.hovered || hAlignCombo.activeFocus ? Theme.accentPrimary : Theme.borderDark
                                    radius: 4
                                }
                                contentItem: Text {
                                    text: hAlignCombo.currentText
                                    color: Theme.textPrimary
                                    font.family: Theme.fontFamily
                                    font.pixelSize: Theme.fontSizeBody
                                    verticalAlignment: Text.AlignVCenter
                                    leftPadding: 10
                                }
                                popup: Popup {
                                    y: hAlignCombo.height + 2
                                    width: hAlignCombo.width
                                    implicitHeight: contentItem.implicitHeight + 8
                                    padding: 4
                                    contentItem: ListView {
                                        clip: true
                                        implicitHeight: contentHeight
                                        model: hAlignCombo.popup.visible ? hAlignCombo.delegateModel : null
                                        currentIndex: hAlignCombo.highlightedIndex
                                    }
                                    background: Rectangle {
                                        color: Theme.backgroundCard
                                        border.color: Theme.borderDark
                                        radius: 4
                                    }
                                }
                                delegate: ItemDelegate {
                                    width: hAlignCombo.width - 8
                                    implicitHeight: 30
                                    contentItem: Text {
                                        text: modelData
                                        color: highlighted ? Theme.textOnAccent : Theme.textPrimary
                                        font.family: Theme.fontFamily
                                        font.pixelSize: Theme.fontSizeBody
                                        verticalAlignment: Text.AlignVCenter
                                        leftPadding: 8
                                    }
                                    background: Rectangle {
                                        color: highlighted ? Theme.accentPrimary : "transparent"
                                        radius: 3
                                    }
                                }
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label { text: "Vertical Alignment:"; color: Theme.textPrimary; font.bold: true; font.pixelSize: Theme.fontSizeBody; font.family: Theme.fontFamily }
                            ComboBox {
                                id: vAlignCombo
                                Layout.fillWidth: true
                                Layout.preferredHeight: 34
                                model: ["Top", "Center", "Bottom"]
                                currentIndex: settingsViewModel ? settingsViewModel.vAlign : 2
                                onActivated: function(index) {
                                    if (settingsViewModel) settingsViewModel.vAlign = index
                                }
                                background: Rectangle {
                                    color: Theme.inputBackground
                                    border.color: vAlignCombo.hovered || vAlignCombo.activeFocus ? Theme.accentPrimary : Theme.borderDark
                                    radius: 4
                                }
                                contentItem: Text {
                                    text: vAlignCombo.currentText
                                    color: Theme.textPrimary
                                    font.family: Theme.fontFamily
                                    font.pixelSize: Theme.fontSizeBody
                                    verticalAlignment: Text.AlignVCenter
                                    leftPadding: 10
                                }
                                popup: Popup {
                                    y: vAlignCombo.height + 2
                                    width: vAlignCombo.width
                                    implicitHeight: contentItem.implicitHeight + 8
                                    padding: 4
                                    contentItem: ListView {
                                        clip: true
                                        implicitHeight: contentHeight
                                        model: vAlignCombo.popup.visible ? vAlignCombo.delegateModel : null
                                        currentIndex: vAlignCombo.highlightedIndex
                                    }
                                    background: Rectangle {
                                        color: Theme.backgroundCard
                                        border.color: Theme.borderDark
                                        radius: 4
                                    }
                                }
                                delegate: ItemDelegate {
                                    width: vAlignCombo.width - 8
                                    implicitHeight: 30
                                    contentItem: Text {
                                        text: modelData
                                        color: highlighted ? Theme.textOnAccent : Theme.textPrimary
                                        font.family: Theme.fontFamily
                                        font.pixelSize: Theme.fontSizeBody
                                        verticalAlignment: Text.AlignVCenter
                                        leftPadding: 8
                                    }
                                    background: Rectangle {
                                        color: highlighted ? Theme.accentPrimary : "transparent"
                                        radius: 3
                                    }
                                }
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 20

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label { text: "Margin Offset X (px):"; color: Theme.textPrimary; font.bold: true; font.pixelSize: Theme.fontSizeBody; font.family: Theme.fontFamily }
                            SpinBox {
                                id: offsetXSpin
                                Layout.fillWidth: true
                                from: -500; to: 500
                                value: settingsViewModel ? settingsViewModel.marginOffsetX : 0
                                onValueChanged: if (settingsViewModel) settingsViewModel.marginOffsetX = value
                                contentItem: TextInput {
                                    text: offsetXSpin.textFromValue(offsetXSpin.value, offsetXSpin.locale)
                                    font.family: Theme.fontFamily
                                    font.pixelSize: Theme.fontSizeBody
                                    color: Theme.textPrimary
                                    selectionColor: Theme.accentPrimary
                                    selectedTextColor: Theme.textOnAccent
                                    horizontalAlignment: Qt.AlignHCenter
                                    verticalAlignment: Qt.AlignVCenter
                                    readOnly: !offsetXSpin.editable
                                    validator: offsetXSpin.validator
                                    inputMethodHints: Qt.ImhFormattedNumbersOnly
                                }
                                background: Rectangle {
                                    color: Theme.inputBackground
                                    border.color: Theme.borderDark
                                    radius: 4
                                }
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label { text: "Margin Offset Y (px):"; color: Theme.textPrimary; font.bold: true; font.pixelSize: Theme.fontSizeBody; font.family: Theme.fontFamily }
                            SpinBox {
                                id: offsetYSpin
                                Layout.fillWidth: true
                                from: -500; to: 500
                                value: settingsViewModel ? settingsViewModel.marginOffsetY : 40
                                onValueChanged: if (settingsViewModel) settingsViewModel.marginOffsetY = value
                                contentItem: TextInput {
                                    text: offsetYSpin.textFromValue(offsetYSpin.value, offsetYSpin.locale)
                                    font.family: Theme.fontFamily
                                    font.pixelSize: Theme.fontSizeBody
                                    color: Theme.textPrimary
                                    selectionColor: Theme.accentPrimary
                                    selectedTextColor: Theme.textOnAccent
                                    horizontalAlignment: Qt.AlignHCenter
                                    verticalAlignment: Qt.AlignVCenter
                                    readOnly: !offsetYSpin.editable
                                    validator: offsetYSpin.validator
                                    inputMethodHints: Qt.ImhFormattedNumbersOnly
                                }
                                background: Rectangle {
                                    color: Theme.inputBackground
                                    border.color: Theme.borderDark
                                    radius: 4
                                }
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }
                }

                // Tab 3: PRE-SERVICE MUSIC
                ColumnLayout {
                    spacing: 14

                    Label {
                        text: "Default Pre-Service / Walk-In Background Music Link"
                        color: Theme.accentPrimary
                        font.bold: true
                        font.pixelSize: Theme.fontSizeHeader
                        font.family: Theme.fontFamily
                    }

                    Label {
                        text: "Specify a default web playlist or stream (e.g. YouTube, Spotify, or web stream). When loaded, the WALK-IN MUSIC button on the header automatically connects to this URL if no song-specific playlist is provided in the service order."
                        color: Theme.textSecondary
                        font.family: Theme.fontFamily
                        font.pixelSize: Theme.fontSizeBody
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }

                    Label {
                        text: "Pre-Service Music URL:"
                        color: Theme.textPrimary
                        font.bold: true
                        font.pixelSize: Theme.fontSizeBody
                        font.family: Theme.fontFamily
                    }

                    TextField {
                        id: preServiceUrlField
                        Layout.fillWidth: true
                        text: settingsViewModel ? settingsViewModel.preServiceMusicUrl : ""
                        font.family: Theme.fontFamily
                        font.pixelSize: Theme.fontSizeBody
                        color: Theme.textPrimary
                        selectionColor: Theme.accentPrimary
                        selectedTextColor: Theme.textOnAccent
                        placeholderText: "https://www.youtube.com/watch?v=... or audio stream URL"
                        placeholderTextColor: Theme.textMuted
                        background: Rectangle {
                            color: Theme.inputBackground
                            border.color: preServiceUrlField.activeFocus ? Theme.accentPrimary : Theme.borderDark
                            radius: 4
                        }
                        onTextChanged: if (settingsViewModel) settingsViewModel.preServiceMusicUrl = text
                    }

                    Item { Layout.fillHeight: true }
                }

                // Tab 4: NETWORK & SYNC
                ColumnLayout {
                    spacing: 14

                    Label {
                        text: "Musician Web App (QR Code)"
                        color: Theme.accentPrimary
                        font.bold: true
                        font.pixelSize: Theme.fontSizeHeader
                        font.family: Theme.fontFamily
                    }

                    Label {
                        text: "Scan this code with a mobile device on the local network to open the Musician View."
                        color: Theme.textSecondary
                        font.pixelSize: Theme.fontSizeBody
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }

                    Item {
                        Layout.alignment: Qt.AlignHCenter
                        width: 220
                        height: 220

                        Rectangle {
                            anchors.fill: parent
                            color: "white"
                            radius: 8
                            border.color: Theme.borderDark
                            border.width: 1
                        }

                        Image {
                            anchors.centerIn: parent
                            width: 200
                            height: 200
                            source: settingsViewModel ? "image://qrcode/http://" + settingsViewModel.localIpAddress + ":3000" : ""
                            fillMode: Image.PreserveAspectFit
                            smooth: false
                        }
                    }

                    Label {
                        Layout.alignment: Qt.AlignHCenter
                        text: settingsViewModel ? "http://" + settingsViewModel.localIpAddress + ":3000" : ""
                        color: Theme.textPrimary
                        font.bold: true
                        font.pixelSize: 16
                    }

                    Item { Layout.fillHeight: true }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: Theme.borderDark
            }

            // Action Buttons Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Button {
                    id: saveBtn
                    text: "SAVE SETTINGS"
                    font.bold: true
                    font.pixelSize: Theme.fontSizeSmall
                    font.family: Theme.fontFamily
                    Layout.preferredHeight: 32
                    background: Rectangle {
                        color: saveBtn.hovered ? Theme.accentHover : Theme.accentPrimary
                        radius: 4
                        Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                    }
                    contentItem: Text {
                        text: saveBtn.text
                        color: Theme.textOnAccent
                        font: saveBtn.font
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        if (settingsViewModel) {
                            settingsViewModel.saveSettings()
                        }
                    }
                }

                Button {
                    id: loadBtn
                    text: "LOAD SETTINGS"
                    font.bold: true
                    font.pixelSize: Theme.fontSizeSmall
                    font.family: Theme.fontFamily
                    Layout.preferredHeight: 32
                    background: Rectangle {
                        color: loadBtn.hovered ? Theme.surfaceHover : "transparent"
                        border.color: Theme.borderDark
                        radius: 4
                        Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                    }
                    contentItem: Text {
                        text: loadBtn.text
                        color: Theme.textSecondary
                        font: loadBtn.font
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        if (settingsViewModel) {
                            settingsViewModel.loadSettings()
                        }
                    }
                }

                Button {
                    id: resetBtn
                    text: "RESET DEFAULTS"
                    font.bold: true
                    font.pixelSize: Theme.fontSizeSmall
                    font.family: Theme.fontFamily
                    Layout.preferredHeight: 32
                    background: Rectangle {
                        color: resetBtn.hovered ? Theme.danger : "transparent"
                        border.color: resetBtn.hovered ? Theme.danger : Theme.borderDark
                        radius: 4
                        Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                    }
                    contentItem: Text {
                        text: resetBtn.text
                        color: resetBtn.hovered ? "#ffffff" : Theme.danger
                        font: resetBtn.font
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        if (settingsViewModel) {
                            settingsViewModel.resetToDefaults()
                        }
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    id: closeBottomBtn
                    text: "CLOSE"
                    font.bold: true
                    font.pixelSize: Theme.fontSizeSmall
                    font.family: Theme.fontFamily
                    Layout.preferredHeight: 32
                    Layout.preferredWidth: 80
                    background: Rectangle {
                        color: closeBottomBtn.hovered ? Theme.surfaceHover : "transparent"
                        border.color: closeBottomBtn.hovered ? Theme.textSecondary : Theme.borderDark
                        radius: 4
                        Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                    }
                    contentItem: Text {
                        text: closeBottomBtn.text
                        color: Theme.textPrimary
                        font: closeBottomBtn.font
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: root.close()
                }
            }
        }
    }
}
