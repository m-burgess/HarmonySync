# Windows Installer Release Checklist

Use this checklist when preparing to build and release a Windows installer for HarmonySync.

## Pre-Build Checklist

### Version and Metadata
- [ ] Update version in `harmonysync/package.json`
- [ ] Update version in `harmonysync/src-tauri/tauri.conf.json`
- [ ] Update version in `harmonysync/src-tauri/Cargo.toml`
- [ ] Update copyright year in `tauri.conf.json` if needed
- [ ] Review and update product descriptions if needed

### Code Quality
- [ ] All tests pass: `npm test` (if applicable)
- [ ] Rust code builds without warnings: `cargo build --release`
- [ ] Frontend builds without errors: `npm run build`
- [ ] Linting passes (if configured)
- [ ] No debug console logs in production code
- [ ] Remove any temporary/debugging code

### Dependencies
- [ ] All npm dependencies up to date (`npm outdated`)
- [ ] All Rust dependencies up to date (`cargo outdated`)
- [ ] Security vulnerabilities checked (`npm audit`, `cargo audit`)
- [ ] Unused dependencies removed

### Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md updated with new version notes
- [ ] API/feature documentation updated
- [ ] Known issues documented
- [ ] Installation instructions verified

## Build Environment Setup

### Local Build
- [ ] Windows 10 or 11 (latest updates)
- [ ] Rust installed (latest stable): `rustc --version`
- [ ] Node.js installed (LTS): `node --version`
- [ ] npm up to date: `npm --version`
- [ ] Visual Studio Build Tools installed
- [ ] FFmpeg in system PATH: `ffmpeg -version`
- [ ] WiX Toolset installed (for MSI): `candle -?`

### Clean Build
- [ ] Delete `node_modules` and run `npm install`
- [ ] Delete `target` directory for clean Rust build
- [ ] Delete `dist` directory for clean frontend build
- [ ] Clear npm cache if needed: `npm cache clean --force`
- [ ] Clear Rust cache if needed: `cargo clean`

## Build Process

### Development Build (Testing)
- [ ] Build in development mode: `npm run tauri dev`
- [ ] Test all major features
- [ ] Test all windows (Audience, Confidence, Lower Thirds)
- [ ] Test audio playback
- [ ] Test video backgrounds
- [ ] Test slide management
- [ ] Check for console errors/warnings

### Production Build
- [ ] Run build script: `.\build-installer.bat` or `.\build-installer.ps1`
- [ ] Or: `npm run tauri build`
- [ ] Build completes without errors
- [ ] Both NSIS and MSI installers created
- [ ] Verify installer file sizes are reasonable

### Build Artifacts
- [ ] NSIS installer exists: `src-tauri/target/release/bundle/nsis/*.exe`
- [ ] MSI installer exists: `src-tauri/target/release/bundle/msi/*.msi`
- [ ] File sizes are within expected range (40-70 MB)
- [ ] Filenames include correct version number

## Testing Checklist

### Pre-Installation Testing
- [ ] Download/locate the installer file
- [ ] Verify file is not corrupted (checksum if available)
- [ ] Scan with antivirus software

### Installation Testing (Clean VM Recommended)
- [ ] Test on Windows 10 (latest)
- [ ] Test on Windows 11 (latest)
- [ ] Install as Administrator (NSIS perMachine)
- [ ] Install as regular user (if perUser mode)
- [ ] Installation completes without errors
- [ ] No unexpected prompts or dialogs
- [ ] Installation location is correct
- [ ] Desktop shortcut created (if configured)
- [ ] Start Menu entry created
- [ ] Program Files folder structure is correct

### Post-Installation Testing
- [ ] Application launches from Desktop shortcut
- [ ] Application launches from Start Menu
- [ ] Main window opens correctly
- [ ] All UI elements render properly
- [ ] Test Audience Screen window
- [ ] Test Confidence Monitor window
- [ ] Test Lower Thirds window
- [ ] Audio playback works
- [ ] Video playback works
- [ ] File import works
- [ ] Settings are saved and loaded
- [ ] Check Add/Remove Programs entry

### Functionality Testing
- [ ] Import a song with multiple tracks
- [ ] Play audio tracks
- [ ] Adjust volume and pan controls
- [ ] Mute/unmute tracks
- [ ] Display slides on Audience Screen
- [ ] Display slides on Confidence Monitor
- [ ] Display lower thirds
- [ ] Import video backgrounds
- [ ] Change display settings
- [ ] Save and load configurations
- [ ] Test all menu items

### Uninstallation Testing
- [ ] Open Add/Remove Programs
- [ ] Find HarmonySync entry
- [ ] Uninstall application
- [ ] Uninstallation completes without errors
- [ ] All files removed from Program Files
- [ ] Desktop shortcut removed
- [ ] Start Menu entries removed
- [ ] Registry entries cleaned up (check with regedit if needed)
- [ ] User data handling (should be preserved or user choice)

### Edge Cases
- [ ] Install over previous version (upgrade)
- [ ] Install with WebView2 not present
- [ ] Install with limited disk space
- [ ] Install to custom directory
- [ ] Install with antivirus active
- [ ] Install on fresh Windows installation
- [ ] Install with non-admin account (perUser mode)

## Code Signing (Optional but Recommended)

