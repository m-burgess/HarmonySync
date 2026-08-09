#include "CloudSyncEngine.hpp"
#include "UserSessionViewModel.hpp"
#include <iostream>
#include <cassert>
#include <cstdlib>

using namespace HarmonySync::Core;
using namespace HarmonySync::ViewModels;

void testCloudSyncEngine() {
    std::cout << "[TEST] Running testCloudSyncEngine..." << std::endl;

    CloudSyncEngine syncEngine("https://api.harmonysync.org/test");
    assert(syncEngine.endpointUrl() == "https://api.harmonysync.org/test");
    assert(syncEngine.isAutoSyncEnabled() == true);

    ServiceOrder order;
    bool synced = syncEngine.syncServiceOrder(order);
    assert(synced == true);
    assert(syncEngine.syncState() == SyncState::InSync);

    std::cout << "[PASS] testCloudSyncEngine passed." << std::endl;
}

void testUserSessionViewModel() {
    std::cout << "[TEST] Running testUserSessionViewModel..." << std::endl;

    UserSessionViewModel vm;
    assert(!vm.isAuthenticated());
    assert(vm.userRoleStd() == "Guest");

#ifdef HARMONYSYNC_QT_AVAILABLE
    bool loggedIn = vm.login(QStringLiteral("worship_lead"), QStringLiteral("secure_pass"));
#else
    bool loggedIn = vm.login("worship_lead", "secure_pass");
#endif
    assert(loggedIn == true);
    assert(vm.isAuthenticated() == true);
    assert(vm.usernameStd() == "worship_lead");
    assert(vm.userRoleStd() == "Worship Leader");

    vm.logout();
    assert(!vm.isAuthenticated());
    assert(vm.userRoleStd() == "Guest");

    std::cout << "[PASS] testUserSessionViewModel passed." << std::endl;
}

int main() {
    try {
        testCloudSyncEngine();
        testUserSessionViewModel();
        std::cout << "\nALL SPRINT 19 CLOUD SYNC UNIT TESTS PASSED (100% Success)" << std::endl;
        return EXIT_SUCCESS;
    } catch (const std::exception& ex) {
        std::cerr << "EXCEPTION in Cloud Sync unit tests: " << ex.what() << std::endl;
        return EXIT_FAILURE;
    }
}
