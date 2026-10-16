# Coverage and Lint Plan

Goal: every component reaches at least 85% line coverage and is lint-clean. Each PR takes one logical component from its baseline (floor of 10%) to 85%, lints it, and ratchets that component's coverage floor so it can never drop.

## Decisions

- Coverage floors are per component, not global.
- QML is out of scope for now: no `qmllint`/`qmlformat`, no QML coverage. Logic moved out of QML into viewmodels still counts toward their coverage.
- Scripts are out of scope: Python (`scripts/`), shell (`*.sh`) and `docs/scriptwriter-*` JS get no lint or coverage work. PR 4 was dropped; PR numbers are not reused.
- Tests cover app logic only, in both the C++ backend and the `web_client` frontend. Do not test Qt, React, FFmpeg or other third-party behavior, rendering, styling, or markup. Thin adapters and bootstrap code with no app logic are excluded from coverage with a one-line justification.
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
| `CMakeLists.txt`, `cmake/` | CMake | small | none |
| `.github/workflows` | YAML | 3 workflows | CI runs only 5 smoke tests, no coverage |

## Tooling

| Language | Lint and format | Coverage |
|---|---|---|
| C++ | `clang-tidy`, `clang-format` (`compile_commands.json` already exported) | `gcov` + `gcovr --fail-under-line`, via `-DHARMONYSYNC_COVERAGE=ON` |
| JS/JSX (`web_client`) | `oxlint`, Prettier | Vitest + `@vitest/coverage-v8` with thresholds, Testing Library for React |
| CMake | `gersemi`, `cmake-lint` | excluded |
| GitHub Actions YAML | `actionlint` | excluded |

Coverage exclusions: `qrcodegen.*`, `tests/`, `main.cpp`, `main_mobile.cpp`, moc and autogen output, and the thin Qt adapters `QtWebSocketTransport.*`, `QtProcessRunner.*`, `QtAudioSink.*` and `QtCommandRunner.*` (no logic; they only forward to QWebSocket/QProcess/QAudioSink).

Lint scope grows per PR via a `lint-scope` file listing enforced paths. CI runs `clang-tidy` with `WarningsAsErrors` on those paths and in report-only mode elsewhere, so later PRs can't regress cleaned components.

## PR sequence

