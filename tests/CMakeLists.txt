# Test Models
add_executable(test_models test_models.cpp)
target_link_libraries(test_models PRIVATE harmonysync_core)
add_test(NAME test_models COMMAND test_models)

# Test Core Models (value-type behavior, copy/move, bounds)
add_executable(test_core_models test_core_models.cpp)
target_link_libraries(test_core_models PRIVATE harmonysync_core)
add_test(NAME test_core_models COMMAND test_core_models)

# Test core data services: config, settings, database, index, localization,
# and chords.
add_executable(test_core_data_services test_core_data_services.cpp)
target_link_libraries(test_core_data_services PRIVATE harmonysync_core)
add_test(NAME test_core_data_services COMMAND test_core_data_services)

# Test folder scanning, song-map JSON, mix state and service order scanning
add_executable(test_core_folder_services test_core_folder_services.cpp)
target_link_libraries(test_core_folder_services PRIVATE harmonysync_core)
add_test(NAME test_core_folder_services COMMAND test_core_folder_services)

# Test Config Service
add_executable(test_config_service test_config_service.cpp)
target_link_libraries(test_config_service PRIVATE harmonysync_core)
add_test(NAME test_config_service COMMAND test_config_service)

# Test Folder Service
add_executable(test_folder_service test_folder_service.cpp)
target_link_libraries(test_folder_service PRIVATE harmonysync_core)
add_test(NAME test_folder_service COMMAND test_folder_service)

# Test Audio Engine & Mixer
add_executable(test_audio_engine test_audio_engine.cpp)
target_link_libraries(
    test_audio_engine
    PRIVATE harmonysync_media harmonysync_core
)
add_test(NAME test_audio_engine COMMAND test_audio_engine)

# Test mixer output, panning, handoff, and sink control with a fake audio sink.
add_executable(test_audio_mixing test_audio_mixing.cpp)
target_link_libraries(
    test_audio_mixing
    PRIVATE harmonysync_media harmonysync_core
)
add_test(NAME test_audio_mixing COMMAND test_audio_mixing)

# Test compressor, equalizer and stem gain rules
add_executable(test_audio_effects test_audio_effects.cpp)
target_link_libraries(
    test_audio_effects
    PRIVATE harmonysync_media harmonysync_core
)
add_test(NAME test_audio_effects COMMAND test_audio_effects)

# Test FFmpeg transposer against a fake command runner
add_executable(test_ffmpeg_transposer test_ffmpeg_transposer.cpp)
target_link_libraries(
    test_ffmpeg_transposer
    PRIVATE harmonysync_media harmonysync_core
)
add_test(NAME test_ffmpeg_transposer COMMAND test_ffmpeg_transposer)

# Audio keeps flowing while the main thread is blocked (#177).
# Skips (exit 0) with no audio device.
add_executable(test_audio_thread test_audio_thread.cpp)
target_link_libraries(
    test_audio_thread
    PRIVATE harmonysync_media harmonysync_core
)
if(Qt6_FOUND)
    target_link_libraries(test_audio_thread PRIVATE Qt6::Core)
endif()
add_test(NAME test_audio_thread COMMAND test_audio_thread)

# Test ViewModels
add_executable(test_viewmodels test_viewmodels.cpp)
target_link_libraries(
    test_viewmodels
    PRIVATE harmonysync_viewmodels harmonysync_media harmonysync_core
)
add_test(NAME test_viewmodels COMMAND test_viewmodels)

# Test Display Manager
add_executable(test_display_manager test_display_manager.cpp)
target_link_libraries(
    test_display_manager
    PRIVATE harmonysync_viewmodels harmonysync_core
)
add_test(NAME test_display_manager COMMAND test_display_manager)

# Test display screen enumeration and QR code rendering
add_executable(test_display_and_qr test_display_and_qr.cpp)
target_link_libraries(test_display_and_qr PRIVATE harmonysync_core)
add_test(NAME test_display_and_qr COMMAND test_display_and_qr)

# Test Audio DSP
add_executable(test_audio_dsp test_audio_dsp.cpp)
target_link_libraries(test_audio_dsp PRIVATE harmonysync_media harmonysync_core)
add_test(NAME test_audio_dsp COMMAND test_audio_dsp)

# Test Network Services
add_executable(test_network_services test_network_services.cpp)
target_link_libraries(test_network_services PRIVATE harmonysync_core)
add_test(NAME test_network_services COMMAND test_network_services)

# Test Automation
add_executable(test_media_io test_media_io.cpp)
target_link_libraries(test_media_io PRIVATE harmonysync_media)
add_test(NAME test_media_io COMMAND test_media_io)

