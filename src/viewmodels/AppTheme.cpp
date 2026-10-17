#include "AppTheme.hpp"
#include <QColor>
#include <QStyleHints>

namespace HarmonySync::ViewModels {

#ifdef HARMONYSYNC_QT_AVAILABLE
QPalette AppTheme::darkPalette() {
    QPalette palette;

    const QColor backgroundDark(0x1e, 0x1e, 0x1e); // Theme.backgroundDark (#1e1e1e)
    const QColor backgroundCard(0x25, 0x25, 0x26); // Theme.backgroundCard (#252526)
    const QColor borderDark(0x3c, 0x3c, 0x3c);     // Theme.borderDark (#3c3c3c)
    const QColor accentPrimary(0x00, 0x7a, 0xcc);  // Theme.accentPrimary (#007acc)
    const QColor textPrimary(0xf4, 0xf4, 0xf5);    // Theme.textPrimary (#f4f4f5)
    const QColor textSecondary(0xa1, 0xa1, 0xaa);  // Theme.textSecondary (#a1a1aa)
    const QColor textMuted(0x71, 0x71, 0x7a);      // Theme.textMuted (#71717a)
    const QColor textOnAccent(0xff, 0xff, 0xff);   // Theme.textOnAccent (#ffffff)
    const QColor surfaceHover(0x2d, 0x2d, 0x30);   // Theme.surfaceHover (#2d2d30)
    const QColor surfaceActive(0x37, 0x37, 0x3d);  // Theme.surfaceActive (#37373d)
    const QColor danger(0xef, 0x44, 0x44);         // Theme.danger (#ef4444)

    // Active state (window frame, dialogs, controls)
    palette.setColor(QPalette::Window, backgroundDark);
    palette.setColor(QPalette::WindowText, textPrimary);
    palette.setColor(QPalette::Base, backgroundDark);
    palette.setColor(QPalette::AlternateBase, backgroundCard);
    palette.setColor(QPalette::ToolTipBase, backgroundCard);
    palette.setColor(QPalette::ToolTipText, textPrimary);
    palette.setColor(QPalette::Text, textPrimary);
    palette.setColor(QPalette::Button, backgroundCard);
    palette.setColor(QPalette::ButtonText, textPrimary);
    palette.setColor(QPalette::BrightText, danger);
    palette.setColor(QPalette::Link, accentPrimary);
    palette.setColor(QPalette::Highlight, accentPrimary);
    palette.setColor(QPalette::HighlightedText, textOnAccent);
    palette.setColor(QPalette::PlaceholderText, textSecondary);
    palette.setColor(QPalette::Light, surfaceActive);
    palette.setColor(QPalette::Midlight, surfaceHover);
    palette.setColor(QPalette::Mid, borderDark);
    palette.setColor(QPalette::Dark, textMuted);
    palette.setColor(QPalette::Shadow, QColor(0x00, 0x00, 0x00));

    // Inactive state (e.g. unfocused window frame / dialog)
    palette.setColor(QPalette::Inactive, QPalette::Window, backgroundDark);
    palette.setColor(QPalette::Inactive, QPalette::WindowText, textPrimary);
    palette.setColor(QPalette::Inactive, QPalette::Base, backgroundDark);
    palette.setColor(QPalette::Inactive, QPalette::AlternateBase, backgroundCard);
    palette.setColor(QPalette::Inactive, QPalette::ToolTipBase, backgroundCard);
    palette.setColor(QPalette::Inactive, QPalette::ToolTipText, textPrimary);
    palette.setColor(QPalette::Inactive, QPalette::Text, textPrimary);
    palette.setColor(QPalette::Inactive, QPalette::Button, backgroundCard);
    palette.setColor(QPalette::Inactive, QPalette::ButtonText, textPrimary);
    palette.setColor(QPalette::Inactive, QPalette::BrightText, danger);
    palette.setColor(QPalette::Inactive, QPalette::Link, accentPrimary);
    palette.setColor(QPalette::Inactive, QPalette::Highlight, accentPrimary);
    palette.setColor(QPalette::Inactive, QPalette::HighlightedText, textOnAccent);
    palette.setColor(QPalette::Inactive, QPalette::PlaceholderText, textSecondary);
    palette.setColor(QPalette::Inactive, QPalette::Light, surfaceActive);
    palette.setColor(QPalette::Inactive, QPalette::Midlight, surfaceHover);
    palette.setColor(QPalette::Inactive, QPalette::Mid, borderDark);
    palette.setColor(QPalette::Inactive, QPalette::Dark, textMuted);
    palette.setColor(QPalette::Inactive, QPalette::Shadow, QColor(0x00, 0x00, 0x00));

    // Disabled state
    palette.setColor(QPalette::Disabled, QPalette::Window, backgroundDark);
    palette.setColor(QPalette::Disabled, QPalette::WindowText, textMuted);
    palette.setColor(QPalette::Disabled, QPalette::Base, backgroundDark);
    palette.setColor(QPalette::Disabled, QPalette::AlternateBase, backgroundCard);
    palette.setColor(QPalette::Disabled, QPalette::Text, textMuted);
    palette.setColor(QPalette::Disabled, QPalette::Button, backgroundCard);
    palette.setColor(QPalette::Disabled, QPalette::ButtonText, textMuted);
    palette.setColor(QPalette::Disabled, QPalette::Highlight, borderDark);
    palette.setColor(QPalette::Disabled, QPalette::HighlightedText, textMuted);
    palette.setColor(QPalette::Disabled, QPalette::PlaceholderText, textMuted);

    return palette;
}

void AppTheme::applyDarkTheme(QGuiApplication& app) {
    if (app.styleHints() != nullptr) {
        app.styleHints()->setColorScheme(Qt::ColorScheme::Dark);
    }
    app.setPalette(darkPalette());
}
#endif

} // namespace HarmonySync::ViewModels
