add_library(harmonysync_core STATIC
    models/MediaStem.cpp
    models/SongMap.cpp
    models/SlideItem.cpp
    models/ServiceOrder.cpp
    models/AppSettings.cpp
    services/ConfigService.cpp
    services/FolderService.cpp
    services/DisplayManager.cpp
    services/CloudNetworkService.cpp
    services/OnlineLyricsFetcher.cpp
    services/LocalDatabaseService.cpp
    services/SongLibraryIndexService.cpp
    services/RemoteApiServer.cpp
    services/LocalizationService.cpp
    services/CloudSyncEngine.cpp
    services/CrashReporterService.cpp
    services/AutoUpdateService.cpp
    services/ServiceOrderFolderScanner.cpp
    services/SettingsStorageService.cpp
    services/MobileApiClient.cpp
    services/AILyricSyncService.cpp
    services/QtProcessRunner.cpp
    services/QtWebSocketTransport.cpp
    services/ChordTransposer.cpp
    services/qrcodegen.cpp
    services/QrCodeImageProvider.cpp
)

target_include_directories(harmonysync_core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/models
    ${CMAKE_CURRENT_SOURCE_DIR}/services
)

if(Qt6_FOUND)
    target_link_libraries(harmonysync_core PUBLIC Qt6::Core Qt6::Gui Qt6::WebSockets Qt6::Quick)
endif()
