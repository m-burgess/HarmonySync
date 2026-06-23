# -*- mode: python ; coding: utf-8 -*-


from PyInstaller.utils.hooks import collect_data_files, collect_submodules

demucs_datas = collect_data_files('demucs')
whisper_datas = collect_data_files('whisper')
madmom_datas = collect_data_files('madmom')
hidden_imports = ['librosa', 'stable_whisper', 'whisper'] + collect_submodules('demucs') + collect_submodules('madmom')

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=demucs_datas + whisper_datas + madmom_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='python-song-processor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='python-song-processor',
)
