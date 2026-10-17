import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "components"
import "theme"

ApplicationWindow {
    id: window
    width: 1360
    height: 850
    minimumWidth: 1024
    minimumHeight: 768
    visible: true
    visibility: Window.Maximized
    title: "HarmonySync Pro"
    color: Theme.backgroundDark
    palette.window: Theme.backgroundDark
    palette.windowText: Theme.textPrimary
    palette.base: Theme.backgroundDark
    palette.text: Theme.textPrimary
    palette.button: Theme.backgroundCard
    palette.buttonText: Theme.textPrimary
    palette.highlight: Theme.accentPrimary
    palette.highlightedText: Theme.textOnAccent
    palette.mid: Theme.borderDark
    palette.dark: Theme.textMuted
    palette.light: Theme.surfaceHover
    palette.placeholderText: Theme.textSecondary
    
    property string activeLyricText: setlistViewModel ? setlistViewModel.activeLyricText : ""
    property string nextLyricText: setlistViewModel ? setlistViewModel.nextLyricText : ""

    SettingsDialog {
        id: settingsDialog
    }

    // Top Navigation & Header Bar
    header: ToolBar {
        background: Rectangle {
            color: Theme.backgroundCard
            border.color: Theme.borderDark
            border.width: 1
        }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 10
            spacing: 12

            RowLayout {
                spacing: 8

                Label {
                    text: "HARMONYSYNC PRO"
                    font.family: Theme.fontFamily
                    font.pixelSize: 16
                    font.bold: true
                    color: Theme.textPrimary
                    font.letterSpacing: 1.5
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                width: 180
                height: 24
                radius: 4
                color: Theme.backgroundDark
                border.color: Theme.borderDark

                Text {
                    anchors.centerIn: parent
                    text: setlistViewModel ? setlistViewModel.title : "Sunday Service Order"
                    color: Theme.textSecondary
                    font.pixelSize: 12
                    font.family: Theme.fontFamily
                }
            }

            Button {
                id: walkInBtn
                text: "WALK-IN MUSIC"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily
                visible: hasWebEngine && ((setlistViewModel && setlistViewModel.playlistUrl !== "") || (settingsViewModel && settingsViewModel.preServiceMusicUrl !== ""))

                background: Rectangle {
                    color: playlistLoader.active ? Theme.accentPrimary : (walkInBtn.hovered ? Theme.borderDark : "transparent")
                    border.color: walkInBtn.hovered ? Theme.accentPrimary : Theme.borderDark
                    radius: 3
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text {
                    text: walkInBtn.text
                    color: playlistLoader.active ? Theme.textOnAccent : Theme.textPrimary
                    font: walkInBtn.font
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: {
                    playlistLoader.active = !playlistLoader.active;
                }
            }

            Button {
                id: settingsBtn
                text: "SETTINGS"
                font.pixelSize: 11
                font.bold: true
                font.family: Theme.fontFamily

                background: Rectangle {
                    color: settingsBtn.hovered ? Theme.borderDark : "transparent"
                    border.color: settingsBtn.hovered ? Theme.accentPrimary : Theme.borderDark
                    radius: 3
                    Behavior on color { ColorAnimation { duration: Theme.animDuration } }
                }
                contentItem: Text {
                    text: settingsBtn.text
                    color: Theme.textPrimary
                    font: settingsBtn.font
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: settingsDialog.open()
            }
        }
    }

    // Main Responsive Grid Layout Shell
    SplitView {
        anchors.fill: parent
        orientation: Qt.Horizontal
        
        handle: Rectangle {
            implicitWidth: 1
            color: Theme.borderDark
        }

        // Left Pane: Service Order Subfolders List
        ServiceOrderPanel {
            SplitView.minimumWidth: 280
            SplitView.preferredWidth: 340
        }

        // Main Content Area (Lyrics + Preview over Mixer)
        SplitView {
            orientation: Qt.Vertical
            SplitView.fillWidth: true
            SplitView.fillHeight: true
            
            handle: Rectangle {
                implicitHeight: 1
                color: Theme.borderDark
            }

            // Top Half: Lyrics & Preview side-by-side
            SplitView {
                orientation: Qt.Horizontal
                SplitView.fillWidth: true
                SplitView.fillHeight: true

                handle: Rectangle {
                    implicitWidth: 1
                    color: Theme.borderDark
                }

                LyricsPanel {
                    SplitView.fillWidth: true
                    SplitView.fillHeight: true
                    visible: setlistViewModel ? setlistViewModel.hasActiveSongMap : true
                }

                SlideDisplayPanel {
                    SplitView.preferredWidth: 340
                    SplitView.minimumWidth: 300
                    SplitView.fillHeight: true
                }
            }

            // Bottom Half: Mixer spans the entire width of the main content area
            StemMixerPanel {
                SplitView.fillWidth: true
                SplitView.preferredHeight: 260
                SplitView.minimumHeight: 260
                visible: (setlistViewModel && setlistViewModel.hasActiveSongMap) ||
                         (audioMixerViewModel && (audioMixerViewModel.loadedStemCount > 0 || audioMixerViewModel.activeBackgroundVideo !== ""))
            }
        }
    }

    // Status Footer Bar
    footer: ToolBar {
        background: Rectangle {
            color: Theme.backgroundCard
            border.color: Theme.borderDark
            border.width: 1
        }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 6
            spacing: 10

            Rectangle {
                width: 6
                height: 6
                radius: 3
                color: Theme.accentPrimary
            }

            Label {
                text: "STATUS: READY  |  MODE: CLOUD SERVICE ORDER"
                color: Theme.textMuted
                font.pixelSize: 10
                font.family: Theme.fontFamily
                font.bold: true
                font.letterSpacing: 1
            }
        }
    }

    // Dynamic Loader for the Web Engine Playlist Player
    Loader {
        id: playlistLoader
        active: false
        source: "components/PlaylistWebPlayer.qml"
        onLoaded: {
            if (item) {
                var url = "";
                if (setlistViewModel && setlistViewModel.playlistUrl !== "") {
                    url = setlistViewModel.playlistUrl;
                } else if (settingsViewModel && settingsViewModel.preServiceMusicUrl !== "") {
                    url = settingsViewModel.preServiceMusicUrl;
                }
                item.playlistUrl = url;
                item.show();
            }
        }
    }
}
