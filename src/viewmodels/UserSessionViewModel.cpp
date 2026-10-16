#include "UserSessionViewModel.hpp"

namespace HarmonySync::ViewModels {

struct UserSessionViewModel::Impl {
    bool authenticated{false};
    std::string name;
    std::string role{"Guest"};
};

UserSessionViewModel::UserSessionViewModel()
    : m_impl(std::make_unique<Impl>()) {}

UserSessionViewModel::~UserSessionViewModel() = default;

bool UserSessionViewModel::isAuthenticated() const noexcept {
    return m_impl->authenticated;
}

#ifdef HARMONYSYNC_QT_AVAILABLE
QString UserSessionViewModel::username() const {
    return QString::fromStdString(m_impl->name);
}

QString UserSessionViewModel::userRole() const {
    return QString::fromStdString(m_impl->role);
}

bool UserSessionViewModel::login(const QString& user, const QString& pass) {
    std::string uStr = user.toStdString();
    std::string pStr = pass.toStdString();
    if (!uStr.empty() && !pStr.empty()) {
        m_impl->authenticated = true;
        m_impl->name = uStr;
        m_impl->role = "Worship Leader";
        emit sessionStateChanged();
        return true;
    }
    return false;
}

void UserSessionViewModel::logout() {
    if (m_impl->authenticated) {
        m_impl->authenticated = false;
        m_impl->name.clear();
        m_impl->role = "Guest";
        emit sessionStateChanged();
    }
}

#else

std::string UserSessionViewModel::username() const {
    return m_impl->name;
}

std::string UserSessionViewModel::userRole() const {
    return m_impl->role;
}

bool UserSessionViewModel::login(const std::string& user, const std::string& pass) {
    if (!user.empty() && !pass.empty()) {
        m_impl->authenticated = true;
        m_impl->name = user;
        m_impl->role = "Worship Leader";
        return true;
    }
    return false;
}

void UserSessionViewModel::logout() {
    m_impl->authenticated = false;
    m_impl->name.clear();
    m_impl->role = "Guest";
}

#endif

std::string UserSessionViewModel::usernameStd() const {
    return m_impl->name;
}

std::string UserSessionViewModel::userRoleStd() const {
    return m_impl->role;
}

} // namespace HarmonySync::ViewModels
