#ifndef HARMONYSYNC_APP_THEME_HPP
#define HARMONYSYNC_APP_THEME_HPP

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QPalette>)
#include <QColor>
#include <QGuiApplication>
#include <QPalette>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief Provides unified dark theme palette configuration matching Theme.qml
 *        for application window frames, dialogs, and controls.
 */
class AppTheme {
public:
#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] static QPalette darkPalette();
    static void applyDarkTheme(QGuiApplication& app);
#endif
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_APP_THEME_HPP
