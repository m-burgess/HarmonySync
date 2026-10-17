#ifndef HARMONYSYNC_QR_CODE_IMAGE_PROVIDER_HPP
#define HARMONYSYNC_QR_CODE_IMAGE_PROVIDER_HPP

#include <QQuickImageProvider>
#include <QImage>

namespace HarmonySync::Core {

class QrCodeImageProvider : public QQuickImageProvider {
public:
    QrCodeImageProvider();

    QImage requestImage(const QString& id, QSize* size, const QSize& requestedSize) override;
};

} // namespace HarmonySync::Core

#endif // HARMONYSYNC_QR_CODE_IMAGE_PROVIDER_HPP
