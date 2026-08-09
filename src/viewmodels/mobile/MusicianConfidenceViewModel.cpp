#include "MusicianConfidenceViewModel.hpp"
#include <utility>
#include <iostream>

namespace HarmonySync::ViewModels {

struct MusicianConfidenceViewModel::Impl {
    std::shared_ptr<Core::MobileApiClient> apiClient;
    
    std::string songTitle{"Waiting for Host..."};
    std::string currentLyric{""};
    std::string nextLyric{""};
    std::string timer{"00:00"};
    
#ifdef HARMONYSYNC_QT_AVAILABLE
    MusicianConfidenceViewModel* qmlParent{nullptr};
#endif

    Impl(std::shared_ptr<Core::MobileApiClient> client)
        : apiClient(std::move(client))
    {
        if (!apiClient) {
            apiClient = std::make_shared<Core::MobileApiClient>();
        }
    }
    
    void setupCallbacks() {
        apiClient->setEventCallback([this](const std::string& eventName, const std::string& payload) {
            if (eventName == "LYRICS_UPDATE") {
                // In a full implementation, we would parse JSON. Mocking basic assignment for now.
                // Assuming payload contains line updates.
                if (payload.find("Amazing Grace") != std::string::npos) {
                    songTitle = "Amazing Grace";
                    currentLyric = "Amazing grace how sweet the sound";
                    nextLyric = "That saved a wretch like me";
                }
                
#ifdef HARMONYSYNC_QT_AVAILABLE
                if (qmlParent) {
                    QMetaObject::invokeMethod(qmlParent, "lyricsUpdated", Qt::QueuedConnection);
                }
#endif
            } else if (eventName == "TIMER_UPDATE") {
                timer = payload; // Assuming payload is formatted time
#ifdef HARMONYSYNC_QT_AVAILABLE
                if (qmlParent) {
                    QMetaObject::invokeMethod(qmlParent, "timerUpdated", Qt::QueuedConnection);
                }
#endif
            }
        });
    }
};

MusicianConfidenceViewModel::MusicianConfidenceViewModel(std::shared_ptr<Core::MobileApiClient> client)
    : m_impl(std::make_unique<Impl>(std::move(client)))
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    m_impl->qmlParent = this;
#endif
    m_impl->setupCallbacks();
}

MusicianConfidenceViewModel::~MusicianConfidenceViewModel() = default;

#ifdef HARMONYSYNC_QT_AVAILABLE
QString MusicianConfidenceViewModel::currentSongTitle() const {
    return QString::fromStdString(m_impl->songTitle);
}

QString MusicianConfidenceViewModel::currentLyricLine() const {
    return QString::fromStdString(m_impl->currentLyric);
}

QString MusicianConfidenceViewModel::nextLyricLine() const {
    return QString::fromStdString(m_impl->nextLyric);
}

QString MusicianConfidenceViewModel::timerText() const {
    return QString::fromStdString(m_impl->timer);
}
#else
std::string MusicianConfidenceViewModel::currentSongTitle() const {
    return m_impl->songTitle;
}

std::string MusicianConfidenceViewModel::currentLyricLine() const {
    return m_impl->currentLyric;
}

std::string MusicianConfidenceViewModel::nextLyricLine() const {
    return m_impl->nextLyric;
}

std::string MusicianConfidenceViewModel::timerText() const {
    return m_impl->timer;
}
#endif

} // namespace HarmonySync::ViewModels