# Existing automation integration tests
add_executable(test_automation test_automation.cpp)
target_link_libraries(
    test_automation
    PRIVATE harmonysync_media harmonysync_core
)
add_test(NAME test_automation COMMAND test_automation)

# Test MIDI Hardware Integration
add_executable(test_midi_hardware test_midi_hardware.cpp)
target_link_libraries(
    test_midi_hardware
    PRIVATE harmonysync_viewmodels harmonysync_media harmonysync_core
)
add_test(NAME test_midi_hardware COMMAND test_midi_hardware)

# Test Video Compositor & Presentation
add_executable(test_video_compositor test_video_compositor.cpp)
target_link_libraries(
    test_video_compositor
    PRIVATE harmonysync_viewmodels harmonysync_media harmonysync_core
)
add_test(NAME test_video_compositor COMMAND test_video_compositor)

# Test Local Database & Fuzzy Search Index
add_executable(test_local_database test_local_database.cpp)
target_link_libraries(test_local_database PRIVATE harmonysync_core)
add_test(NAME test_local_database COMMAND test_local_database)

# Test Remote Control API
add_executable(test_remote_api test_remote_api.cpp)
target_link_libraries(test_remote_api PRIVATE harmonysync_core)
add_test(NAME test_remote_api COMMAND test_remote_api)

# Test Advanced Audio DSP (EQ & Compressor)
add_executable(test_audio_dsp_advanced test_audio_dsp_advanced.cpp)
target_link_libraries(
    test_audio_dsp_advanced
    PRIVATE harmonysync_viewmodels harmonysync_media harmonysync_core
)
add_test(NAME test_audio_dsp_advanced COMMAND test_audio_dsp_advanced)

# Direct viewmodel audio controls and boundary behavior, checked in Release too.
add_executable(test_viewmodels_audio test_viewmodels_audio.cpp)
target_link_libraries(
    test_viewmodels_audio
    PRIVATE harmonysync_viewmodels harmonysync_media harmonysync_core
)
add_test(NAME test_viewmodels_audio COMMAND test_viewmodels_audio)

# Test Multi-Language Localization
add_executable(test_localization test_localization.cpp)
target_link_libraries(test_localization PRIVATE harmonysync_core)
add_test(NAME test_localization COMMAND test_localization)

# Test NDI Network Video Broadcast
add_executable(test_ndi_broadcast test_ndi_broadcast.cpp)
target_link_libraries(
    test_ndi_broadcast
    PRIVATE harmonysync_viewmodels harmonysync_media harmonysync_core
)
add_test(NAME test_ndi_broadcast COMMAND test_ndi_broadcast)

# Test Cloud Sync & User Permissions
add_executable(test_cloud_sync test_cloud_sync.cpp)
target_link_libraries(
    test_cloud_sync
    PRIVATE harmonysync_viewmodels harmonysync_core
)
add_test(NAME test_cloud_sync COMMAND test_cloud_sync)

# Test Enterprise Diagnostics & Auto-Update
add_executable(test_diagnostics test_diagnostics.cpp)
target_link_libraries(test_diagnostics PRIVATE harmonysync_core)
add_test(NAME test_diagnostics COMMAND test_diagnostics)

# Test Service Order Folder Scanner
add_executable(
    test_service_order_folder_scanner
    test_service_order_folder_scanner.cpp
)
target_link_libraries(
    test_service_order_folder_scanner
    PRIVATE harmonysync_core
)
add_test(
    NAME test_service_order_folder_scanner
    COMMAND test_service_order_folder_scanner
)

# Test Setlist Folder Selection
add_executable(test_setlist_folder_selection test_setlist_folder_selection.cpp)
target_link_libraries(
    test_setlist_folder_selection
    PRIVATE harmonysync_viewmodels harmonysync_core
)
add_test(
    NAME test_setlist_folder_selection
    COMMAND test_setlist_folder_selection
)

# Test QML Service Reflow
add_executable(test_qml_service_reflow test_qml_service_reflow.cpp)
target_link_libraries(
    test_qml_service_reflow
    PRIVATE harmonysync_viewmodels harmonysync_core
)
add_test(NAME test_qml_service_reflow COMMAND test_qml_service_reflow)

# Test App Settings Model & Storage
add_executable(test_app_settings test_app_settings.cpp)
target_link_libraries(test_app_settings PRIVATE harmonysync_core)
add_test(NAME test_app_settings COMMAND test_app_settings)

# Test Settings ViewModel
add_executable(test_settings_viewmodel test_settings_viewmodel.cpp)
target_link_libraries(
    test_settings_viewmodel
    PRIVATE harmonysync_viewmodels harmonysync_core
)
add_test(NAME test_settings_viewmodel COMMAND test_settings_viewmodel)