### Obtain Certificate
- [ ] Purchase code signing certificate from trusted CA
  - DigiCert
  - Sectigo
  - SSL.com
  - Others
- [ ] Install certificate on build machine
- [ ] Export certificate thumbprint

### Configure Signing
- [ ] Add certificate thumbprint to `tauri.conf.json`
- [ ] Add timestamp URL to `tauri.conf.json`
- [ ] Test signing on development build
- [ ] Verify signature on installed application

### Verify Signed Build
- [ ] Right-click installer → Properties → Digital Signatures
- [ ] Signature is valid
- [ ] Certificate details are correct
- [ ] Timestamp is present
- [ ] No security warnings when running installer

## Distribution Checklist

### Prepare Release Assets
- [ ] Rename installers with clear naming (optional)
  - e.g., `HarmonySync-v0.1.0-Windows-x64-Setup.exe`
- [ ] Generate SHA256 checksums
- [ ] Create installer package (if bundling multiple files)
- [ ] Prepare release notes document

### GitHub Release
- [ ] Create new release on GitHub
- [ ] Use semantic versioning (v0.1.0)
- [ ] Write clear release notes
  - New features
  - Bug fixes
  - Known issues
  - Breaking changes
- [ ] Attach NSIS installer
- [ ] Attach MSI installer
- [ ] Attach checksums file
- [ ] Mark as pre-release if applicable
- [ ] Mark as latest release

### Website/Documentation
- [ ] Update download page with new version
- [ ] Update installation instructions
- [ ] Update system requirements
- [ ] Add release announcement
- [ ] Update screenshots if UI changed
- [ ] Update version number in documentation

### Communication
- [ ] Announce release on project channels
- [ ] Post on social media (if applicable)
- [ ] Notify beta testers
- [ ] Send newsletter (if applicable)
- [ ] Update any external listings

## Post-Release Monitoring

### Initial Hours
- [ ] Monitor download counts
- [ ] Watch for installation issues
- [ ] Check error reports/logs
- [ ] Monitor social media/forums for feedback
- [ ] Respond to immediate bug reports

### First Week
- [ ] Review user feedback
- [ ] Track installation success rate
- [ ] Monitor crash reports
- [ ] Document common issues
- [ ] Prepare hotfix if critical bugs found

### Ongoing
- [ ] Track adoption rate
- [ ] Collect feature requests
- [ ] Plan next release
- [ ] Update roadmap
- [ ] Maintain changelog

## CI/CD Release (GitHub Actions)

### Automated Build
- [ ] Push version tag: `git tag v0.1.0 && git push --tags`
- [ ] GitHub Actions workflow triggers
- [ ] Watch workflow progress
- [ ] Verify artifacts are created
- [ ] Verify draft release is created

### Manual Steps After CI
- [ ] Review GitHub draft release
- [ ] Edit release notes if needed
- [ ] Verify installers are attached
- [ ] Test download installers from release
- [ ] Publish release (remove draft status)

## Hotfix Process

If critical bug found after release:

1. **Immediate Actions**
   - [ ] Document the issue
   - [ ] Assess severity and impact
   - [ ] Decide if hotfix is needed

2. **Hotfix Development**
   - [ ] Create hotfix branch
   - [ ] Fix the issue
   - [ ] Test thoroughly
   - [ ] Increment patch version (e.g., 0.1.0 → 0.1.1)

3. **Hotfix Release**
   - [ ] Follow this checklist for hotfix build
   - [ ] Mark as hotfix in release notes
   - [ ] Communicate urgency to users
   - [ ] Consider deprecating broken release

## Rollback Plan

If release has critical issues:

- [ ] Mark release as broken/deprecated
- [ ] Add warning to download page
- [ ] Provide instructions to revert to previous version
- [ ] Prepare and test hotfix
- [ ] Communicate clearly with users

## Version Archive

After successful release:

- [ ] Archive installers in secure storage
- [ ] Document release environment/tools used
- [ ] Save build logs
- [ ] Tag source code in version control
- [ ] Update version history documentation

## Legal and Compliance

- [ ] License information is correct
- [ ] Third-party licenses are included
- [ ] Privacy policy is up to date
- [ ] Terms of service are current
- [ ] Export compliance checked (if applicable)
- [ ] GDPR compliance verified (if applicable)

## Performance Metrics

Track these metrics for each release:

- [ ] Installer download size
- [ ] Installation time
- [ ] Application startup time
- [ ] Memory usage
- [ ] CPU usage during playback
- [ ] Disk space after installation

---

## Notes Section

Use this space for release-specific notes:

**Release Version**: _____________

**Release Date**: _____________

**Build Machine**: _____________

**Special Considerations**: 
_________________________________________________
_________________________________________________
_________________________________________________

**Known Issues**: 
_________________________________________________
_________________________________________________
_________________________________________________

**Post-Release Actions Needed**: 
_________________________________________________
_________________________________________________
_________________________________________________

---

## Sign-off

- [ ] **Developer**: Build and initial testing complete
- [ ] **QA**: Testing checklist complete
- [ ] **Product Owner**: Release approved
- [ ] **DevOps**: CI/CD configured and working
- [ ] **Support**: Documentation and communication ready

**Date**: _____________
**Released By**: _____________
**Version**: _____________
