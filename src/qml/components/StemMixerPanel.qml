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

    function formatTrackName(name) {
        if (!name) return "";
        var upperName = name.toUpperCase();
        if (upperName.indexOf("CLICK") !== -1) {
            return "CLICK";
        }
        return upperName;
    }

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
        anchors.margins: 16
        spacing: 16

        // Mixer Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            Label {
                text: "AUDIO MIXER"
                font.family: Theme.fontFamily
                font.pixelSize: 13
                font.bold: true
                color: Theme.textPrimary
                font.letterSpacing: 1.2
                Layout.fillWidth: true
                fontSizeMode: Text.Fit
                minimumPixelSize: 9
                elide: Text.ElideRight
            }

            // Pitch Shift Semitones Pill Badge
            Rectangle {
                width: 90
                height: 24
                radius: 12
                color: Theme.backgroundDark
                border.color: Theme.borderDark
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6

                    Text {
                        text: "KEY: " + (audioMixerViewModel ? (audioMixerViewModel.pitchShiftSemitones >= 0 ? "+" : "") + audioMixerViewModel.pitchShiftSemitones : "0")
                        color: Theme.accentPrimary
                        font.family: Theme.fontFamily
                        font.pixelSize: 11
                        font.bold: true
                    }
                }
            }

            Button {
                id: pitchDownBtn
                text: "-1"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: pitchDownBtn.hovered ? Theme.borderDark : "transparent"
                    border.color: Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: pitchDownBtn.text; color: Theme.textPrimary; font: pitchDownBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (audioMixerViewModel) audioMixerViewModel.pitchShiftSemitones -= 1 }
            }

            Button {
                id: pitchUpBtn
                text: "+1"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: pitchUpBtn.hovered ? Theme.borderDark : "transparent"
                    border.color: Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: pitchUpBtn.text; color: Theme.textPrimary; font: pitchUpBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (audioMixerViewModel) audioMixerViewModel.pitchShiftSemitones += 1 }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: Theme.borderDark
        }

        // Individual Stem Faders (Vertical Layout)
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
            ScrollBar.vertical.policy: ScrollBar.AsNeeded

            Flow {
                width: parent.width
                spacing: 16

                Repeater {
                    id: stemRepeater
                    model: audioMixerViewModel ? audioMixerViewModel.loadedStemCount : 0
                    
                    delegate: Item {
                        width: 56
                        height: 180

                        property bool isMuted: audioMixerViewModel ? audioMixerViewModel.stemIsMuted(index) : false
                        property real vol: audioMixerViewModel ? audioMixerViewModel.stemVolume(index) : 1.0

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 8

                        Connections {
                            target: audioMixerViewModel
                            function onStemStateChanged(idx) {
                                if (idx === index) {
                                    isMuted = audioMixerViewModel.stemIsMuted(index)
                                    vol = audioMixerViewModel.stemVolume(index)
                                }
                            }
                        }

                        // Track Name Label
                        Label {
                            text: audioMixerViewModel ? root.formatTrackName(audioMixerViewModel.stemName(index)) : "CH " + (index+1)
                            font.family: Theme.fontFamily
                            font.pixelSize: 10
                            font.bold: true
                            color: Theme.textSecondary
                            Layout.alignment: Qt.AlignHCenter
                            Layout.fillWidth: true
                            wrapMode: Text.WordWrap
                            horizontalAlignment: Text.AlignHCenter
                        }

                        // Vertical Fader Slider
                        Slider {
                            id: vFader
                            Layout.fillHeight: true
                            Layout.alignment: Qt.AlignHCenter
                            orientation: Qt.Vertical
                            from: 0.0
                            to: 1.0
                            value: vol
                            onMoved: { if (audioMixerViewModel) audioMixerViewModel.setStemVolume(index, value) }

                            background: Rectangle {
                                x: vFader.leftPadding + (vFader.availableWidth - width) / 2
                                y: vFader.topPadding
                                width: 6
                                height: vFader.availableHeight
                                radius: 3
                                color: Theme.backgroundDark
                                border.color: Theme.borderDark
                                border.width: 1

                                Rectangle {
                                    width: parent.width
                                    height: vFader.visualPosition * parent.height
                                    color: Theme.accentPrimary
                                    radius: 3
                                    y: parent.height - height
                                }
                            }

                            handle: Rectangle {
                                x: vFader.leftPadding + (vFader.availableWidth - width) / 2
                                y: vFader.topPadding + vFader.visualPosition * (vFader.availableHeight - height)
                                width: 28
                                height: 14
                                radius: 3
                                color: vFader.pressed ? Theme.accentHover : Theme.textSecondary
                                border.color: Theme.borderDark
                                border.width: 1
                            }
                        }

                        // Mute Button
                        Button {
                            text: "M"
                            font.pixelSize: 11
                            font.bold: true
                            font.family: Theme.fontFamily
                            Layout.preferredWidth: 32
                            Layout.preferredHeight: 24
                            Layout.alignment: Qt.AlignHCenter
                            background: Rectangle {
                                color: isMuted ? Theme.danger : Theme.backgroundDark
                                border.color: Theme.borderDark
                                radius: 4
                                Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                            }
                            contentItem: Text { 
                                text: parent.text
                                color: isMuted ? "#ffffff" : Theme.textSecondary
                                font: parent.font
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter 
                            }
                            onClicked: { if (audioMixerViewModel) audioMixerViewModel.toggleStemMute(index) }
                        } // Button
                        } // ColumnLayout
                    } // Item
                } // Repeater
            } // Flow
        } // ScrollView

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: Theme.borderDark
        }

        // Transport & Master Section
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            Button {
                id: playBtn
                text: audioMixerViewModel && audioMixerViewModel.isPlaying ? "PAUSE" : "PLAY"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                font.letterSpacing: 1
                Layout.preferredWidth: 80
                background: Rectangle {
                    color: (audioMixerViewModel && audioMixerViewModel.isPlaying) ? Theme.accentPrimary : (playBtn.hovered ? Theme.borderDark : "transparent")
                    border.color: (audioMixerViewModel && audioMixerViewModel.isPlaying) ? Theme.accentPrimary : Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { 
                    text: playBtn.text; 
                    color: (audioMixerViewModel && audioMixerViewModel.isPlaying) ? "#ffffff" : Theme.textPrimary; 
                    font: playBtn.font; 
                    horizontalAlignment: Text.AlignHCenter; 
                    verticalAlignment: Text.AlignVCenter 
                }
                onClicked: {
                    if (!audioMixerViewModel) return
                    if (audioMixerViewModel.isPlaying) audioMixerViewModel.pause()
                    else audioMixerViewModel.play()
                }
            }

            Button {
                id: stopBtn
                text: "STOP"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                font.letterSpacing: 1
                Layout.preferredWidth: 80
                background: Rectangle {
                    color: stopBtn.hovered ? Theme.borderDark : "transparent"
                    border.color: Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { 
                    text: stopBtn.text; 
                    color: Theme.textPrimary; 
                    font: stopBtn.font; 
                    horizontalAlignment: Text.AlignHCenter; 
                    verticalAlignment: Text.AlignVCenter 
                }
                onClicked: { if (audioMixerViewModel) audioMixerViewModel.stop() }
            }

            Item { width: 10 } // Spacer

            Slider {
                id: posSlider
                Layout.fillWidth: true
                from: 0
                to: audioMixerViewModel ? audioMixerViewModel.durationSeconds : 100
                value: audioMixerViewModel ? audioMixerViewModel.positionSeconds : 0
                onMoved: { if (audioMixerViewModel) audioMixerViewModel.seek(posSlider.value) }
                
                background: Rectangle {
                    x: posSlider.leftPadding
                    y: posSlider.topPadding + (posSlider.availableHeight - height) / 2
                    width: posSlider.availableWidth
                    height: 4
                    radius: 2
                    color: Theme.backgroundDark
                    border.color: Theme.borderDark

                    Rectangle {
                        width: posSlider.visualPosition * parent.width
                        height: parent.height
                        color: Theme.accentPrimary
                        radius: 2
                    }
                }
                handle: Rectangle {
                    x: posSlider.leftPadding + posSlider.visualPosition * (posSlider.availableWidth - width)
                    y: posSlider.topPadding + (posSlider.availableHeight - height) / 2
                    width: 12
                    height: 12
                    radius: 6
                    color: Theme.textPrimary
                }
            }

            Label {
                text: {
                    if (!audioMixerViewModel) return "00:00"
                    let pos = Math.floor(audioMixerViewModel.positionSeconds)
                    let mins = Math.floor(pos / 60)
                    let secs = pos % 60
                    return mins.toString().padStart(2, '0') + ":" + secs.toString().padStart(2, '0')
                }
                color: Theme.textSecondary
                font.pixelSize: 11
                font.family: Theme.fontFamily
            }
        }

    } // End of ColumnLayout

    // Transposing Overlay
    Rectangle {
        anchors.fill: parent
        color: "#d9000000" // Semi-transparent black
        radius: Theme.borderRadius
        visible: audioMixerViewModel ? audioMixerViewModel.isTransposing : false
        z: 100

        ColumnLayout {
            anchors.centerIn: parent
            spacing: 16

            BusyIndicator {
                Layout.alignment: Qt.AlignHCenter
                running: parent.visible
            }

            Label {
                text: "TRANSPOSING AUDIO..."
                color: Theme.textPrimary
                font.family: Theme.fontFamily
                font.pixelSize: 12
                font.bold: true
                font.letterSpacing: 1
                Layout.alignment: Qt.AlignHCenter
            }
        }
        
        MouseArea {
            anchors.fill: parent
            hoverEnabled: true
            acceptedButtons: Qt.AllButtons
            onWheel: (wheel) => { wheel.accepted = true }
        }
    }
}
