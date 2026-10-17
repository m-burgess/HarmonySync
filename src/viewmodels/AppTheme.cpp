#include "AppTheme.hpp"

namespace HarmonySync::ViewModels {

#ifdef HARMONYSYNC_QT_AVAILABLE
QPalette AppTheme::darkPalette() {
    // Red commit stub: returns default light palette
    return QPalette();
}

void AppTheme::applyDarkTheme(QGuiApplication& /*app*/) {
    // Red commit stub: does nothing
}
#endif

} // namespace HarmonySync::ViewModels
