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

    // #177/#188: loadNextSongStems already preloaded and switched the next song on the
    // active deck. Do not swap decks or crossfade here; that would move the song off
    // the active deck. Only start playback if nothing is playing yet.
    Connections {
        target: audioMixerViewModel
        function onNextSongLoaded() {
            if (!audioMixerViewModel.isPlaying) {
                audioMixerViewModel.play()
            }
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

        // Individual Stem Faders (Horizontal Layout)
        ScrollView {
            id: stemScrollView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            ScrollBar.horizontal.policy: ScrollBar.AsNeeded
            ScrollBar.vertical.policy: ScrollBar.AlwaysOff
            contentWidth: stemRow.implicitWidth
            contentHeight: availableHeight

            Row {
                id: stemRow
                spacing: 16

                Repeater {
                    id: stemRepeater
                    model: audioMixerViewModel ? audioMixerViewModel.loadedStemCount : 0
                    
                    delegate: Rectangle {
                        id: stemDelegate
                        width: nameText.implicitWidth + 32
                        height: 36
                        anchors.verticalCenter: parent.verticalCenter
                        radius: 18
                        color: isMuted ? Theme.danger : Theme.backgroundDark
                        border.color: isMuted ? Theme.danger : Theme.borderDark
                        border.width: 1

                        property bool isMuted: audioMixerViewModel ? audioMixerViewModel.stemIsMuted(index) : false

                        Connections {
                            target: audioMixerViewModel
                            function onStemStateChanged(idx) {
                                if (idx === index) {
                                    isMuted = audioMixerViewModel.stemIsMuted(index)
                                }
                            }
                        }

                        Text {
                            id: nameText
                            anchors.centerIn: parent
                            text: audioMixerViewModel ? root.formatTrackName(audioMixerViewModel.stemName(index)) : "CH " + (index+1)
                            font.family: Theme.fontFamily
                            font.pixelSize: 11
                            font.bold: true
                            color: isMuted ? "#ffffff" : Theme.textPrimary
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onEntered: stemDelegate.opacity = 0.8
                            onExited: stemDelegate.opacity = 1.0
                            onClicked: { if (audioMixerViewModel) audioMixerViewModel.toggleStemMute(index) }
                        }
                        
                        Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                    } // Rectangle
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
