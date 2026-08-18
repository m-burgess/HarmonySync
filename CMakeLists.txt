cmake_minimum_required(VERSION 3.20)
project(HarmonySync VERSION 2.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile commands for language servers
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Strict Compiler Warnings (Sutter & Alexandrescu Standard #1)
if(MSVC)
    add_compile_options(/W4 /WX /permissive-)
else()
    add_compile_options(
        -Wall
        -Wextra
        -Wpedantic
        -Wconversion
        -Wsign-conversion
        -Wnon-virtual-dtor
        -Wold-style-cast
        -Wcast-align
        -Wunused
        -Woverloaded-virtual
        -Wshadow
        -Werror=return-type
    )
endif()

# Find Qt 6 Packages (Optional Fallback for standalone C++ core testing)
find_package(Qt6 COMPONENTS Core Gui Quick QuickControls2 Multimedia Test QUIET)

# Use find_package(Qt6WebEngineQuick) instead of COMPONENTS to prevent overriding Qt6_FOUND if not installed
find_package(Qt6WebEngineQuick QUIET)
if (Qt6WebEngineQuick_FOUND)
    message(STATUS "Qt6 WebEngineQuick found. Playlist automation will be enabled.")
    add_compile_definitions(HARMONYSYNC_HAS_WEBENGINE=1)
endif()

if(Qt6_FOUND)
    message(STATUS "Qt6 found version: ${Qt6_VERSION}")
    set(CMAKE_AUTOMOC ON)
    set(CMAKE_AUTORCC ON)
    set(CMAKE_AUTOUIC ON)
    add_compile_definitions(HARMONYSYNC_HAS_QT=1)
else()
    message(STATUS "Qt6 packages not found in PATH. Building C++ domain core and standalone test target.")
endif()

# Global Include Directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core/models
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core/services
    ${CMAKE_CURRENT_SOURCE_DIR}/src/media
    ${CMAKE_CURRENT_SOURCE_DIR}/src/viewmodels
)

# Enable CTest
enable_testing()

# Include Subdirectories
add_subdirectory(src/core)
add_subdirectory(src/media)
add_subdirectory(src/viewmodels)
add_subdirectory(tests)

# Application Executable Target
add_executable(harmonysync_app src/main.cpp)
target_link_libraries(harmonysync_app PRIVATE harmonysync_viewmodels harmonysync_media harmonysync_core)

if(Qt6_FOUND)
    target_link_libraries(harmonysync_app PRIVATE Qt6::Core Qt6::Quick Qt6::QuickControls2 Qt6::Multimedia)
    if (Qt6WebEngineQuick_FOUND)
        target_link_libraries(harmonysync_app PRIVATE Qt6::WebEngineQuick)
    endif()
    qt_add_resources(harmonysync_app "qml_resources"
        PREFIX "/"
        FILES
            src/qml/main.qml
            src/qml/theme/Theme.qml
            src/qml/theme/qmldir
            src/qml/components/LyricsPanel.qml
            src/qml/components/ServiceOrderPanel.qml
            src/qml/components/SlideDisplayPanel.qml
            src/qml/components/StemMixerPanel.qml
            src/qml/components/SettingsDialog.qml
    )

    # Mobile Musician App Executable
    add_executable(harmonysync_musician_app src/mobile/main_mobile.cpp)
    target_link_libraries(harmonysync_musician_app PRIVATE harmonysync_viewmodels harmonysync_core Qt6::Core Qt6::Quick Qt6::Gui)
    qt_add_resources(harmonysync_musician_app "mobile_qml_resources"
        PREFIX "/"
        FILES
            src/mobile/qml/main_mobile.qml
            src/mobile/qml/views/StageLyricsView.qml
    )
endif()

# CPack Packaging Support
include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/CPackConfig.cmake)

