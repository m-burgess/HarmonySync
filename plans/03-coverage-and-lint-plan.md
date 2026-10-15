# Coverage and Lint Plan

Goal: every component reaches at least 85% line coverage and is lint-clean. Each PR takes one logical component from its baseline (floor of 10%) to 85%, lints it, and ratchets that component's coverage floor so it can never drop.

## Decisions

- Coverage floors are per component, not global.
- QML is out of scope for now: no `qmllint`/`qmlformat`, no QML coverage. Logic moved out of QML into viewmodels still counts toward their coverage.
- Dependency injection is in scope. Add small interfaces with constructor injection (real implementation in production, fake in tests) in the same PR that needs each seam.
- `web_client` moves from `node --test` to Vitest.
- Coverage counts lines. Branch coverage is reported but not gated.
- Tests must be deterministic: no real audio devices, network, NDI, MIDI hardware, or sleeps.
- Coverage exclusions need a one-line justification.

## Current state

| Area | Language | Size | Existing lint or tests |
|---|---|---|---|
| `src/core` (models, services) | C++20/Qt6 | ~4.4k lines, excluding vendored `qrcodegen` | ~25 ctest executables, compiler warnings only |
| `src/media` | C++ | ~2.5k lines | ctest, no lint |
| `src/viewmodels` (incl. `mobile/`) | C++ | ~2.9k lines | ctest, no lint |
| `src/qml`, `src/mobile/qml` | QML | ~2.2k lines | 3 QML tests (out of scope) |
| `src/web_client` | JS/JSX (Vite/React) | small | `oxlint`, `node --test`, 1 test file |
| `scripts/ai_lyric_sync.py` | Python | 200 lines | tested only indirectly via C++ |
| `*.sh`, `CMakeLists.txt`, `cmake/` | Bash/CMake | small | none |
| `docs/scriptwriter-*/*.js` | JS (examples, templates) | 17 files | none |
| `.github/workflows` | YAML | 3 workflows | CI runs only 5 smoke tests, no coverage |

## Tooling

| Language | Lint and format | Coverage |
|---|---|---|
| C++ | `clang-tidy`, `clang-format` (`compile_commands.json` already exported) | `gcov` + `gcovr --fail-under-line`, via `-DHARMONYSYNC_COVERAGE=ON` |
| JS/JSX (`web_client`) | `oxlint`, Prettier | Vitest + `@vitest/coverage-v8` with thresholds, Testing Library for React |
| JS (docs examples) | `oxlint`, `node --check` | excluded |
| Python | `ruff check`, `ruff format` | `pytest-cov --cov-fail-under` |
| Shell | `shellcheck`, `shfmt` | excluded |
| CMake | `gersemi`, `cmake-lint` | excluded |
| GitHub Actions YAML | `actionlint` | excluded |

Coverage exclusions: `qrcodegen.*`, `tests/`, `main.cpp`, `main_mobile.cpp`, moc and autogen output.

Lint scope grows per PR via a `lint-scope` file listing enforced paths. CI runs `clang-tidy` with `WarningsAsErrors` on those paths and in report-only mode elsewhere, so later PRs can't regress cleaned components.

## PR sequence

