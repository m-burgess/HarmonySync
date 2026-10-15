# Opt-in line coverage instrumentation (gcc/clang gcov-compatible).
option(HARMONYSYNC_COVERAGE "Instrument C++ targets for gcov/gcovr coverage" OFF)

if(HARMONYSYNC_COVERAGE)
    if(MSVC)
        message(FATAL_ERROR "HARMONYSYNC_COVERAGE requires gcc or clang")
    endif()
    # Tests use assert(); NDEBUG would compile the checks (and the code they exercise) out.
    if(CMAKE_BUILD_TYPE MATCHES "^(Release|RelWithDebInfo|MinSizeRel)$")
        message(FATAL_ERROR "HARMONYSYNC_COVERAGE requires CMAKE_BUILD_TYPE=Debug (tests rely on assert)")
    endif()
    message(STATUS "Coverage instrumentation enabled")
    add_compile_options(--coverage -O0 -g -fno-inline)
    add_link_options(--coverage)
endif()
