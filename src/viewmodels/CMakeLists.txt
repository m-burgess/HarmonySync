add_library(harmonysync_viewmodels STATIC
    SetlistViewModel.cpp
    AudioMixerViewModel.cpp
    SongSwitchCoordinator.cpp
    SlideDisplayViewModel.cpp
    ConfidenceMonitorViewModel.cpp
    MidiMappingViewModel.cpp
    PresentationWindowViewModel.cpp
    AudioFxViewModel.cpp
    LowerThirdOverlayViewModel.cpp
    UserSessionViewModel.cpp
    SettingsViewModel.cpp
    JsonSyntaxHighlighter.cpp
    mobile/MusicianSessionViewModel.cpp
    mobile/MusicianConfidenceViewModel.cpp
)

target_include_directories(harmonysync_viewmodels PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/mobile
    ${CMAKE_SOURCE_DIR}/src/core/models
    ${CMAKE_SOURCE_DIR}/src/core/services
    ${CMAKE_SOURCE_DIR}/src/media
)

target_link_libraries(harmonysync_viewmodels PUBLIC harmonysync_core harmonysync_media)

if(Qt6_FOUND)
    target_link_libraries(harmonysync_viewmodels PUBLIC Qt6::Core Qt6::Gui Qt6::Quick)
endif()
