import QtQuick
import QtQuick.Controls
import QtWebEngine

Window {
    id: root
    width: 800
    height: 600
    visible: true
    title: "HarmonySync Playlist Player"

    property string playlistUrl: ""
    
    // Attempt to automatically hide the window so it plays in the background
    // For debugging, we can leave it visible initially.
    
    WebEngineView {
        id: webView
        anchors.fill: parent
        url: root.playlistUrl

        onLoadingChanged: function(loadRequest) {
            if (loadRequest.status === WebEngineView.LoadSucceededStatus) {
                console.log("[PlaylistWebPlayer] Page loaded. Injecting shuffle script...")
                
                // A generic script that attempts to find and click the shuffle button
                // for YouTube or Spotify Web Player.
                var script = `
                    setTimeout(() => {
                        // YouTube Playlist Shuffle Button
                        let ytShuffle = document.querySelector('ytd-playlist-panel-video-renderer button[aria-label="Shuffle playlist"], button[aria-label="Shuffle"]');
                        if (ytShuffle) ytShuffle.click();
                        
                        // Spotify Web Player Shuffle Button
                        let spotShuffle = document.querySelector('button[data-testid="control-button-shuffle"]');
                        if (spotShuffle && spotShuffle.getAttribute('aria-checked') === 'false') {
                            spotShuffle.click();
                        }

                        // Play if not playing (Spotify)
                        let spotPlay = document.querySelector('button[data-testid="play-button"]');
                        if (spotPlay) spotPlay.click();
                        
                    }, 3000); // Wait for dynamic content to load
                `;
                
                webView.runJavaScript(script);
            }
        }
    }
}
