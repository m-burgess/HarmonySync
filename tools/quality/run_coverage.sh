#!/usr/bin/env bash
# Build with coverage, run the full ctest suite, and check per-component floors.
# Usage: run_coverage.sh [BUILD_DIR]   (default: build-coverage). Extra cmake args via CMAKE_ARGS.
# Requires: cmake, ninja, gcovr, python3, Qt6 (set CMAKE_PREFIX_PATH if not on the default path).
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
build_dir="${1:-$root/build-coverage}"
cd "$root"

# shellcheck disable=SC2086
cmake -S . -B "$build_dir" -G Ninja -DCMAKE_BUILD_TYPE=Debug -DHARMONYSYNC_COVERAGE=ON ${CMAKE_ARGS:-}
cmake --build "$build_dir" -j "$(nproc)"

# Stale counters from earlier runs would inflate results.
find "$build_dir" -name '*.gcda' -delete
ctest --test-dir "$build_dir" --output-on-failure --no-tests=error

gcovr --root "$root" "$build_dir" \
    --filter 'src/' \
    --exclude 'src/main\.cpp' \
    --exclude 'src/mobile/main_mobile\.cpp' \
    --exclude '.*/qrcodegen\..*' \
    --exclude-unreachable-branches --exclude-throw-branches \
    --json-summary "$build_dir/coverage-summary.json" --json-summary-pretty \
    --xml "$build_dir/coverage.xml" \
    --html-details "$build_dir/coverage.html"

python3 tools/quality/check_coverage.py "$build_dir/coverage-summary.json"
