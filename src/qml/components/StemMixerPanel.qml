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

        // Mixer Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Label {
                text: "🎛️ Stem Mixer & Audio Engine"
                font.pixelSize: 15
                font.bold: true
                color: "#f4f4f5"
                Layout.fillWidth: true
            }

            // Pitch Shift Semitones Pill Badge
            Rectangle {
                width: 130
                height: 24
                radius: 12
                color: "#1e1b4b"
                border.color: "#6366f1"
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6

                    Text {
                        text: "KEY: " + (audioMixerViewModel ? (audioMixerViewModel.pitchShiftSemitones >= 0 ? "+" : "") + audioMixerViewModel.pitchShiftSemitones + " ST" : "0 ST")
                        color: "#a5b4fc"
                        font.pixelSize: 11
                        font.bold: true
                    }
                }
            }

            Button {
                id: pitchDownBtn
                text: "♭ -1"
                font.pixelSize: 11
                font.bold: true
                background: Rectangle {
                    color: pitchDownBtn.hovered ? "#3730a3" : "#27272a"
                    border.color: "#3f3f46"
                    radius: 4
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: pitchDownBtn.text; color: "#f4f4f5"; font: pitchDownBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (audioMixerViewModel) audioMixerViewModel.pitchShiftSemitones -= 1 }
            }

            Button {
                id: pitchUpBtn
                text: "♯ +1"
                font.pixelSize: 11
                font.bold: true
                background: Rectangle {
                    color: pitchUpBtn.hovered ? "#3730a3" : "#27272a"
                    border.color: "#3f3f46"
                    radius: 4
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: pitchUpBtn.text; color: "#f4f4f5"; font: pitchUpBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (audioMixerViewModel) audioMixerViewModel.pitchShiftSemitones += 1 }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#27272a"
        }

        // Playback Transport Controls
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Button {
                id: playBtn
                text: audioMixerViewModel && audioMixerViewModel.isPlaying ? "⏸ Pause" : "▶ Play"
                font.pixelSize: 13
                font.bold: true
                background: Rectangle {
                    color: (audioMixerViewModel && audioMixerViewModel.isPlaying) ? "#15803d" : (playBtn.hovered ? "#4f46e5" : "#6366f1")
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: playBtn.text; color: "#ffffff"; font: playBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: {
                    if (!audioMixerViewModel) return
                    if (audioMixerViewModel.isPlaying) audioMixerViewModel.pause()
                    else audioMixerViewModel.play()
                }
            }

            Button {
                id: stopBtn
                text: "⏹ Stop"
                font.pixelSize: 13
                font.bold: true
                background: Rectangle {
                    color: stopBtn.hovered ? "#3f3f46" : "#27272a"
                    border.color: "#3f3f46"
                    radius: 6
                    Behavior on color { ColorAnimation { duration: 150 } }
                }
                contentItem: Text { text: stopBtn.text; color: "#f4f4f5"; font: stopBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (audioMixerViewModel) audioMixerViewModel.stop() }
            }

            Slider {
                id: posSlider
                Layout.fillWidth: true
                from: 0
                to: audioMixerViewModel ? audioMixerViewModel.durationSeconds : 100
                value: audioMixerViewModel ? audioMixerViewModel.positionSeconds : 0
                onMoved: { if (audioMixerViewModel) audioMixerViewModel.seek(posSlider.value) }
            }
        }

        // Master Volume Bar
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Label {
                text: "🔊 Master Volume"
                color: "#a1a1aa"
                font.pixelSize: 12
            }

            Slider {
                id: volSlider
                Layout.fillWidth: true
                from: 0.0
                to: 1.0
                value: audioMixerViewModel ? audioMixerViewModel.masterVolume : 1.0
                onMoved: { if (audioMixerViewModel) audioMixerViewModel.setMasterVolume(value) }
            }

            Label {
                text: Math.round((audioMixerViewModel ? audioMixerViewModel.masterVolume : 1.0) * 100) + "%"
                color: "#f4f4f5"
                font.pixelSize: 12
                font.bold: true
                Layout.preferredWidth: 36
            }
        }
    }
}
