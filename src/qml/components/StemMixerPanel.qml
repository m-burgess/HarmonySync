import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    color: "#1e1e24"
    border.color: "#33333d"
    border.width: 1
    radius: 6

    Connections {
        target: audioMixerViewModel
        function onNextSongLoaded() {
            if (audioMixerViewModel.isPlaying) {
                crossfadeAnim.start()
            } else {
                audioMixerViewModel.setCrossfadePosition(1.0)
                audioMixerViewModel.finalizeCrossfade()
                audioMixerViewModel.play()
            }
        }
    }

    NumberAnimation {
        id: crossfadeAnim
        target: audioMixerViewModel
        property: "crossfadePosition"
        from: 0.0
        to: 1.0
        duration: 3000
        easing.type: Easing.InOutQuad
        onFinished: {
            audioMixerViewModel.finalizeCrossfade()
        }
    }

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

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#27272a"
        }

        // Individual Stem Faders
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
            ScrollBar.vertical.policy: ScrollBar.AsNeeded

            ColumnLayout {
                width: parent.width
                spacing: 8

                Repeater {
                    id: stemRepeater
                    model: audioMixerViewModel ? audioMixerViewModel.loadedStemCount : 0
                    
                    delegate: RowLayout {
                        width: parent ? parent.width : 0
                        spacing: 10

                        property bool isMuted: audioMixerViewModel ? audioMixerViewModel.stemIsMuted(index) : false
                        property real vol: audioMixerViewModel ? audioMixerViewModel.stemVolume(index) : 1.0

                        Connections {
                            target: audioMixerViewModel
                            function onStemStateChanged(idx) {
                                if (idx === index) {
                                    isMuted = audioMixerViewModel.stemIsMuted(index)
                                    vol = audioMixerViewModel.stemVolume(index)
                                }
                            }
                        }

                        Button {
                            text: audioMixerViewModel ? audioMixerViewModel.stemName(index) : "Stem"
                            font.pixelSize: 11
                            font.bold: true
                            Layout.preferredWidth: 100
                            background: Rectangle {
                                color: isMuted ? "#7f1d1d" : "#27272a"
                                border.color: isMuted ? "#ef4444" : "#3f3f46"
                                radius: 4
                                Behavior on color { ColorAnimation { duration: 150 } }
                            }
                            contentItem: Text { 
                                text: parent.text
                                color: "#f4f4f5"
                                font: parent.font
                                elide: Text.ElideRight
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter 
                            }
                            onClicked: { if (audioMixerViewModel) audioMixerViewModel.toggleStemMute(index) }
                        }

                        Slider {
                            Layout.fillWidth: true
                            from: 0.0
                            to: 1.0
                            value: vol
                            onMoved: { if (audioMixerViewModel) audioMixerViewModel.setStemVolume(index, value) }
                        }

                        Label {
                            text: Math.round(vol * 100) + "%"
                            color: "#a1a1aa"
                            font.pixelSize: 11
                            Layout.preferredWidth: 30
                        }
                    }
                }
            }
        }
    }
}
