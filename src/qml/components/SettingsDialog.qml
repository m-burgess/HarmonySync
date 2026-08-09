import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Dialog {
    id: root
    title: "⚙️ HarmonySync Application Settings"
    width: 640
    height: 540
    modal: true
    standardButtons: Dialog.Close

    background: Rectangle {
        color: "#18181b"
        border.color: "#3f3f46"
        border.width: 1
        radius: 8
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 18
        spacing: 16

        TabBar {
            id: tabBar
            Layout.fillWidth: true
            background: Rectangle { color: "#27272a"; radius: 6 }

            TabButton { text: "🖥️ Displays" }
            TabButton { text: "🔤 Typography" }
            TabButton { text: "📐 Alignment & Margins" }
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
                        color: "#f4f4f5"
                        font.bold: true
                        font.pixelSize: 13
                        Layout.fillWidth: true
                    }

                    Button {
                        id: refreshBtn
                        text: "🔄 Refresh Displays"
                        font.pixelSize: 11
                        font.bold: true
                        background: Rectangle {
                            color: refreshBtn.hovered ? "#3730a3" : "#27272a"
                            border.color: "#3f3f46"
                            radius: 4
                            Behavior on color { ColorAnimation { duration: 150 } }
                        }
                        contentItem: Text { text: refreshBtn.text; color: "#a5b4fc"; font: refreshBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
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
                    color: "#f4f4f5"
                    font.bold: true
                    font.pixelSize: 13
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

                Label { text: "Lyrics Font Size (pt):"; color: "#f4f4f5"; font.bold: true; font.pixelSize: 13 }
                SpinBox {
                    from: 20; to: 120
                    value: settingsViewModel ? settingsViewModel.lyricsFontSize : 48
                    onValueChanged: if (settingsViewModel) settingsViewModel.lyricsFontSize = value
                }

                Label { text: "Lower Third Font Size (pt):"; color: "#f4f4f5"; font.bold: true; font.pixelSize: 13 }
                SpinBox {
                    from: 14; to: 60
                    value: settingsViewModel ? settingsViewModel.lowerThirdFontSize : 26
                    onValueChanged: if (settingsViewModel) settingsViewModel.lowerThirdFontSize = value
                }

                Label { text: "Font Family:"; color: "#f4f4f5"; font.bold: true; font.pixelSize: 13 }
                TextField {
                    text: settingsViewModel ? settingsViewModel.fontFamily : "Inter"
                    onTextChanged: if (settingsViewModel) settingsViewModel.fontFamily = text
                }
            }

            // Tab 3: Alignment & Margins
            ColumnLayout {
                spacing: 14

                Label { text: "Text Alignment Offset X:"; color: "#f4f4f5"; font.bold: true; font.pixelSize: 13 }
                SpinBox {
                    from: -500; to: 500
                    value: settingsViewModel ? settingsViewModel.marginOffsetX : 0
                    onValueChanged: if (settingsViewModel) settingsViewModel.marginOffsetX = value
                }

                Label { text: "Text Alignment Offset Y:"; color: "#f4f4f5"; font.bold: true; font.pixelSize: 13 }
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
            color: "#27272a"
        }

        // Action Buttons Row
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Button {
                id: saveBtn
                text: "💾 Save Settings"
                font.bold: true
                background: Rectangle {
                    color: saveBtn.hovered ? "#4f46e5" : "#6366f1"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: saveBtn.text; color: "#ffffff"; font: saveBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (settingsViewModel) settingsViewModel.saveSettings() }
            }

            Button {
                id: loadBtn
                text: "📂 Load Settings"
                font.bold: true
                background: Rectangle {
                    color: loadBtn.hovered ? "#3f3f46" : "#27272a"
                    border.color: "#3f3f46"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: loadBtn.text; color: "#f4f4f5"; font: loadBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (settingsViewModel) settingsViewModel.loadSettings() }
            }

            Button {
                id: resetBtn
                text: "🔄 Reset Defaults"
                font.bold: true
                background: Rectangle {
                    color: resetBtn.hovered ? "#7f1d1d" : "#27272a"
                    border.color: "#ef4444"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: resetBtn.text; color: resetBtn.hovered ? "#ffffff" : "#fca5a5"; font: resetBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (settingsViewModel) settingsViewModel.resetToDefaults() }
            }
        }
    }
}
