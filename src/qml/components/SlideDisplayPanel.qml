import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    color: "#1e1e24"
    border.color: "#33333d"
    border.width: 1
    radius: 6

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 12

        // Header Section with Live Status Badge
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Label {
                text: "🖥️ Live Audience Output Preview"
                font.pixelSize: 15
                font.bold: true
                color: "#f4f4f5"
                Layout.fillWidth: true
            }

            Rectangle {
                width: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? 88 : 110
                height: 22
                radius: 11
                color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "#450a0a" : "#064e3b"
                border.color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "#ef4444" : "#10b981"
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 5

                    Rectangle {
                        width: 8
                        height: 8
                        radius: 4
                        color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "#ef4444" : "#10b981"
                    }

                    Text {
                        text: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "BLACKOUT" : "LIVE BROADCAST"
                        color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "#fca5a5" : "#6ee7b7"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }
        }

        // Live Output 16:9 Preview Frame
        Rectangle {
            id: previewFrame
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "#000000" : "#0f0f12"
            border.color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "#7f1d1d" : "#6366f1"
            border.width: 2
            radius: 6

            Text {
                anchors.centerIn: parent
                text: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "[ BLACK SCREEN ]" :
                      (slideDisplayViewModel && slideDisplayViewModel.activeSlideTitle !== "" ? slideDisplayViewModel.activeSlideTitle : "No Active Slide")
                color: "#ffffff"
                font.pixelSize: 22
                font.bold: true
                font.family: "Inter, Roboto, sans-serif"
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.WordWrap
                width: parent.width - 40
            }
        }

        // Navigation & Control Bar
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                id: prevBtn
                text: "◀ Prev"
                font.pixelSize: 12
                font.bold: true
                background: Rectangle {
                    color: prevBtn.hovered ? "#3730a3" : "#27272a"
                    border.color: prevBtn.hovered ? "#6366f1" : "#3f3f46"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: prevBtn.text; color: "#f4f4f5"; font: prevBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (slideDisplayViewModel) slideDisplayViewModel.previousSlide() }
            }

            Button {
                id: nextBtn
                text: "Next ▶"
                font.pixelSize: 12
                font.bold: true
                background: Rectangle {
                    color: nextBtn.hovered ? "#4f46e5" : "#6366f1"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: nextBtn.text; color: "#ffffff"; font: nextBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (slideDisplayViewModel) slideDisplayViewModel.nextSlide() }
            }

            Item { Layout.fillWidth: true }

            Button {
                id: blackBtn
                text: "⬛ Black"
                font.pixelSize: 12
                font.bold: true
                background: Rectangle {
                    color: (slideDisplayViewModel && slideDisplayViewModel.isBlackScreen) ? "#ef4444" : (blackBtn.hovered ? "#3f3f46" : "#27272a")
                    border.color: "#ef4444"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: blackBtn.text; color: (slideDisplayViewModel && slideDisplayViewModel.isBlackScreen) ? "#ffffff" : "#fca5a5"; font: blackBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (slideDisplayViewModel) slideDisplayViewModel.toggleBlackScreen() }
            }

            Button {
                id: clearBtn
                text: "❄ Clear"
                font.pixelSize: 12
                font.bold: true
                background: Rectangle {
                    color: (slideDisplayViewModel && slideDisplayViewModel.isClearScreen) ? "#0284c7" : (clearBtn.hovered ? "#3f3f46" : "#27272a")
                    border.color: "#0284c7"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: clearBtn.text; color: (slideDisplayViewModel && slideDisplayViewModel.isClearScreen) ? "#ffffff" : "#38bdf8"; font: clearBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (slideDisplayViewModel) slideDisplayViewModel.toggleClearScreen() }
            }
        }
    }
}
