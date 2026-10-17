#ifndef HARMONYSYNC_TESTS_TEST_CHECK_HPP
#define HARMONYSYNC_TESTS_TEST_CHECK_HPP

#include <cstdlib>
#include <iostream>

// Unlike assert(), stays active under NDEBUG so Release builds can't silently skip checks.
#define HS_CHECK(cond)                                                                                                 \
    do {                                                                                                               \
        if (!(cond)) {                                                                                                 \
            std::cerr << __FILE__ << ':' << __LINE__ << ": check failed: " #cond << '\n';                              \
            std::exit(EXIT_FAILURE);                                                                                   \
        }                                                                                                              \
    } while (false)

#endif // HARMONYSYNC_TESTS_TEST_CHECK_HPP
