import React from 'react';
import { readTextFile, writeFile } from '@tauri-apps/api/fs';
import { dialog } from '@tauri-apps/api';
import { getSetting, loadSettings, saveSettings } from '../settings.js';

const SettingsExportImport = () => {
  const handleExport = async () => {
    try {
      const settings = await loadSettings();
      const file = await dialog.save({ defaultPath: 'harmonysync-settings.json' });
      if (file) {
        await writeFile({ path: file, contents: JSON.stringify(settings, null, 2) });
        alert('Settings exported.');
      }
    } catch (e) {
      console.error(e);
      alert('Export failed');
    }
  };

  const handleImport = async () => {
    try {
      const file = await dialog.open({ multiple: false });
      if (file) {
        const raw = await readTextFile(String(file));
        const parsed = JSON.parse(raw);
        await saveSettings(parsed);
        alert('Settings imported. Restart app to apply.');
      }
    } catch (e) {
      console.error(e);
      alert('Import failed');
    }
  };

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold mb-2">Settings</h3>
      <div className="flex gap-2">
        <button onClick={handleExport} className="p-2 bg-surface rounded">Export</button>
        <button onClick={handleImport} className="p-2 bg-surface rounded">Import</button>
      </div>
    </div>
  );
};

export default SettingsExportImport;
