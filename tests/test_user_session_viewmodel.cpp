#include "UserSessionViewModel.hpp"
#include "test_check.hpp"

#include <QObject>

using namespace HarmonySync::ViewModels;

int main() {
    UserSessionViewModel session;
    int changes = 0;
    QObject::connect(&session, &UserSessionViewModel::sessionStateChanged, [&] { ++changes; });

    HS_CHECK(!session.isAuthenticated());
    HS_CHECK(session.username().isEmpty());
    HS_CHECK(session.userRole() == QStringLiteral("Guest"));
    HS_CHECK(!session.login(QString(), QStringLiteral("secret")));
    HS_CHECK(!session.login(QStringLiteral("leader"), QString()));
    HS_CHECK(changes == 0);

    HS_CHECK(session.login(QStringLiteral("leader"), QStringLiteral("secret")));
    HS_CHECK(session.isAuthenticated());
    HS_CHECK(session.username() == QStringLiteral("leader"));
    HS_CHECK(session.userRole() == QStringLiteral("Worship Leader"));
    HS_CHECK(session.usernameStd() == "leader");
    HS_CHECK(session.userRoleStd() == "Worship Leader");
    HS_CHECK(changes == 1);

    session.logout();
    HS_CHECK(!session.isAuthenticated());
    HS_CHECK(session.username().isEmpty());
    HS_CHECK(session.userRole() == QStringLiteral("Guest"));
    HS_CHECK(changes == 2);
    session.logout();
    HS_CHECK(changes == 2);
    return 0;
}
