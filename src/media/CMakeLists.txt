add_library(harmonysync_media STATIC
    AudioEngine.cpp
    StemMixer.cpp
    FFmpegAudioDecoder.cpp
    AudioPitchShifter.cpp
    DmxController.cpp
    EventTriggerEngine.cpp
    MidiHardwareDevice.cpp
    VideoBackgroundPlayer.cpp
    MultiBandEqualizer.cpp
    AudioDynamicsCompressor.cpp
    NdiVideoOutputService.cpp
)

target_include_directories(harmonysync_media PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/src/core/models
)

target_link_libraries(harmonysync_media PUBLIC harmonysync_core)

if(Qt6_FOUND)
    target_link_libraries(harmonysync_media PRIVATE Qt6::Core Qt6::Multimedia)
endif()
