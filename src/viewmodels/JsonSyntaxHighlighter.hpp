#ifndef JSONSYNTAXHIGHLIGHTER_HPP
#define JSONSYNTAXHIGHLIGHTER_HPP

#include <QObject>
#include <QSyntaxHighlighter>
#include <QRegularExpression>
#include <QTextCharFormat>
#include <QQuickTextDocument>

class QTextDocument;

class JsonSyntaxHighlighter : public QSyntaxHighlighter {
    Q_OBJECT

public:
    explicit JsonSyntaxHighlighter(QTextDocument* parent = nullptr);

protected:
    void highlightBlock(const QString& text) override;

private:
    struct HighlightingRule {
        QRegularExpression pattern;
        QTextCharFormat format;
    };
    QVector<HighlightingRule> highlightingRules;

    QTextCharFormat keyFormat;
    QTextCharFormat stringFormat;
    QTextCharFormat numberFormat;
    QTextCharFormat booleanFormat;
    QTextCharFormat nullFormat;
};

class QmlJsonHighlighter : public QObject {
    Q_OBJECT
    Q_PROPERTY(QQuickTextDocument* textDocument READ textDocument WRITE setTextDocument NOTIFY textDocumentChanged)

public:
    explicit QmlJsonHighlighter(QObject* parent = nullptr);

    QQuickTextDocument* textDocument() const;
    void setTextDocument(QQuickTextDocument* textDocument);

signals:
    void textDocumentChanged();

private:
    QQuickTextDocument* m_textDocument{nullptr};
    JsonSyntaxHighlighter* m_highlighter{nullptr};
};

#endif // JSONSYNTAXHIGHLIGHTER_HPP
