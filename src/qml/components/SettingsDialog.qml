import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "../theme"

Dialog {
    id: root
    title: "SETTINGS"
    width: 640
    height: 540
    modal: true
    standardButtons: Dialog.Close

    background: Rectangle {
        color: Theme.backgroundCard
        border.color: Theme.borderDark
        border.width: 1
        radius: Theme.borderRadius
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 18
        spacing: 16

        TabBar {
            id: tabBar
            Layout.fillWidth: true
            background: Rectangle { color: Theme.backgroundDark; radius: Theme.borderRadius }

            TabButton { text: "DISPLAYS" }
            TabButton { text: "TYPOGRAPHY" }
            TabButton { text: "ALIGNMENT & MARGINS" }
        }

        StackLayout {
            id: stackLayout
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: tabBar.currentIndex

            // Tab 1: Display Options with Selectable Display Dropdowns
            ColumnLayout {
                spacing: 14

                RowLayout {
                    Layout.fillWidth: true

                    Label {
                        text: "Presentation Output Display:"
                        color: Theme.textPrimary
                        font.bold: true
                        font.pixelSize: 13
                        font.family: Theme.fontFamily
                        Layout.fillWidth: true
                    }

                    Button {
                        id: refreshBtn
                        text: "REFRESH DISPLAYS"
                        font.pixelSize: 11
                        font.bold: true
                        font.family: Theme.fontFamily
                        background: Rectangle {
                            color: refreshBtn.hovered ? Theme.borderDark : "transparent"
                            border.color: Theme.borderDark
                            radius: 4
                            Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                        }
                        contentItem: Text { text: refreshBtn.text; color: Theme.textSecondary; font: refreshBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                        onClicked: { if (settingsViewModel) settingsViewModel.refreshDisplays() }
                    }
                }

                ComboBox {
                    id: presentationCombo
                    Layout.fillWidth: true
                    model: settingsViewModel ? settingsViewModel.availableDisplayNames : ["Display 1: Main Control Monitor (1920x1080)", "Display 2: Projector / Main Audience (1920x1080)"]
                    currentIndex: settingsViewModel ? Math.min(Math.max(0, settingsViewModel.presentationDisplayIndex - 1), model.length - 1) : 0
                    onActivated: function(index) {
                        if (settingsViewModel) settingsViewModel.presentationDisplayIndex = index + 1
                    }
                }

                Label {
                    text: "Stage Confidence Monitor Display:"
                    color: Theme.textPrimary
                    font.bold: true
                    font.pixelSize: 13
                    font.family: Theme.fontFamily
                }

                ComboBox {
                    id: confidenceCombo
                    Layout.fillWidth: true
                    model: settingsViewModel ? settingsViewModel.availableDisplayNames : ["Display 1: Main Control Monitor (1920x1080)", "Display 3: Stage Confidence Monitor (1920x1080)"]
                    currentIndex: settingsViewModel ? Math.min(Math.max(0, settingsViewModel.confidenceDisplayIndex - 1), model.length - 1) : 1
                    onActivated: function(index) {
                        if (settingsViewModel) settingsViewModel.confidenceDisplayIndex = index + 1
                    }
                }
            }

            // Tab 2: Typography Options
            ColumnLayout {
                spacing: 14

                Label { text: "Lyrics Font Size (pt):"; color: Theme.textPrimary; font.bold: true; font.pixelSize: 13; font.family: Theme.fontFamily }
                SpinBox {
                    from: 20; to: 120
                    value: settingsViewModel ? settingsViewModel.lyricsFontSize : 48
                    onValueChanged: if (settingsViewModel) settingsViewModel.lyricsFontSize = value
                }

                Label { text: "Lower Third Font Size (pt):"; color: Theme.textPrimary; font.bold: true; font.pixelSize: 13; font.family: Theme.fontFamily }
                SpinBox {
                    from: 14; to: 60
                    value: settingsViewModel ? settingsViewModel.lowerThirdFontSize : 26
                    onValueChanged: if (settingsViewModel) settingsViewModel.lowerThirdFontSize = value
                }

                Label { text: "Font Family:"; color: Theme.textPrimary; font.bold: true; font.pixelSize: 13; font.family: Theme.fontFamily }
                TextField {
                    text: settingsViewModel ? settingsViewModel.fontFamily : "Inter"
                    onTextChanged: if (settingsViewModel) settingsViewModel.fontFamily = text
                }
            }

            // Tab 3: Alignment & Margins
            ColumnLayout {
                spacing: 14

                Label { text: "Text Alignment Offset X:"; color: Theme.textPrimary; font.bold: true; font.pixelSize: 13; font.family: Theme.fontFamily }
                SpinBox {
                    from: -500; to: 500
                    value: settingsViewModel ? settingsViewModel.marginOffsetX : 0
                    onValueChanged: if (settingsViewModel) settingsViewModel.marginOffsetX = value
                }

                Label { text: "Text Alignment Offset Y:"; color: Theme.textPrimary; font.bold: true; font.pixelSize: 13; font.family: Theme.fontFamily }
                SpinBox {
                    from: -500; to: 500
                    value: settingsViewModel ? settingsViewModel.marginOffsetY : 40
                    onValueChanged: if (settingsViewModel) settingsViewModel.marginOffsetY = value
                }
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
                font.pixelSize: 11
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: saveBtn.hovered ? Theme.accentHover : Theme.accentPrimary
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: saveBtn.text; color: "#ffffff"; font: saveBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (settingsViewModel) settingsViewModel.saveSettings() }
            }

            Button {
                id: loadBtn
                text: "LOAD SETTINGS"
                font.bold: true
                font.pixelSize: 11
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: loadBtn.hovered ? Theme.borderDark : "transparent"
                    border.color: Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: loadBtn.text; color: Theme.textSecondary; font: loadBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (settingsViewModel) settingsViewModel.loadSettings() }
            }

            Button {
                id: resetBtn
                text: "RESET DEFAULTS"
                font.bold: true
                font.pixelSize: 11
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: resetBtn.hovered ? Theme.danger : "transparent"
                    border.color: Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: resetBtn.text; color: resetBtn.hovered ? "#ffffff" : Theme.danger; font: resetBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (settingsViewModel) settingsViewModel.resetToDefaults() }
            }
        }
    }
}
