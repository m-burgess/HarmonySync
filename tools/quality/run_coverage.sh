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

known=()
while IFS= read -r name; do
    [[ -z "$name" || "$name" == \#* ]] && continue
    known+=("$name")
done <tools/quality/known-failing-tests.txt
known_regex="^($(IFS='|'; echo "${known[*]}"))\$"

ctest --test-dir "$build_dir" --output-on-failure --no-tests=error -E "$known_regex"
# Known-failing tests still contribute coverage when they exit normally, but must not fail the job.
ctest --test-dir "$build_dir" --output-on-failure -R "$known_regex" || echo "WARNING: known-failing tests failed (see tools/quality/known-failing-tests.txt)"

gcovr --root "$root" "$build_dir" \
    --filter 'src/' \
    --exclude 'src/main\.cpp' \
    --exclude 'src/mobile/main_mobile\.cpp' \
    --exclude '.*/qrcodegen\..*' \
    --exclude '.*/Qt(WebSocketTransport|ProcessRunner|AudioSink|CommandRunner)\..*' \
    --exclude-unreachable-branches --exclude-throw-branches \
    --json-summary "$build_dir/coverage-summary.json" --json-summary-pretty \
    --xml "$build_dir/coverage.xml" \
    --html-details "$build_dir/coverage.html"

# BASE_COMPONENTS: base-branch components.json (unset on the bootstrap PR or push builds).
# ALLOW_FLOOR_DECREASE=1 permits an explicit, reviewed baseline adjustment.
check_args=()
[[ -n "${BASE_COMPONENTS:-}" && -f "$BASE_COMPONENTS" ]] && check_args+=(--base-config "$BASE_COMPONENTS")
[[ "${ALLOW_FLOOR_DECREASE:-}" == "1" ]] && check_args+=(--allow-floor-decrease)
python3 tools/quality/check_coverage.py "$build_dir/coverage-summary.json" "${check_args[@]}"
