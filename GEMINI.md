# HarmonySync: project context for Gemini CLI

HarmonySync is a worship and live-event presentation app: multitrack stem playback, lyric sync, audience, confidence and lower-thirds windows, plus a Musician View PWA for the band.

## Stack (the only one we build for)
- **C++20 core** in `src/core` (models, services), `src/media`. CMake 3.20+, strict warnings (`-Wall -Wextra -Wconversion ...`).
- **Qt 6** (CI pins 6.8.2: Core, Gui, Quick, QuickControls2, Multimedia, WebSockets, Test). View models are in `src/viewmodels`, QML is in `src/qml`, and the mobile musician app is in `src/mobile`.
- **Musician View PWA** in `src/web_client` (React 19, Vite, npm, `node --test`, oxlint). There's no root `package.json` or pnpm. Don't add them.
- **Python 3** lyric sync: `scripts/ai_lyric_sync.py`, `scripts/requirements.txt`.
- Go, Rust, Electron and Angular are scrapped leftovers. Don't add code, config or tooling for them. `.agent/skills` and `.github/agents` are legacy personas, and the `.gemini/agents` files take precedence over them.

## Commands
```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug -DCMAKE_PREFIX_PATH="$QT_ROOT_DIR"
cmake --build build -j"$(nproc)"
ctest --test-dir build --output-on-failure            # full suite
ctest --test-dir build -R '^test_models$' --repeat until-fail:50 --output-on-failure  # flake check
# ThreadSanitizer build
cmake -S . -B build-tsan -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_CXX_FLAGS="-fsanitize=thread -g" -DCMAKE_EXE_LINKER_FLAGS="-fsanitize=thread" -DCMAKE_PREFIX_PATH="$QT_ROOT_DIR"
cd src/web_client && npm ci && npm test && npm run lint && npm run build
```
CI: `.github/workflows/e2e-pr-light.yml` (PR smoke: test_audio_engine, test_models, test_audio_dsp, test_qml_stem_mixer_panel) and `.github/workflows/web-client.yml` (npm test on `src/web_client/**`).

## Architecture: Clean Architecture
- Dependencies point inward: QML -> view models/presenters -> use cases/services -> domain models. Domain code in `src/core/models` must not include Qt widget/QML headers.
- QML and widgets hold no domain rules. They forward user events to a view model, and the view model calls the core.
- I/O (files, sockets, Reaper, audio devices) sits behind interfaces in the core, with adapters on the outside. Tests use fakes.
- Persist with `QSaveFile` or write-then-rename so a crash never leaves a half-written `song-map.json`.

## Test-driven development (required)
1. **The first commit is a failing test** that reproduces the bug or specifies the behaviour. Push it.
2. **The second commit is the fix** that makes it pass. Push it.
3. Refactor in more commits, keeping the suite green.
Push after every commit. Never squash away the red commit before review. Tests go in `tests/test_*.cpp` (registered in `tests/CMakeLists.txt`) or `src/web_client` (`node --test`).

## Merge rule (auto-merge, no extra yes needed from the user)
A PR merges when **all** of these are true:
1. CI is green on the PR's **head commit**.
2. QA has posted a pass comment naming that **exact head SHA** (a new push voids the pass).
3. At least one test covers the change.
Then it may be merged (`gh pr merge <n> --squash` or `--merge`, per repo convention, with `--auto` if branch protection is used). Anything else needs the user: pushes to main, CI/workflow changes, posting design notes, closing epics, or items marked "needs the user's listen" (for example audio checks like #188).

## Sprint gates
Don't start new sprint code while a gate is open (red CI on main, an unmerged QA-blocked PR in the same area, or an open user decision). Clear the gates first, then pick up the next sub-issue.

## Team
Role subagents live in `.gemini/agents/`. Call one with `@<name>`, for example `@qa`, `@cpp-lead`. Workflows: `/standup`, `/qa-pass <pr>`, `/merge-check <pr>`, `/plan-sprint <epic>`, `/file-bug <summary>`.
