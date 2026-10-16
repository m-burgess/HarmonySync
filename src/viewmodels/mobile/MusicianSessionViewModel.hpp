#ifndef HARMONYSYNC_MUSICIAN_SESSION_VIEWMODEL_HPP
#define HARMONYSYNC_MUSICIAN_SESSION_VIEWMODEL_HPP

#include "MobileApiClient.hpp"
#include <memory>
#include <string>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel bridging the MobileApiClient connection state to the QML pairing interface.
 */
class MusicianSessionViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(bool isConnected READ isConnected NOTIFY connectionStateChanged)
    Q_PROPERTY(bool isConnecting READ isConnecting NOTIFY connectionStateChanged)
    Q_PROPERTY(bool hasAuthError READ hasAuthError NOTIFY connectionStateChanged)
    Q_PROPERTY(QString hostIp READ hostIp WRITE setHostIp NOTIFY hostIpChanged)
    Q_PROPERTY(QString pairingPin READ pairingPin WRITE setPairingPin NOTIFY pairingPinChanged)
#endif

public:
    explicit MusicianSessionViewModel(std::shared_ptr<Core::MobileApiClient> client = nullptr);
#ifdef HARMONYSYNC_QT_AVAILABLE
    ~MusicianSessionViewModel() override;
#else
    ~MusicianSessionViewModel();
#endif

    MusicianSessionViewModel(const MusicianSessionViewModel&) = delete;
    MusicianSessionViewModel& operator=(const MusicianSessionViewModel&) = delete;

    [[nodiscard]] bool isConnected() const noexcept;
    [[nodiscard]] bool isConnecting() const noexcept;
    [[nodiscard]] bool hasAuthError() const noexcept;

#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString hostIp() const;
    void setHostIp(const QString& ip);
    [[nodiscard]] QString pairingPin() const;
    void setPairingPin(const QString& pin);

    Q_INVOKABLE void connectToHost();
    Q_INVOKABLE void disconnectFromHost();
#else
    [[nodiscard]] std::string hostIp() const;
    void setHostIp(const std::string& ip);
    [[nodiscard]] std::string pairingPin() const;
    void setPairingPin(const std::string& pin);

    void connectToHost();
    void disconnectFromHost();
#endif

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void connectionStateChanged();
    void hostIpChanged();
    void pairingPinChanged();
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_MUSICIAN_SESSION_VIEWMODEL_HPP
