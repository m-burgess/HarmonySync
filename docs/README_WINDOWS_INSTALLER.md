# Windows Installer Documentation Index

This directory contains comprehensive documentation for building, testing, and releasing Windows installers for HarmonySync Presenter.

## Quick Start

**New to building Windows installers?** Start here:
1. 📖 [WINDOWS_INSTALLER_QUICK_REFERENCE.md](WINDOWS_INSTALLER_QUICK_REFERENCE.md) - Quick commands and common issues
2. 📚 [BUILDING_WINDOWS_INSTALLER.md](BUILDING_WINDOWS_INSTALLER.md) - Comprehensive guide
3. 🔄 [WINDOWS_INSTALLER_BUILD_PROCESS.md](WINDOWS_INSTALLER_BUILD_PROCESS.md) - Understanding the build flow

**Ready to release?** Use this:
- ✅ [WINDOWS_INSTALLER_RELEASE_CHECKLIST.md](WINDOWS_INSTALLER_RELEASE_CHECKLIST.md) - Complete release checklist

**Technical details:**
- 📋 [WINDOWS_INSTALLER_IMPLEMENTATION.md](WINDOWS_INSTALLER_IMPLEMENTATION.md) - Implementation summary

## Documentation Overview

### 1. WINDOWS_INSTALLER_QUICK_REFERENCE.md
**Purpose**: Quick reference for developers who need fast answers.

**Contents**:
- Prerequisites checklist
- Quick build commands
- Output locations
- Installer type comparison
- Common issues and solutions
- CI/CD integration snippets

**Best for**: Daily development use, quick lookups

---

### 2. BUILDING_WINDOWS_INSTALLER.md
**Purpose**: Complete guide for building Windows installers from scratch.

**Contents**:
- Detailed prerequisites and installation
- Step-by-step build instructions
- NSIS and MSI configuration options
- Customization (images, licenses, signing)
- Troubleshooting guide
- Distribution guidelines
- Testing procedures

**Best for**: First-time builders, comprehensive understanding

---

### 3. WINDOWS_INSTALLER_BUILD_PROCESS.md
**Purpose**: Technical documentation of the entire build process.

**Contents**:
- Build flow diagrams
- Detailed build steps
- Configuration flow
- Build commands reference
- CI/CD build flow
- Output structure
- Installation flow
- Performance metrics

**Best for**: Understanding internals, debugging build issues

---

### 4. WINDOWS_INSTALLER_IMPLEMENTATION.md
**Purpose**: Summary of what was implemented and why.

**Contents**:
- Overview of changes
- Configuration details
- Build scripts explanation
- Documentation structure
- Usage instructions
- Future enhancements

**Best for**: Understanding the implementation, onboarding new developers

---

### 5. WINDOWS_INSTALLER_RELEASE_CHECKLIST.md
**Purpose**: Comprehensive checklist for production releases.

**Contents**:
- Pre-build checklist
- Build environment setup
- Build process steps
- Testing checklist (installation, functionality, uninstallation)
- Code signing steps
- Distribution checklist
- Post-release monitoring
- CI/CD release process
- Hotfix procedures

**Best for**: Production releases, QA testing, release management

---

## Common Workflows

### First Time Setup
1. Read [BUILDING_WINDOWS_INSTALLER.md](BUILDING_WINDOWS_INSTALLER.md)
2. Install prerequisites from the guide
3. Try a test build using [WINDOWS_INSTALLER_QUICK_REFERENCE.md](WINDOWS_INSTALLER_QUICK_REFERENCE.md)
4. Review [WINDOWS_INSTALLER_BUILD_PROCESS.md](WINDOWS_INSTALLER_BUILD_PROCESS.md) to understand what happened

### Daily Development
1. Use build scripts: `build-installer.bat` or `build-installer.ps1`
2. Refer to [WINDOWS_INSTALLER_QUICK_REFERENCE.md](WINDOWS_INSTALLER_QUICK_REFERENCE.md) for commands
3. Check [BUILDING_WINDOWS_INSTALLER.md](BUILDING_WINDOWS_INSTALLER.md) troubleshooting if issues arise

