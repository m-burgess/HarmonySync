import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    color: "#0f0f12"
    
    // Hardcoded keys for simplicity in the demo
    property var keys: ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"]

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 16

        // Header: Active Song Title and Timer
        RowLayout {
            Layout.fillWidth: true

            Label {
                text: confidenceViewModel ? confidenceViewModel.currentSongTitle : "No Active Song"
                color: "#a5b4fc"
                font.pixelSize: 22
                font.bold: true
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }

            Rectangle {
                width: 80
                height: 30
                radius: 15
                color: "#1e1b4b"
                border.color: "#6366f1"

                Text {
                    anchors.centerIn: parent
                    text: confidenceViewModel ? confidenceViewModel.timerText : "00:00"
                    color: "#f4f4f5"
                    font.pixelSize: 14
                    font.bold: true
                }
            }
        }
        
        // Transposition Controls
        RowLayout {
            Layout.fillWidth: true
            spacing: 16
            
            Label {
                text: "Key:"
                color: "#ffffff"
                font.pixelSize: 16
            }
            
            ComboBox {
                model: keys
                currentIndex: confidenceViewModel ? keys.indexOf(confidenceViewModel.selectedKey) : 0
                onActivated: {
                    if (confidenceViewModel) {
                        confidenceViewModel.selectedKey = currentText
                    }
                }
            }
            
            Switch {
                text: "Capo"
                checked: confidenceViewModel ? confidenceViewModel.capoEnabled : false
                onCheckedChanged: {
                    if (confidenceViewModel) {
                        confidenceViewModel.capoEnabled = checked
                    }
                }
            }
            
            Switch {
                text: "CAGED Lead"
                checked: confidenceViewModel ? confidenceViewModel.cagedEnabled : false
                onCheckedChanged: {
                    if (confidenceViewModel) {
                        confidenceViewModel.cagedEnabled = checked
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#27272a"
        }

        // Song Structure View
        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: confidenceViewModel ? confidenceViewModel.songStructure : null
            spacing: 24
            
            delegate: ColumnLayout {
                width: ListView.view.width
                spacing: 8
                
                // Section Name
                Label {
                    text: modelData.name
                    color: "#818cf8"
                    font.pixelSize: 18
                    font.bold: true
                    topPadding: 8
                }
                
                // Lines in Section
                Repeater {
                    model: modelData.lines
                    delegate: ColumnLayout {
                        width: parent.width
                        spacing: 2
                        
                        // Chords
                        Label {
                            text: modelData.chords
                            color: "#fcd34d" // Yellow for chords
                            font.pixelSize: 18
                            font.bold: true
                            font.family: "Monospace"
                            visible: text.length > 0
                        }
                        
                        // Lyrics
                        Label {
                            text: modelData.lyric
                            color: "#ffffff"
                            font.pixelSize: 18
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }
            }
        }
    }
}
