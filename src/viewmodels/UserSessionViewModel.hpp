#ifndef HARMONYSYNC_USER_SESSION_VIEWMODEL_HPP
#define HARMONYSYNC_USER_SESSION_VIEWMODEL_HPP

#include <memory>
#include <string>

#if defined(HARMONYSYNC_HAS_QT) || __has_include(<QObject>)
#include <QObject>
#include <QString>
#define HARMONYSYNC_QT_AVAILABLE 1
#endif

namespace HarmonySync::ViewModels {

/**
 * @brief ViewModel managing active team user sessions, roles (Admin, Leader, Operator), and cloud sync permissions.
 */
class UserSessionViewModel
#ifdef HARMONYSYNC_QT_AVAILABLE
    : public QObject
#endif
{
#ifdef HARMONYSYNC_QT_AVAILABLE
    Q_OBJECT
    Q_PROPERTY(bool isAuthenticated READ isAuthenticated NOTIFY sessionStateChanged)
    Q_PROPERTY(QString username READ username NOTIFY sessionStateChanged)
    Q_PROPERTY(QString userRole READ userRole NOTIFY sessionStateChanged)
#endif

public:
    UserSessionViewModel();
#ifdef HARMONYSYNC_QT_AVAILABLE
    ~UserSessionViewModel() override;
#else
    ~UserSessionViewModel();
#endif

    UserSessionViewModel(const UserSessionViewModel&) = delete;
    UserSessionViewModel& operator=(const UserSessionViewModel&) = delete;

    [[nodiscard]] bool isAuthenticated() const noexcept;

#ifdef HARMONYSYNC_QT_AVAILABLE
    [[nodiscard]] QString username() const;
    [[nodiscard]] QString userRole() const;
    Q_INVOKABLE bool login(const QString& user, const QString& pass);
    Q_INVOKABLE void logout();
#else
    [[nodiscard]] std::string username() const;
    [[nodiscard]] std::string userRole() const;
    bool login(const std::string& user, const std::string& pass);
    void logout();
#endif
    [[nodiscard]] std::string usernameStd() const;
    [[nodiscard]] std::string userRoleStd() const;

#ifdef HARMONYSYNC_QT_AVAILABLE
signals:
    void sessionStateChanged();
#endif

private:
    struct Impl;
    std::unique_ptr<Impl> m_impl;
};

} // namespace HarmonySync::ViewModels

#endif // HARMONYSYNC_USER_SESSION_VIEWMODEL_HPP