| PR | Status | Scope (linted together) | Work and seams | Floor set |
|---|---|---|---|---|
| 0 | [x] (CI green; pending merge) | Infrastructure | `HARMONYSYNC_COVERAGE` CMake option (`cmake/Coverage.cmake`), `tools/quality/` (`run_coverage.sh`, `check_coverage.py`, `components.json`, `run_lint.sh`, `lint-scope.txt`), `.clang-tidy`, `.clang-format`, `.editorconfig`, `quality.yml` workflow (full `ctest` with coverage floors, lint enforce and report). Stale-file cleanup (`ErrorLog.txt`, `CMakeLists.txt.orig`, `test_cmake.patch`, `dev_output.txt`) was deferred to a separate PR. The existing 5-test smoke workflow is kept for fast feedback. | 10% per component (unverified, see notes) |
| 1 | [x] (CI green; pending merge) | `core/models` (AppSettings, MediaStem, ServiceOrder, SlideItem, SongMap) | Lint; models are Qt-free value types, so tests cover accessors, clamping, bounds, copy/move. Added `tests/test_check.hpp` (`HS_CHECK`, works under NDEBUG) for new tests. Measured 100% locally | 85% |
| 2 | [x] (CI green; pending merge) | `core/services` data and persistence (Config, SettingsStorage, LocalDatabase, SongLibraryIndex, FolderService, ServiceOrderFolderScanner, Localization, ChordTransposer) | Lint; tests run against real temp dirs (`tests/test_temp_dir.hpp`) instead of filesystem/clock seams, which weren't needed. Measured 98% locally with Qt Core only | 85% |
| 3 | [x] (CI green; pending merge) | `core/services` network and system (RemoteApiServer, MobileApiClient, CloudSync/Network, AutoUpdate, CrashReporter, OnlineLyricsFetcher, QrCodeImageProvider, AILyricSync, DisplayManager) | Lint; seams: `IWebSocketServer`/`IWebSocketClient` (`WebSocketTransport.hpp`), `IProcessRunner` (`ProcessRunner.hpp`), `IHttpClient` (in `CloudNetworkService.hpp`), `ScreenSource` (DisplayManager). `RemoteApiServer` and `MobileApiClient` no longer derive from `QObject`. Qt adapters live in `QtWebSocketTransport.cpp` and `QtProcessRunner.cpp` (excluded from coverage: thin QWebSocket/QProcess wrappers that need a real socket or process). `test_mobile_api_client` and `test_ai_lyric_sync` rewritten against fakes and removed from the known-failing list. Measured 98% locally with the Qt adapters stubbed | 85% |
| 5 | [x] (CI green; pending merge) | `media` audio (AudioEngine, StemMixer, Compressor, EQ, PitchShifter, FFmpegDecoder/Transposer, RealtimeHandoff) | Lint; seams: `IAudioSink`/`IPcmSource` (`AudioSink.hpp`), `ICommandRunner` (`CommandRunner.hpp`) plus a transposer task launcher. Qt adapters live in `QtAudioSink.cpp` and `QtCommandRunner.cpp` (excluded from coverage: thin QAudioSink/QProcess wrappers that need a real device or process). `AudioEngine`'s mixer no longer derives from `QIODevice`, so every `HARMONYSYNC_HAS_QT` block in `AudioEngine.cpp` is gone. Tests use synthetic WAVs and a fake sink that pulls on demand. Measured 98% locally (790/804 lines) | 85% |
| 6 | [x] ([#240](https://github.com/m-burgess/HarmonySync/pull/240), CI green; pending merge) | `media` I/O (Dmx, MidiHardwareDevice, EventTriggerEngine, NdiVideoOutput, VideoBackgroundPlayer) | Constructor-injected `IDmxOutput`, `IMidiPort`, `INdiSender`, `IVideoPlayerBackend`; deterministic `test_media_io` plus existing integration tests. Measured 97.9% locally (327/334 lines), initial CI 99.1%, headers and offline backends included | 85% |
| 7 | [x] ([#245](https://github.com/m-burgess/HarmonySync/pull/245), CI green; pending merge) | `viewmodels` session, settings, setlist (SetlistViewModel, SettingsViewModel, UserSession, SongSwitchCoordinator) | Lint paths: `SetlistViewModel`, `SettingsViewModel`, `UserSessionViewModel`, `SongSwitchCoordinator`, plus `AudioMixerViewModel.hpp` for the coordinator dependency. Deterministic tests cover session, settings, setlist and lyric behavior; the existing coordinator suite covers song-switch lifecycle. Injected `AITimestampGenerator` makes progress/success/error testable without the external service. Timed lyric blocks skip section headers while matching timestamps. CI coverage: 558/587 lines (95.1%). | 85% |
| 8 | [ ] | `viewmodels` audio (AudioMixer, AudioFx) | Lint; tests | 85% |
| 9 | [ ] | `viewmodels` display (SlideDisplay, PresentationWindow, LowerThird, ConfidenceMonitor, JsonSyntaxHighlighter) | Lint; tests | 85% |
| 10 | [ ] | `viewmodels` MIDI and mobile (MidiMapping, `mobile/Musician*`) | Lint; tests | 85% |
| 11 | [ ] | `web_client` | Vitest; test app logic only (`transposer`, and the state, data-handling and event logic in `App.jsx`, using Testing Library only where logic is reachable through a component); no markup, styling or snapshot tests; `main.jsx` is bootstrap and excluded from coverage; Prettier; update `web-client.yml`. Independent of the C++ track | 85% |
| 12 | [ ] | CMake, workflows | `gersemi`, `cmake-lint`, `actionlint` | n/a |
| 13 | [ ] | Final ratchet | All component floors at 85%, lint failures block merges, `-Werror` by default | 85% |

PR 11 can run in parallel with PRs 1-10.

## Notes from PR 0

- Tests use `assert()`, so coverage builds must be `Debug`; `cmake/Coverage.cmake` refuses Release-type builds. The existing smoke workflow builds Release, where `assert()` is compiled out.
- `components.json` fails the build if a measured source file is not assigned to a component, so new files must be added to it.
- The initial 10% floors are placeholders. Baselines have not been measured locally because `qt6-websockets` is missing from this machine. If a component is below 10% in the first CI run, lower its floor to the measured value and raise it again in that component's PR.
- CI rejects lowered floors and removed components relative to the PR base branch (`check_coverage.py --base-config`). A reviewed baseline correction needs the `coverage-floor-adjust` PR label.
- Four existing tests fail with `assert()` active and are listed in `tools/quality/known-failing-tests.txt`. They still run for coverage but do not fail the job; each is fixed in the PR for its component.
- Run locally with `tools/quality/run_coverage.sh` (needs cmake, ninja, gcovr and Qt6 including WebSockets).

## Notes from PR 3

- `AuthenticationFailed` is never set: `RemoteApiServer` has no auth handshake, so the client only sends an `auth` message. The old test asserted behavior that never existed.
- `CloudNetworkService`, `CloudSyncEngine`, `AutoUpdateService` and `CrashReporterService` are stubs that return canned results. They are covered as-is; real implementations need their own PR.
- `.clang-tidy` now allows missing move members when copy is deleted (interfaces and non-copyable services).
- `MobileApiClient` callbacks now run outside its mutex, so a callback can call `currentState()`.

## Notes from PR 5

- `IProcessRunner` (PR 3) was not reused for ffmpeg: it is callback-based and its `QProcess` needs an event loop, which the transposer's worker threads don't have. `ICommandRunner` is a small blocking interface that is safe to call from several threads.
- `FFmpegTransposer` now passes ffmpeg its arguments directly instead of building a `std::system` command line, so file names with quotes, `$` or `;` are no longer interpreted by a shell. The worker task no longer captures `this`, so it stays valid if the transposer is destroyed first.
- `AudioEngine` takes an `IAudioSink` (null means no output); the default constructor uses `createQtAudioSink()`. The mixer is plain C++, so the non-Qt `#else` fallbacks (a fixed 180 s duration, no mapping) are removed. `HARMONYSYNC_HAS_QT` is still used by `FFmpegAudioDecoder.cpp`; the media library now needs Qt Multimedia to build, as `harmonysync_core` already needs Qt.
- `FFmpegAudioDecoder::mapAudioFile` maps only the bytes on disk. A truncated WAV used to be mapped past its end, which Qt documents as not portable and which can fault the audio thread.
- `test_audio_engine` now runs against a fake sink. The wall-clock `< 100 ms` assertion and the sleep-based polling are gone; the 50-switch test pulls the sink explicitly to acknowledge each handoff. `test_audio_dsp` was rewritten, and `test_audio_mixing`, `test_audio_effects` and `test_ffmpeg_transposer` are new. `test_audio_dsp_advanced` is untouched: it also covers `AudioFxViewModel` (PR 8).
- Placeholders, covered as-is: `MultiBandEqualizer` multiplies the signal by one gain factor and does no per-band filtering; `AudioPitchShifter` scales samples by the pitch ratio and does not resample; `AudioEngine::setPitchShiftSemitones` stores a value the mixer never reads. Real implementations need their own PR.
- Found, not fixed: `AudioEngine::setStem*` indexes the stem list and the mixer buffers with the same index, but a stem that fails to map is in the list and not in the buffers, so later indices drift; `setStem*` writes stem fields on the control thread while the audio thread reads them; the playback position is converted back to a frame with `position * 44100.0`, which truncates one frame early for about 7% of positions (a repeated frame at buffer boundaries); WAV chunks are not padded to even sizes; a partly written ffmpeg output file counts as cached.

## Notes from PR 6

- Read #238 and #239 before starting; both parents now have green checks. Their media-io 10% placeholder passed, so no baseline reduction or `coverage-floor-adjust` label was needed. Refreshed `origin/main`; `git log HEAD..origin/main` was empty. No rebase or force-push.
- Seams: `IDmxOutput` (`DmxOutput.hpp`), `IMidiPort` (`MidiPort.hpp`), `INdiSender` (`NdiSender.hpp`), `IVideoPlayerBackend` (`VideoPlayerBackend.hpp`). Each service has a constructor taking a `unique_ptr`; null explicitly disables the backend. Existing default constructors retain offline placeholder behavior. The PR 3 socket/process and PR 5 audio/command interfaces do not match these protocols.
- There were no real DMX/MIDI/NDI/video adapters to extract and no RtMidi/NDI SDK dependency. `OfflineMediaBackends.cpp` preserves the existing mock ports, successful mock connection/stream start, and no-op playback/frame delivery. It is measured, not excluded. **No new coverage exclusions**: excluding these placeholders would hide application behavior; future thin Qt/NDI/RtMidi adapters belong in separate files. `run_coverage.sh` records this decision.
- `test_media_io` uses `HS_CHECK` and in-memory fakes: complete ArtDmx header/payload and bounds, delivery failures, cue equality/order/reset/replay, all six MIDI message types, callback reentry, connection failures, NDI lifecycle and RGBA bounds, video load failures and transition mode/duration forwarding, null backends, moves and cleanup. No hardware, sockets, sleeps or media files. Existing `test_midi_hardware`, `test_ndi_broadcast`, `test_automation`, `test_video_compositor` pass unchanged with assertions active; no known-failure entries changed.
- Behavior changes: `DmxController::send` forwards the constructed packet (offline returns false); MIDI reconnect closes the old port and reports open failure; NDI start/stop are idempotent, rejects nonpositive resolutions and drops null/short frames, and releases a running sender on destruction. Failed video loads preserve prior paths; `activeVideoPath` returns a locked copy rather than a reference escaping the mutex. Video transition mode/duration and looping are forwarded to the backend, and destruction stops it.
- All measured source files, including interface headers and `OfflineMediaBackends`, are assigned to media-io; floor 10 -> 85. Added lint prefixes: `src/media/{DmxController,DmxOutput,MidiHardwareDevice,MidiPort,EventTriggerEngine,NdiVideoOutputService,NdiSender,VideoBackgroundPlayer,VideoPlayerBackend,OfflineMediaBackends}`.
- Stack review fixes are separate commits on #240 (no history rewrite): detach retained server-peer callbacks on stop/disconnect; serialize complete server start/stop operations with a lifecycle mutex; honor callback-driven cancellation before opening a client connection. Regression tests cover retained peers after destruction, overlapping start/stop using latches, and cancellation with zero transport opens. Earlier #235 review requests were already addressed; #236 had no outstanding inline comments. A new #239 comment arrived during verification: `QtCommandRunner` now forwards process channels so ffmpeg diagnostics are not swallowed. This one-line adapter fix is the only media-audio change.
- Local verification: GCC `--coverage` + gcovr, 327/334 lines (97.9%) including headers; all seven targeted tests pass in Debug and with ASan/UBSan. clang-format 22 and clang-tidy 22 with `--warnings-as-errors='*'` pass on all touched C++ files. `HS_CHECK` and touched network tests use `'\n'` instead of `std::endl` to satisfy tidy. The temporary clang compilation database omits GCC's unsupported `-mno-direct-extern-access` flag. Network tests use the existing temporary WebSocket factory stubs; media tests use the actual offline backends and injected fakes.
- #240 review caught a callback/disconnect deadlock: discovery no longer takes the lifecycle lock held while draining delivery. `IMidiPort` explicitly requires discovery to be safe concurrently with open/close, without sharing a lock held during callback drain. A threaded fake blocks its handler until close starts, then queries discovery/state; both reconnect and disconnect complete without sleeps. Backend lifecycle changes must be scheduled on the control thread, outside an input handler.
- CI's full build/ctest and floor ratchet passed on Qt 6.8.2, measuring media-io at 330/333 (99.1%). Local Qt is 6.11.2; the full configuration fails because Qt WebSockets and Qt Test imported targets are unavailable. clang-tidy 18 verification runs in CI.
- Flagged, not changed: the default MIDI ports and NDI/video operations remain placeholders; all video transitions complete immediately and replacing a primary video does not change an already-active path; negative transition durations are still stored. Real hardware I/O, playback and timed compositing need a feature PR. QML, viewmodel implementation and the four stale files are untouched.

## Rules for every PR

- List the paths added to `lint-scope`.
- CI fails if a component's coverage floor drops or a scoped path has lint errors.
- Prefer adding a small seam over excluding hard-to-test app logic from coverage.
- Every test asserts app behavior; remove tests that only exercise framework or library code.
- Update the status checkbox in the table above when the PR merges.
