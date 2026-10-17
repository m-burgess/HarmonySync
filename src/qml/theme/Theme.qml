pragma Singleton
import QtQuick

QtObject {
    // Color Palette - Premium Modern Dark Mode
    readonly property color backgroundDark: "#1e1e1e"
    readonly property color backgroundCard: "#252526"
    readonly property color backgroundHeader: "#252526"
    readonly property color borderDark: "#3c3c3c"
    readonly property color borderGlow: "#007acc"

    readonly property color accentPrimary: "#007acc"
    readonly property color accentHover: "#0098ff"
    readonly property color accentActive: "#0062a3"
    readonly property color accentGlow: "#4db8ff"

    readonly property color textPrimary: "#f4f4f5"
    readonly property color textSecondary: "#a1a1aa"
    readonly property color textMuted: "#71717a"
    readonly property color textOnAccent: "#ffffff"

    readonly property color surfaceHover: "#2d2d30"
    readonly property color surfaceActive: "#37373d"
    readonly property color inputBackground: "#1e1e1e"

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
