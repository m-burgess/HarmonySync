#!/usr/bin/env python3
"""Fail if any component's line coverage is below its floor in tools/quality/components.json.

Usage: check_coverage.py SUMMARY_JSON [--config tools/quality/components.json]
SUMMARY_JSON comes from: gcovr --json-summary SUMMARY_JSON ...
"""

import argparse
import json
import os
import sys


def load_files(summary_path):
    with open(summary_path, encoding="utf-8") as fh:
        data = json.load(fh)
    return {f["filename"]: (f["line_covered"], f["line_total"]) for f in data["files"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("summary")
    parser.add_argument("--config", default=os.path.join(os.path.dirname(__file__), "components.json"))
    args = parser.parse_args()

    with open(args.config, encoding="utf-8") as fh:
        components = json.load(fh)["components"]
    files = load_files(args.summary)

    owner = {}
    for comp in components:
        for name in files:
            if any(name.startswith(p) for p in comp["paths"]):
                if name in owner:
                    print(f"ERROR: {name} matches both {owner[name]} and {comp['name']}")
                    return 1
                owner[name] = comp["name"]

    unassigned = sorted(set(files) - set(owner))
    if unassigned:
        print("ERROR: files not assigned to a component in components.json:")
        for name in unassigned:
            print(f"  {name}")
        return 1

    rows = []
    failed = False
    for comp in components:
        covered = sum(files[n][0] for n, c in owner.items() if c == comp["name"])
        total = sum(files[n][1] for n, c in owner.items() if c == comp["name"])
        if total == 0:
            print(f"ERROR: no coverage data for component {comp['name']}")
            failed = True
            continue
        pct = 100.0 * covered / total
        ok = pct >= comp["floor"]
        failed |= not ok
        rows.append((comp["name"], covered, total, pct, comp["floor"], ok))

    lines = ["| Component | Lines | Coverage | Floor | Status |", "|---|---|---|---|---|"]
    for name, covered, total, pct, floor, ok in rows:
        lines.append(f"| {name} | {covered}/{total} | {pct:.1f}% | {floor}% | {'pass' if ok else 'FAIL'} |")
    report = "\n".join(lines)
    print(report)

    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as fh:
            fh.write("## C++ coverage by component\n\n" + report + "\n")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
