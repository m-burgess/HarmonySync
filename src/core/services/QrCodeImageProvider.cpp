#include "QrCodeImageProvider.hpp"
#include "qrcodegen.hpp"
#include <QColor>
#include <QPainter>

namespace HarmonySync::Core {

QrCodeImageProvider::QrCodeImageProvider()
    : QQuickImageProvider(QQuickImageProvider::Image)
{
}

QImage QrCodeImageProvider::requestImage(const QString &id, QSize *size, const QSize &requestedSize) {
    // Generate QR Code
    qrcodegen::QrCode qr = qrcodegen::QrCode::encodeText(id.toUtf8().constData(), qrcodegen::QrCode::Ecc::LOW);
    
    int scale = 10; // 10 pixels per module
    int imgSize = qr.getSize() * scale;
    
    QImage img(imgSize, imgSize, QImage::Format_RGB32);
    img.fill(QColor("white"));
    
    QPainter painter(&img);
    painter.setBrush(QColor("black"));
    painter.setPen(Qt::NoPen);
    
    for (int y = 0; y < qr.getSize(); ++y) {
        for (int x = 0; x < qr.getSize(); ++x) {
            if (qr.getModule(x, y)) {
                painter.drawRect(x * scale, y * scale, scale, scale);
            }
        }
    }
    
    if (size) {
        *size = QSize(imgSize, imgSize);
    }
    
    if (requestedSize.isValid()) {
        return img.scaled(requestedSize, Qt::KeepAspectRatio, Qt::SmoothTransformation);
    }
    
    return img;
}

} // namespace HarmonySync::Core