| PR | Status | Scope (linted together) | Work and seams | Floor set |
|---|---|---|---|---|
| 0 | [x] (pending CI baseline check) | Infrastructure | `HARMONYSYNC_COVERAGE` CMake option (`cmake/Coverage.cmake`), `tools/quality/` (`run_coverage.sh`, `check_coverage.py`, `components.json`, `run_lint.sh`, `lint-scope.txt`), `.clang-tidy`, `.clang-format`, `.editorconfig`, `quality.yml` workflow (full `ctest` with coverage floors, lint enforce and report), stale-file cleanup (`ErrorLog.txt`, `CMakeLists.txt.orig`, `test_cmake.patch`, `dev_output.txt`). The existing 5-test smoke workflow is kept for fast feedback. | 10% per component (unverified, see notes) |
| 1 | [x] (pending CI) | `core/models` (AppSettings, MediaStem, ServiceOrder, SlideItem, SongMap) | Lint; models are Qt-free value types, so tests cover accessors, clamping, bounds, copy/move. Added `tests/test_check.hpp` (`HS_CHECK`, works under NDEBUG) for new tests. Measured 100% locally | 85% |
| 2 | [ ] | `core/services` data and persistence (Config, SettingsStorage, LocalDatabase, SongLibraryIndex, FolderService, ServiceOrderFolderScanner, Localization, ChordTransposer) | Lint; filesystem and clock seams; temp-dir tests. FolderService (594 lines) is the largest piece | 85% |
| 3 | [ ] | `core/services` network and system (RemoteApiServer, MobileApiClient, CloudSync/Network, AutoUpdate, CrashReporter, OnlineLyricsFetcher, QrCodeImageProvider, AILyricSync, DisplayManager) | Lint; network (HTTP/WebSocket) and process-launcher seams | 85% |
| 4 | [ ] | Python `scripts/` | `ruff`, pytest suite with mocked audio/model calls, CI job. Independent of the C++ track | 85% |
| 5 | [ ] | `media` audio (AudioEngine, StemMixer, Compressor, EQ, PitchShifter, FFmpegDecoder/Transposer, RealtimeHandoff) | Lint; FFmpeg and audio-device seams; synthetic-buffer tests | 85% |
| 6 | [ ] | `media` I/O (Dmx, MidiHardwareDevice, EventTriggerEngine, NdiVideoOutput, VideoBackgroundPlayer) | Lint; NDI, DMX and MIDI device seams | 85% |
| 7 | [ ] | `viewmodels` session, settings, setlist (SetlistViewModel, SettingsViewModel, UserSession, SongSwitchCoordinator) | Lint; tests | 85% |
| 8 | [ ] | `viewmodels` audio (AudioMixer, AudioFx) | Lint; tests | 85% |
| 9 | [ ] | `viewmodels` display (SlideDisplay, PresentationWindow, LowerThird, ConfidenceMonitor, JsonSyntaxHighlighter) | Lint; tests | 85% |
| 10 | [ ] | `viewmodels` MIDI and mobile (MidiMapping, `mobile/Musician*`) | Lint; tests | 85% |
| 11 | [ ] | `web_client` | Vitest + Testing Library, test `transposer`, `App.jsx`, `main.jsx`; Prettier; update `web-client.yml`. Independent of the C++ track | 85% |
| 12 | [ ] | Shell, CMake, workflows, doc scripts | `shellcheck`, `shfmt`, `gersemi`, `actionlint`, `oxlint` on `docs/scriptwriter-*`; merge redundant run scripts (`run_both.sh`, `run_host_and_web.sh`, `dev.sh`, `dev-rebuild.sh`) | n/a |
| 13 | [ ] | Final ratchet | All component floors at 85%, lint failures block merges, `-Werror` by default | 85% |

PRs 4 and 11 can run in parallel with PRs 1-10.

## Notes from PR 0

- Tests use `assert()`, so coverage builds must be `Debug`; `cmake/Coverage.cmake` refuses Release-type builds. The existing smoke workflow builds Release, where `assert()` is compiled out.
- `components.json` fails the build if a measured source file is not assigned to a component, so new files must be added to it.
- The initial 10% floors are placeholders. Baselines have not been measured locally because `qt6-websockets` is missing from this machine. If a component is below 10% in the first CI run, lower its floor to the measured value and raise it again in that component's PR.
- Run locally with `tools/quality/run_coverage.sh` (needs cmake, ninja, gcovr and Qt6 including WebSockets).

## Rules for every PR

- List the paths added to `lint-scope`.
- CI fails if a component's coverage floor drops or a scoped path has lint errors.
- Prefer adding a small seam over excluding hard-to-test code from coverage.
- Update the status checkbox in the table above when the PR merges.
