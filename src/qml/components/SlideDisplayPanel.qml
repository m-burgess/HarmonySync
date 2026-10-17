import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtMultimedia
import "../theme"

Rectangle {
    id: root
    property int outputMode: 0 // 0: Audience, 1: Stage Monitor, 2: Lower Thirds
    
    color: Theme.backgroundCard
    border.color: Theme.borderDark
    border.width: 1
    radius: Theme.borderRadius

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 12

        // Header Section with Live Status Badge
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Label {
                text: "PRESENTATION OUTPUT"
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

            Rectangle {
                width: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? 88 : 115
                height: 22
                radius: 11
                color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? Qt.darker(Theme.danger, 1.5) : Qt.darker(Theme.success, 1.5)
                border.color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? Theme.danger : Theme.success
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 5

                    Rectangle {
                        width: 6
                        height: 6
                        radius: 3
                        color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? Theme.danger : Theme.success
                    }

                    Text {
                        text: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "BLACKOUT" : "LIVE BROADCAST"
                        color: "#ffffff"
                        font.family: Theme.fontFamily
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }

            Item { Layout.fillWidth: true } // Spacer

            ComboBox {
                id: modeCombo
                model: ["Audience", "Stage Monitor", "Lower Thirds"]
                currentIndex: root.outputMode
                onActivated: function(index) { root.outputMode = index }
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                Layout.preferredHeight: 24
                Layout.preferredWidth: 120
                background: Rectangle {
                    color: Theme.backgroundDark
                    border.color: Theme.borderDark
                    radius: 4
                }
                contentItem: Text {
                    text: modeCombo.currentText
                    color: Theme.textPrimary
                    font: modeCombo.font
                    verticalAlignment: Text.AlignVCenter
                    horizontalAlignment: Text.AlignHCenter
                }
            }
        }

        // Live Output 16:9 Preview Frame
        Rectangle {
            id: previewFrame
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: (slideDisplayViewModel && slideDisplayViewModel.isBlackScreen) ? "#000000" :
                   (root.outputMode === 1) ? "#000000" :
                   (root.outputMode === 2) ? "#00FF00" : Theme.backgroundDark
            border.color: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? Theme.danger : Theme.borderDark
            border.width: 1
            radius: Theme.borderRadius
            clip: true
            
            Behavior on border.color { ColorAnimation { duration: Theme.animDuration } }

            readonly property bool isSongFolderVideo: (setlistViewModel && setlistViewModel.hasActiveSongMap) ||
                                                      (!setlistViewModel && audioMixerViewModel && audioMixerViewModel.isBackgroundVideoLooping)
            readonly property int fadeDurationMs: 600
            property bool nonSongVideoFadingOut: false

            onIsSongFolderVideoChanged: {
                bgMediaPlayer.loops = previewFrame.isSongFolderVideo ? MediaPlayer.Infinite : MediaPlayer.Once
                if (previewFrame.isSongFolderVideo) {
                    previewFrame.nonSongVideoFadingOut = false
                }
            }

            MediaPlayer {
                id: bgMediaPlayer
                source: (audioMixerViewModel && audioMixerViewModel.activeBackgroundVideo !== "")
                        ? "file://" + audioMixerViewModel.activeBackgroundVideo.replace(/#/g, "%23").replace(/\?/g, "%3F")
                        : ""
                loops: previewFrame.isSongFolderVideo
                       ? MediaPlayer.Infinite
                       : MediaPlayer.Once
                audioOutput: null
                videoOutput: videoOutput
                autoPlay: true

                onSourceChanged: {
                    bgMediaPlayer.loops = previewFrame.isSongFolderVideo ? MediaPlayer.Infinite : MediaPlayer.Once
                    previewFrame.nonSongVideoFadingOut = false
                    if (bgMediaPlayer.source.toString() !== "") {
                        bgMediaPlayer.play()
                    }
                }

                onPositionChanged: {
                    if (!previewFrame.isSongFolderVideo &&
                        bgMediaPlayer.duration > 0 &&
                        bgMediaPlayer.position >= Math.max(0, bgMediaPlayer.duration - previewFrame.fadeDurationMs)) {
                        previewFrame.nonSongVideoFadingOut = true
                    }
                }

                onMediaStatusChanged: {
                    if (bgMediaPlayer.mediaStatus === MediaPlayer.LoadedMedia &&
                        bgMediaPlayer.source.toString() !== "" &&
                        !previewFrame.nonSongVideoFadingOut &&
                        bgMediaPlayer.playbackState !== MediaPlayer.PlayingState) {
                        bgMediaPlayer.play()
                    } else if (!previewFrame.isSongFolderVideo &&
                               (bgMediaPlayer.mediaStatus === MediaPlayer.EndOfMedia ||
                                bgMediaPlayer.mediaStatus === MediaPlayer.InvalidMedia)) {
                        previewFrame.nonSongVideoFadingOut = true
                    }
                }

                onPlaybackStateChanged: {
                    if (!previewFrame.isSongFolderVideo &&
                        bgMediaPlayer.playbackState === MediaPlayer.PlayingState &&
                        audioMixerViewModel &&
                        audioMixerViewModel.loadedStemCount > 0 &&
                        !audioMixerViewModel.isPlaying &&
                        !previewFrame.nonSongVideoFadingOut) {
                        audioMixerViewModel.play()
                    }
                    if (!previewFrame.isSongFolderVideo &&
                        bgMediaPlayer.playbackState === MediaPlayer.StoppedState &&
                        bgMediaPlayer.source.toString() !== "") {
                        previewFrame.nonSongVideoFadingOut = true
                    }
                }
            }

            Connections {
                target: audioMixerViewModel
                function onSongSwitched() {
                    if (!previewFrame.isSongFolderVideo &&
                        bgMediaPlayer.source.toString() !== "" &&
                        audioMixerViewModel &&
                        audioMixerViewModel.loadedStemCount > 0) {
                        previewFrame.nonSongVideoFadingOut = false
                        bgMediaPlayer.setPosition(0)
                        bgMediaPlayer.play()
                        if (!audioMixerViewModel.isPlaying) {
                            audioMixerViewModel.play()
                        }
                    }
                }
                function onPlayStateChanged(playing) {
                    if (!previewFrame.isSongFolderVideo && bgMediaPlayer.source.toString() !== "") {
                        if (playing) {
                            if (audioMixerViewModel.positionSeconds < 0.25) {
                                previewFrame.nonSongVideoFadingOut = false
                            }
                            if (bgMediaPlayer.playbackState !== MediaPlayer.PlayingState) {
                                bgMediaPlayer.play()
                            }
                        } else {
                            let nearEnd = (audioMixerViewModel.durationSeconds > 0 &&
                                           audioMixerViewModel.positionSeconds >= audioMixerViewModel.durationSeconds - 0.25) ||
                                          previewFrame.nonSongVideoFadingOut
                            if (!nearEnd) {
                                if (audioMixerViewModel.positionSeconds <= 0.05) {
                                    bgMediaPlayer.pause()
                                    bgMediaPlayer.setPosition(0)
                                    previewFrame.nonSongVideoFadingOut = false
                                } else if (bgMediaPlayer.playbackState === MediaPlayer.PlayingState) {
                                    bgMediaPlayer.pause()
                                }
                            }
                        }
                    }
                }
                function onPositionChanged(posSec) {
                    if (!previewFrame.isSongFolderVideo &&
                        bgMediaPlayer.source.toString() !== "" &&
                        bgMediaPlayer.duration > 0) {
                        let targetMs = posSec * 1000.0
                        if (Math.abs(bgMediaPlayer.position - targetMs) > 400) {
                            bgMediaPlayer.setPosition(Math.floor(targetMs))
                            if (targetMs < Math.max(0, bgMediaPlayer.duration - previewFrame.fadeDurationMs)) {
                                previewFrame.nonSongVideoFadingOut = false
                            }
                        }
                    }
                }
            }

            VideoOutput {
                id: videoOutput
                anchors.fill: parent
                fillMode: VideoOutput.PreserveAspectCrop
                visible: bgMediaPlayer.hasVideo && !(slideDisplayViewModel && slideDisplayViewModel.isBlackScreen) && root.outputMode === 0
                opacity: previewFrame.isSongFolderVideo || !previewFrame.nonSongVideoFadingOut ? 1.0 : 0.0

                Behavior on opacity {
                    NumberAnimation {
                        duration: previewFrame.fadeDurationMs
                        easing.type: Easing.InOutQuad
                    }
                }
            }

            // Audience View (Mode 0)
            Text {
                visible: root.outputMode === 0 && ((slideDisplayViewModel && slideDisplayViewModel.isBlackScreen) || 
                         window.activeLyricText !== "" ||
                         !bgMediaPlayer.hasVideo)
                anchors.centerIn: parent
                z: 1
                text: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "[ BLACK SCREEN ]" :
                      (window.activeLyricText !== "" ? window.activeLyricText : "NO ACTIVE SLIDE")
                color: "#ffffff"
                font.pixelSize: 32
                font.bold: true
                font.family: Theme.fontFamily
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.WordWrap
                width: parent.width - 60
                style: Text.Outline
                styleColor: "#000000"
            }

            // Lower Thirds View (Mode 2)
            Text {
                visible: root.outputMode === 2 && ((slideDisplayViewModel && slideDisplayViewModel.isBlackScreen) || 
                         window.activeLyricText !== "")
                anchors.bottom: parent.bottom
                anchors.bottomMargin: 30
                anchors.horizontalCenter: parent.horizontalCenter
                z: 1
                text: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "[ BLACK SCREEN ]" : window.activeLyricText
                color: "#ffffff"
                font.pixelSize: 18
                fontSizeMode: Text.Fit
                minimumPixelSize: 12
                font.bold: true
                font.family: Theme.fontFamily
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.WordWrap
                width: parent.width - 60
                style: Text.Outline
                styleColor: "#000000"
            }

            // Stage Monitor View
            Item {
                anchors.fill: parent
                visible: root.outputMode === 1

                // Clock
                Text {
                    id: clockText
                    anchors.top: parent.top
                    anchors.topMargin: 10
                    anchors.horizontalCenter: parent.horizontalCenter
                    color: "#ffffff"
                    font.pixelSize: 20
                    font.bold: true
                    font.family: Theme.fontFamily
                    z: 2
                    
                    Timer {
                        interval: 1000; running: parent.visible; repeat: true
                        onTriggered: {
                            var date = new Date()
                            var hours = date.getHours() % 12 || 12
                            var minutes = date.getMinutes()
                            var ampm = date.getHours() >= 12 ? "PM" : "AM"
                            clockText.text = hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + " " + ampm
                        }
                    }
                    Component.onCompleted: {
                        var date = new Date()
                        var hours = date.getHours() % 12 || 12
                        var minutes = date.getMinutes()
                        var ampm = date.getHours() >= 12 ? "PM" : "AM"
                        clockText.text = hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + " " + ampm
                    }
                }
                
                // Current Lyric
                Text {
                    anchors.top: clockText.bottom
                    anchors.bottom: parent.verticalCenter
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.margins: 10
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    wrapMode: Text.WordWrap
                    fontSizeMode: Text.Fit
                    minimumPixelSize: 12
                    font.pixelSize: 22
                    font.bold: true
                    font.family: Theme.fontFamily
                    color: "#ffffff"
                    text: slideDisplayViewModel && slideDisplayViewModel.isBlackScreen ? "[ BLACK SCREEN ]" : (window.activeLyricText !== "" ? window.activeLyricText : "NO ACTIVE SLIDE")
                    z: 2
                }

                // Next Lyric
                Text {
                    anchors.top: parent.verticalCenter
                    anchors.bottom: parent.bottom
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.margins: 10
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    wrapMode: Text.WordWrap
                    fontSizeMode: Text.Fit
                    minimumPixelSize: 12
                    font.pixelSize: 22
                    font.bold: true
                    font.family: Theme.fontFamily
                    color: Theme.warning
                    text: window.nextLyricText !== "" ? window.nextLyricText : ""
                    visible: !(slideDisplayViewModel && slideDisplayViewModel.isBlackScreen)
                    z: 2
                }
            }
        } // End of previewFrame

        // Navigation & Control Bar
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                id: prevBtn
                text: "PREV"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: prevBtn.hovered ? Theme.borderDark : "transparent"
                    border.color: Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: prevBtn.text; color: Theme.textPrimary; font: prevBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (slideDisplayViewModel) slideDisplayViewModel.previousSlide() }
            }

            Button {
                id: nextBtn
                text: "NEXT"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: nextBtn.hovered ? Theme.accentHover : Theme.accentPrimary
                    border.color: nextBtn.hovered ? Theme.accentHover : Theme.accentPrimary
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: nextBtn.text; color: "#ffffff"; font: nextBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (slideDisplayViewModel) slideDisplayViewModel.nextSlide() }
            }

            Item { Layout.fillWidth: true } // Spacer

            Button {
                id: clearBtn
                text: "CLEAR"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: (slideDisplayViewModel && slideDisplayViewModel.isClearScreen) ? Theme.info : (clearBtn.hovered ? Theme.borderDark : "transparent")
                    border.color: Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: clearBtn.text; color: (slideDisplayViewModel && slideDisplayViewModel.isClearScreen) ? "#ffffff" : Theme.textPrimary; font: clearBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (slideDisplayViewModel) slideDisplayViewModel.toggleClearScreen() }
            }

            Button {
                id: blackBtn
                text: "BLACKOUT"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                background: Rectangle {
                    color: (slideDisplayViewModel && slideDisplayViewModel.isBlackScreen) ? Theme.danger : (blackBtn.hovered ? Theme.borderDark : "transparent")
                    border.color: Theme.borderDark
                    radius: 4
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text { text: blackBtn.text; color: (slideDisplayViewModel && slideDisplayViewModel.isBlackScreen) ? "#ffffff" : Theme.textPrimary; font: blackBtn.font; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: { if (slideDisplayViewModel) slideDisplayViewModel.toggleBlackScreen() }
            }
        }
    }
}
