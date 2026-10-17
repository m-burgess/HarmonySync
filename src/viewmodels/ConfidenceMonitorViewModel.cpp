#include "ConfidenceMonitorViewModel.hpp"

namespace HarmonySync::ViewModels {

struct ConfidenceMonitorViewModel::Impl {
    std::string currentLyric;
    std::string nextLyric;
    int timerRemaining{0};
};

ConfidenceMonitorViewModel::ConfidenceMonitorViewModel()
    : m_impl(std::make_unique<Impl>()) {}

ConfidenceMonitorViewModel::~ConfidenceMonitorViewModel() = default;

#ifdef HARMONYSYNC_QT_AVAILABLE
QString ConfidenceMonitorViewModel::currentLyricLine() const {
    return QString::fromStdString(m_impl->currentLyric);
}

QString ConfidenceMonitorViewModel::nextLyricLine() const {
    return QString::fromStdString(m_impl->nextLyric);
}

QString ConfidenceMonitorViewModel::clockTimeString() const {
    return QStringLiteral("10:30 AM");
}
#else
std::string ConfidenceMonitorViewModel::currentLyricLine() const {
    return m_impl->currentLyric;
}

std::string ConfidenceMonitorViewModel::nextLyricLine() const {
    return m_impl->nextLyric;
}

std::string ConfidenceMonitorViewModel::clockTimeString() const {
    return "10:30 AM";
}
#endif

std::string ConfidenceMonitorViewModel::currentLyricLineStd() const {
    return m_impl->currentLyric;
}

std::string ConfidenceMonitorViewModel::nextLyricLineStd() const {
    return m_impl->nextLyric;
}

int ConfidenceMonitorViewModel::timerSecondsRemaining() const noexcept {
    return m_impl->timerRemaining;
}

void ConfidenceMonitorViewModel::setLyricLines(const std::string& current, const std::string& next) {
    m_impl->currentLyric = current;
    m_impl->nextLyric = next;
#ifdef HARMONYSYNC_QT_AVAILABLE
    emit lyricLineChanged();
#endif
}

void ConfidenceMonitorViewModel::setTimerSecondsRemaining(int seconds) {
    if (m_impl->timerRemaining != seconds) {
        m_impl->timerRemaining = seconds;
#ifdef HARMONYSYNC_QT_AVAILABLE
        emit timerChanged(seconds);
#endif
    }
}

} // namespace HarmonySync::ViewModels