# Session transitions and QObject state notifications.
add_executable(test_user_session_viewmodel test_user_session_viewmodel.cpp)
target_link_libraries(
    test_user_session_viewmodel
    PRIVATE harmonysync_viewmodels
)
add_test(NAME test_user_session_viewmodel COMMAND test_user_session_viewmodel)

# Test QML Settings Dialog
add_executable(test_qml_settings_dialog test_qml_settings_dialog.cpp)
target_link_libraries(
    test_qml_settings_dialog
    PRIVATE harmonysync_viewmodels harmonysync_core
)
add_test(NAME test_qml_settings_dialog COMMAND test_qml_settings_dialog)

# Test Mobile API Client
add_executable(test_mobile_api_client test_mobile_api_client.cpp)
target_link_libraries(test_mobile_api_client PRIVATE harmonysync_core)
add_test(NAME test_mobile_api_client COMMAND test_mobile_api_client)

# Test Mobile ViewModels
add_executable(test_mobile_viewmodels test_mobile_viewmodels.cpp)
target_link_libraries(
    test_mobile_viewmodels
    PRIVATE harmonysync_viewmodels harmonysync_core
)
add_test(NAME test_mobile_viewmodels COMMAND test_mobile_viewmodels)

# Test AI Lyric Sync Service
add_executable(test_ai_lyric_sync test_ai_lyric_sync.cpp)
target_link_libraries(test_ai_lyric_sync PRIVATE harmonysync_core)
if(Qt6_FOUND)
    target_link_libraries(test_ai_lyric_sync PRIVATE Qt6::Core)
endif()
add_test(NAME test_ai_lyric_sync COMMAND test_ai_lyric_sync)

find_package(Python3 COMPONENTS Interpreter QUIET)
if(Python3_FOUND)
    set(HS_TEST_PYTHON "${Python3_EXECUTABLE}")
    if(EXISTS "${CMAKE_SOURCE_DIR}/scripts/venv/bin/python3")
        set(HS_TEST_PYTHON "${CMAKE_SOURCE_DIR}/scripts/venv/bin/python3")
    endif()
    add_test(
        NAME test_ai_lyric_sync_py
        COMMAND
            "${HS_TEST_PYTHON}"
            "${CMAKE_CURRENT_SOURCE_DIR}/test_ai_lyric_sync.py"
    )
endif()

# Test StemMixerPanel.qml against AudioMixerViewModel (#188)
if(Qt6_FOUND)
    add_executable(test_viewmodels_display test_viewmodels_display.cpp)
    target_link_libraries(
        test_viewmodels_display
        PRIVATE
            harmonysync_viewmodels
            harmonysync_media
            harmonysync_core
            Qt6::Core
            Qt6::Gui
            Qt6::Quick
    )
    add_test(NAME test_viewmodels_display COMMAND test_viewmodels_display)

    add_executable(test_qml_stem_mixer_panel test_qml_stem_mixer_panel.cpp)
    target_link_libraries(
        test_qml_stem_mixer_panel
        PRIVATE
            harmonysync_viewmodels
            harmonysync_media
            harmonysync_core
            Qt6::Core
            Qt6::Gui
            Qt6::Quick
            Qt6::QuickControls2
    )
    target_compile_definitions(
        test_qml_stem_mixer_panel
        PRIVATE HS_QML_DIR="${CMAKE_SOURCE_DIR}/src/qml"
    )
    add_test(NAME test_qml_stem_mixer_panel COMMAND test_qml_stem_mixer_panel)

    # #187/#220: setlist selection to song audio, through SongSwitchCoordinator.
    add_executable(
        test_song_switch_coordinator
        test_song_switch_coordinator.cpp
    )
    target_link_libraries(
        test_song_switch_coordinator
        PRIVATE
            harmonysync_viewmodels
            harmonysync_media
            harmonysync_core
            Qt6::Core
            Qt6::Test
    )
    add_test(
        NAME test_song_switch_coordinator
        COMMAND test_song_switch_coordinator
    )

    # #244: song videos loop; other videos fade out smoothly.
    add_executable(test_video_loop_and_fade test_video_loop_and_fade.cpp)
    target_link_libraries(
        test_video_loop_and_fade
        PRIVATE
            harmonysync_viewmodels
            harmonysync_media
            harmonysync_core
            Qt6::Core
            Qt6::Gui
            Qt6::Quick
            Qt6::QuickControls2
            Qt6::Multimedia
    )
    target_compile_definitions(
        test_video_loop_and_fade
        PRIVATE HS_QML_DIR="${CMAKE_SOURCE_DIR}/src/qml"
    )
    add_test(NAME test_video_loop_and_fade COMMAND test_video_loop_and_fade)
endif()
