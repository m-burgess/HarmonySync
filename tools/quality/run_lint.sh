#!/usr/bin/env bash
# Lint C++ sources with clang-tidy and clang-format.
#
# Usage: run_lint.sh enforce|report BUILD_DIR
#   enforce: fail on any finding in paths listed in tools/quality/lint-scope.txt
#   report:  run clang-tidy over all first-party sources, write BUILD_DIR/lint-report.txt, never fail
# BUILD_DIR must contain compile_commands.json (cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON is the default here).
set -euo pipefail

mode="${1:?usage: run_lint.sh enforce|report BUILD_DIR}"
build_dir="${2:?usage: run_lint.sh enforce|report BUILD_DIR}"
root="$(git rev-parse --show-toplevel)"
cd "$root"

# Vendored qrcodegen is excluded everywhere.
mapfile -t all_sources < <(git ls-files 'src/*.cpp' 'src/*.hpp' | grep -v '/qrcodegen\.')

in_scope() {
    local file="$1" prefix
    while IFS= read -r prefix; do
        [[ -z "$prefix" || "$prefix" == \#* ]] && continue
        [[ "$file" == "$prefix"* ]] && return 0
    done <tools/quality/lint-scope.txt
    return 1
}

case "$mode" in
enforce)
    scoped=()
    for f in "${all_sources[@]}"; do
        in_scope "$f" && scoped+=("$f")
    done
    if [[ ${#scoped[@]} -eq 0 ]]; then
        echo "lint-scope.txt is empty; nothing to enforce."
        exit 0
    fi
    status=0
    clang-format --dry-run -Werror "${scoped[@]}" || status=1
    tidy_files=()
    for f in "${scoped[@]}"; do
        [[ "$f" == *.cpp ]] && tidy_files+=("$f")
    done
    if [[ ${#tidy_files[@]} -gt 0 ]]; then
        printf '%s\n' "${tidy_files[@]}" |
            xargs -P "$(nproc)" -n 1 clang-tidy -p "$build_dir" --quiet --warnings-as-errors='*' || status=1
    fi
    exit "$status"
    ;;
report)
    tidy_files=()
    for f in "${all_sources[@]}"; do
        [[ "$f" == *.cpp ]] && tidy_files+=("$f")
    done
    printf '%s\n' "${tidy_files[@]}" |
        xargs -P "$(nproc)" -n 1 clang-tidy -p "$build_dir" --quiet >"$build_dir/lint-report.txt" 2>&1 || true
    echo "Wrote $build_dir/lint-report.txt ($(grep -c 'warning:' "$build_dir/lint-report.txt" || true) warnings)"
    ;;
*)
    echo "unknown mode: $mode" >&2
    exit 2
    ;;
esac