### Preparing a Release
1. Follow [WINDOWS_INSTALLER_RELEASE_CHECKLIST.md](WINDOWS_INSTALLER_RELEASE_CHECKLIST.md) step by step
2. Test thoroughly on clean Windows VMs
3. Verify installers using the checklist
4. Review [BUILDING_WINDOWS_INSTALLER.md](BUILDING_WINDOWS_INSTALLER.md) distribution section

### Debugging Build Issues
1. Check [WINDOWS_INSTALLER_QUICK_REFERENCE.md](WINDOWS_INSTALLER_QUICK_REFERENCE.md) common issues
2. Review [WINDOWS_INSTALLER_BUILD_PROCESS.md](WINDOWS_INSTALLER_BUILD_PROCESS.md) for build flow
3. Consult [BUILDING_WINDOWS_INSTALLER.md](BUILDING_WINDOWS_INSTALLER.md) troubleshooting section

### Setting Up CI/CD
1. Review the GitHub Actions workflow in `.github/workflows/build-windows-installer.yml`
2. Check [WINDOWS_INSTALLER_QUICK_REFERENCE.md](WINDOWS_INSTALLER_QUICK_REFERENCE.md) CI/CD section
3. Follow [WINDOWS_INSTALLER_BUILD_PROCESS.md](WINDOWS_INSTALLER_BUILD_PROCESS.md) CI/CD flow

## Quick Links

### Configuration Files
- Main config: `harmonysync/src-tauri/tauri.conf.json`
- Package config: `harmonysync/package.json`
- Rust config: `harmonysync/src-tauri/Cargo.toml`

### Build Scripts
- Batch script: `harmonysync/build-installer.bat`
- PowerShell script: `harmonysync/build-installer.ps1`
- GitHub Actions: `.github/workflows/build-windows-installer.yml`

### Build Output
- NSIS installer: `harmonysync/src-tauri/target/release/bundle/nsis/`
- MSI installer: `harmonysync/src-tauri/target/release/bundle/msi/`

## FAQ

**Q: Which installer type should I use?**  
A: For end users, use NSIS (.exe). For enterprise deployment, use MSI. Both are built by default.

**Q: Do I need WiX Toolset?**  
A: Only if you want to build MSI installers. NSIS installers don't require it.

**Q: How do I sign my installers?**  
A: See the "Code Signing" section in [BUILDING_WINDOWS_INSTALLER.md](BUILDING_WINDOWS_INSTALLER.md)

**Q: Can I automate builds?**  
A: Yes! Use the GitHub Actions workflow or run build scripts in CI/CD.

**Q: Where do I report issues?**  
A: Open an issue on GitHub with details about your build environment and error messages.

**Q: How do I update the version number?**  
A: Update in three places: `package.json`, `tauri.conf.json`, and `Cargo.toml`

**Q: What Windows versions are supported?**  
A: Windows 10 (1803+) and Windows 11 are supported.

**Q: Do users need to install WebView2?**  
A: WebView2 is included with Windows 10/11. The installer will install it if needed.

## Getting Help

1. **Documentation**: Read the guides in this directory
2. **Build Scripts**: Run `build-installer.bat` or `build-installer.ps1` for interactive builds
3. **Troubleshooting**: Check common issues in [WINDOWS_INSTALLER_QUICK_REFERENCE.md](WINDOWS_INSTALLER_QUICK_REFERENCE.md)
4. **Community**: Open an issue on GitHub
5. **Official Docs**: 
   - [Tauri Documentation](https://tauri.app/)
   - [NSIS Documentation](https://nsis.sourceforge.io/Docs/)
   - [WiX Toolset Documentation](https://wixtoolset.org/documentation/)

## Contributing

When updating installer configuration or build process:
1. Update the relevant documentation files
2. Test builds on clean Windows environment
3. Update this index if adding new documentation
4. Follow the [WINDOWS_INSTALLER_RELEASE_CHECKLIST.md](WINDOWS_INSTALLER_RELEASE_CHECKLIST.md)

## Version History

- **v0.1.0** (2024-10-14): Initial Windows installer implementation
  - NSIS installer support
  - MSI installer support
  - Build scripts (batch and PowerShell)
  - GitHub Actions integration
  - Comprehensive documentation

---

**Last Updated**: 2024-10-14  
**Tauri Version**: 2.8.x  
**Documentation Status**: Complete
