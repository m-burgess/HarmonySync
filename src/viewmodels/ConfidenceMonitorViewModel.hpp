#ifndef HARMONYSYNC_CONFIDENCE_MONITOR_VIEWMODEL_HPP
#define HARMONYSYNC_CONFIDENCE_MONITOR_VIEWMODEL_HPP

#include <memory>
#include <string>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel for confidence monitor stage displays featuring current/next lyrics and timers.
 */
class ConfidenceMonitorViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(QString currentLyricLine READ currentLyricLine NOTIFY lyricLineChanged)
    Q_PROPERTY(QString nextLyricLine READ nextLyricLine NOTIFY lyricLineChanged)
    Q_PROPERTY(int timerSecondsRemaining READ timerSecondsRemaining NOTIFY timerChanged)
    Q_PROPERTY(QString clockTimeString READ clockTimeString NOTIFY clockTimeChanged)
#endif

public:
    ConfidenceMonitorViewModel();
    ~ConfidenceMonitorViewModel();

    ConfidenceMonitorViewModel(const ConfidenceMonitorViewModel&) = delete;
    ConfidenceMonitorViewModel& operator=(const ConfidenceMonitorViewModel&) = delete;

    // Property Accessors
#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString currentLyricLine() const;
    [[nodiscard]] QString nextLyricLine() const;
    [[nodiscard]] QString clockTimeString() const;
#else
    [[nodiscard]] std::string currentLyricLine() const;
    [[nodiscard]] std::string nextLyricLine() const;
    [[nodiscard]] std::string clockTimeString() const;
#endif
    [[nodiscard]] std::string currentLyricLineStd() const;
    [[nodiscard]] std::string nextLyricLineStd() const;

    [[nodiscard]] int timerSecondsRemaining() const noexcept;

    // Commands
    void setLyricLines(const std::string& current, const std::string& next);
    void setTimerSecondsRemaining(int seconds);

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void lyricLineChanged();
    void timerChanged(int seconds);
    void clockTimeChanged(const QString& clockTime);
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_CONFIDENCE_MONITOR_VIEWMODEL_HPP
