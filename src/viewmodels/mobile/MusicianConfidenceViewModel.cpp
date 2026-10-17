#include "MusicianConfidenceViewModel.hpp"
#include "ChordTransposer.hpp"
#include <utility>
#include <iostream>

#ifdef HARMONYSYNC_QT_AVAILABLE
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QVariantMap>
#endif

namespace HarmonySync::ViewModels {

struct MusicianConfidenceViewModel::Impl {
    std::shared_ptr<Core::MobileApiClient> apiClient;

    std::string songTitle{"Waiting for Host..."};
    std::string currentLyric;
    std::string nextLyric;
    std::string timer{"00:00"};

    bool capoEnabled{false};
    bool cagedEnabled{false};
    std::string selectedKey;
    std::string originalKey;

    std::string rawJsonPayload;

#ifdef HARMONYSYNC_QT_AVAILABLE
    QVariantList songStructure;
    MusicianConfidenceViewModel* qmlParent{nullptr};
#endif

    Impl(std::shared_ptr<Core::MobileApiClient> client)
        : apiClient(std::move(client)) {
        if (!apiClient) {
            apiClient = std::make_shared<Core::MobileApiClient>();
        }
    }

    void updateSongStructure() {
#ifdef HARMONYSYNC_QT_AVAILABLE
        if (rawJsonPayload.empty()) {
            return;
        }

        QJsonDocument doc = QJsonDocument::fromJson(QString::fromStdString(rawJsonPayload).toUtf8());
        if (doc.isNull() || !doc.isObject()) {
            return;
        }

        QJsonObject root = doc.object();
        songTitle = root["title"].toString().toStdString();
        originalKey = root["originalKey"].toString().toStdString();

        if (selectedKey.empty()) {
            selectedKey = originalKey;
        }

        std::string targetKey = selectedKey;
        if (capoEnabled) {
            targetKey = Core::ChordTransposer::suggestCapoKey(selectedKey);
        }

        QJsonArray sections = root["sections"].toArray();
        QVariantList structure;

        for (int i = 0; i < sections.size(); ++i) {
            QJsonObject secObj = sections[i].toObject();
            QVariantMap sectionMap;
            sectionMap["name"] = secObj["name"].toString();

            QJsonArray lines = secObj["lines"].toArray();
            QVariantList lineList;

            for (int j = 0; j < lines.size(); ++j) {
                QJsonObject lineObj = lines[j].toObject();
                QVariantMap lineMap;
                lineMap["lyric"] = lineObj["lyric"].toString();
                lineMap["timestamp"] = lineObj["timestamp"].toString();

                // Transpose chords
                QString rawChords = lineObj["chords"].toString();
                QStringList chordParts = rawChords.split(QRegularExpression("\\s+"), Qt::SkipEmptyParts);
                QStringList transposedChords;

                for (const QString& part : chordParts) {
                    std::string stdChord = Core::ChordTransposer::nashvilleToStandard(part.toStdString(), targetKey);
                    if (cagedEnabled && !capoEnabled) { // CAGED typically used when not capoing
                        stdChord = Core::ChordTransposer::toCagedLeadShape(stdChord);
                    }
                    transposedChords.append(QString::fromStdString(stdChord));
                }

                lineMap["chords"] = transposedChords.join(" ");
                lineList.append(lineMap);
            }

            sectionMap["lines"] = lineList;
            structure.append(sectionMap);
        }

        songStructure = structure;

        if (qmlParent) {
            QMetaObject::invokeMethod(qmlParent, "songMapUpdated", Qt::QueuedConnection);
            QMetaObject::invokeMethod(qmlParent, "lyricsUpdated", Qt::QueuedConnection);
        }
#endif
    }

    void setupCallbacks() {
        apiClient->setEventCallback([this](const std::string& eventName, const std::string& payload) {
            if (eventName == "SONG_MAP_UPDATED") {
                rawJsonPayload = payload;
                updateSongStructure();
            } else if (eventName == "LYRICS_UPDATE") {
                // ... handle live lyric changes ...
            } else if (eventName == "TIMER_UPDATE") {
                timer = payload;
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
    : m_impl(std::make_unique<Impl>(std::move(client))) {
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

bool MusicianConfidenceViewModel::capoEnabled() const {
    return m_impl->capoEnabled;
}

void MusicianConfidenceViewModel::setCapoEnabled(bool enabled) {
    if (m_impl->capoEnabled != enabled) {
        m_impl->capoEnabled = enabled;
        m_impl->updateSongStructure();
        emit transpositionSettingsChanged();
    }
}

bool MusicianConfidenceViewModel::cagedEnabled() const {
    return m_impl->cagedEnabled;
}

void MusicianConfidenceViewModel::setCagedEnabled(bool enabled) {
    if (m_impl->cagedEnabled != enabled) {
        m_impl->cagedEnabled = enabled;
        m_impl->updateSongStructure();
        emit transpositionSettingsChanged();
    }
}

QString MusicianConfidenceViewModel::selectedKey() const {
    return QString::fromStdString(m_impl->selectedKey);
}

void MusicianConfidenceViewModel::setSelectedKey(const QString& key) {
    std::string k = key.toStdString();
    if (m_impl->selectedKey != k) {
        m_impl->selectedKey = k;
        m_impl->updateSongStructure();
        emit transpositionSettingsChanged();
    }
}

QString MusicianConfidenceViewModel::originalKey() const {
    return QString::fromStdString(m_impl->originalKey);
}

QVariantList MusicianConfidenceViewModel::songStructure() const {
    return m_impl->songStructure;
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
