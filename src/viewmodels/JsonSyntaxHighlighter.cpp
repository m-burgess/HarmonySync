#include "JsonSyntaxHighlighter.hpp"
#include <QQuickTextDocument>
#include <QTextDocument>
#include <utility>

JsonSyntaxHighlighter::JsonSyntaxHighlighter(QTextDocument* parent)
    : QSyntaxHighlighter(parent) {
    // Define format colors (matching the dark theme)
    keyFormat.setForeground(QColor("#9CDCFE"));     // Light Blue for keys
    stringFormat.setForeground(QColor("#CE9178"));  // Orange for strings
    numberFormat.setForeground(QColor("#B5CEA8"));  // Light Green for numbers
    booleanFormat.setForeground(QColor("#569CD6")); // Blue for booleans
    nullFormat.setForeground(QColor("#569CD6"));    // Blue for nulls

    HighlightingRule rule;

    // Numbers
    rule.pattern = QRegularExpression(QStringLiteral("[-+]?[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?"));
    rule.format = numberFormat;
    highlightingRules.append(rule);

    // Booleans
    rule.pattern = QRegularExpression(QStringLiteral("\\b(?:true|false)\\b"));
    rule.format = booleanFormat;
    highlightingRules.append(rule);

    // Null
    rule.pattern = QRegularExpression(QStringLiteral("\\bnull\\b"));
    rule.format = nullFormat;
    highlightingRules.append(rule);

    // Strings (including escaped quotes)
    rule.pattern = QRegularExpression(QStringLiteral("\"(?:\\\\\"|[^\"])*\""));
    rule.format = stringFormat;
    highlightingRules.append(rule);

    // Keys (string followed by a colon, ignoring whitespace)
    rule.pattern = QRegularExpression(QStringLiteral("\"(?:\\\\\"|[^\"])*\"(?=\\s*:)"));
    rule.format = keyFormat;
    highlightingRules.append(rule);
}

void JsonSyntaxHighlighter::highlightBlock(const QString& text) {
    for (const HighlightingRule& rule : std::as_const(highlightingRules)) {
        QRegularExpressionMatchIterator matchIterator = rule.pattern.globalMatch(text);
        while (matchIterator.hasNext()) {
            QRegularExpressionMatch match = matchIterator.next();
            setFormat(static_cast<int>(match.capturedStart()), static_cast<int>(match.capturedLength()), rule.format);
        }
    }
}
