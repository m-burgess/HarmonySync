#include "JsonSyntaxHighlighter.hpp"

QmlJsonHighlighter::QmlJsonHighlighter(QObject* parent)
    : QObject(parent) {}

QQuickTextDocument* QmlJsonHighlighter::textDocument() const {
    return m_textDocument;
}

void QmlJsonHighlighter::setTextDocument(QQuickTextDocument* textDocument) {
    if (textDocument == m_textDocument) {
        return;
    }

    m_textDocument = textDocument;

    if (m_highlighter) {
        m_highlighter->deleteLater();
        m_highlighter = nullptr;
    }

    if (m_textDocument) {
        m_highlighter = new JsonSyntaxHighlighter(m_textDocument->textDocument());
    }

    emit textDocumentChanged();
}
