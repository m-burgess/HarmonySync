pragma Singleton
import QtQuick

QtObject {
    // Color Palette - Premium Modern Glassmorphic Dark Mode
    readonly property color backgroundDark: "#0f0f12"
    readonly property color backgroundCard: "#1e1e24"
    readonly property color backgroundHeader: "#09090b"
    readonly property color borderDark: "#33333d"
    readonly property color borderGlow: "#6366f1"

    readonly property color accentPrimary: "#6366f1" // Neon Indigo
    readonly property color accentHover: "#818cf8"
    readonly property color accentActive: "#4f46e5"
    readonly property color accentGlow: "#a5b4fc"

    readonly property color textPrimary: "#f4f4f5"
    readonly property color textSecondary: "#a1a1aa"
    readonly property color textMuted: "#71717a"

    readonly property color success: "#22c55e"
    readonly property color warning: "#f59e0b"
    readonly property color danger: "#ef4444"
    readonly property color info: "#0ea5e9"

    // Typography
    readonly property string fontFamily: "Inter, Roboto, sans-serif"
    readonly property int fontSizeSmall: 11
    readonly property int fontSizeBody: 13
    readonly property int fontSizeHeader: 15
    readonly property int fontSizeTitle: 18

    // Animation & Layout
    readonly property int animDuration: 150
    readonly property int borderRadius: 6
}
