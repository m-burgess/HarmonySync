import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import './styles/plugin-manager.css';

export function PluginManager() {
  const [plugins, setPlugins] = useState([]);
  const [midiInputs, setMidiInputs] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [memoryStats, setMemoryStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeManagers();
    loadData();
    const interval = setInterval(updateMemoryStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializeManagers = async () => {
    try {
      await invoke('initialize_carla_managers');
      console.log('Carla managers initialized');
    } catch (error) {
      console.error('Error initializing managers:', error);
      setError(`Failed to initialize: ${error}`);
    }
  };

  const loadData = async () => {
    try {
      await Promise.all([
        loadPlugins(),
        loadMidiDevices(),
        loadAudioDevices(),
        updateMemoryStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Failed to load data: ${error}`);
    }
  };

  const loadPlugins = async () => {
    try {
      const result = await invoke('get_loaded_plugins');
      setPlugins(result);
    } catch (error) {
      console.error('Error loading plugins:', error);
    }
  };

  const loadMidiDevices = async () => {
    try {
      const inputs = await invoke('get_available_midi_inputs');
      setMidiInputs(inputs);
    } catch (error) {
      console.error('Error loading MIDI devices:', error);
    }
  };

  const loadAudioDevices = async () => {
    try {
      const devices = await invoke('get_available_audio_devices');
      setAudioDevices(devices);
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const updateMemoryStats = async () => {
    try {
      const stats = await invoke('get_memory_stats');
      setMemoryStats(stats);
    } catch (error) {
      console.error('Error getting memory stats:', error);
    }
  };

  const handleAddPlugin = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio Plugins',
          extensions: ['vst', 'vst3', 'lv2', 'so', 'dll']
        }]
      });

      if (selected) {
        setIsLoading(true);
        const pluginName = selected.path.split('/').pop();
        await invoke('load_plugin', {
          pluginPath: selected.path,
          name: pluginName
        });
        await loadPlugins();
        setError(null);
      }
    } catch (error) {
      console.error('Error adding plugin:', error);
      setError(`Failed to load plugin: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnloadPlugin = async (pluginId) => {
    try {
      await invoke('unload_plugin', { pluginId });
      await loadPlugins();
      setError(null);
    } catch (error) {
      console.error('Error unloading plugin:', error);
      setError(`Failed to unload plugin: ${error}`);
    }
  };

  const handleMidiRouting = async (pluginId, deviceId, channel) => {
    try {
      await invoke('set_plugin_midi_routing', {
        pluginId,
        deviceId,
        channel: parseInt(channel)
      });
      await loadPlugins();
      setError(null);
    } catch (error) {
      console.error('Error setting MIDI routing:', error);
      setError(`Failed to set MIDI routing: ${error}`);
    }
  };

  const handleAudioRouting = async (pluginId, channelsStr) => {
    try {
      const channels = channelsStr
        .split(',')
        .map(ch => parseInt(ch.trim()) - 1)
        .filter(ch => !isNaN(ch));

      await invoke('set_plugin_audio_routing', {
        pluginId,
        outputChannels: channels
      });
      await loadPlugins();
      setError(null);
    } catch (error) {
      console.error('Error setting audio routing:', error);
      setError(`Failed to set audio routing: ${error}`);
    }
  };

  const getMemoryPercentage = () => {
    if (!memoryStats) return 0;
    return (memoryStats.plugins_used_mb / 8192) * 100;
  };

  const getMemoryColor = () => {
    const percentage = getMemoryPercentage();
    if (percentage < 50) return '#4CAF50';
    if (percentage < 75) return '#FFC107';
    return '#F44336';
  };

  return (
    <div className="plugin-manager">
      <header className="plugin-header">
        <h2>Carla Plugin Manager (Prototype)</h2>
        <button 
          onClick={handleAddPlugin}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Loading...' : '+ Add Plugin'}
        </button>
      </header>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Memory Usage Display */}
      {memoryStats && (
        <div className="memory-panel">
          <h3>Memory Usage</h3>
          <div className="memory-info">
            <div className="memory-bar">
              <div 
                className="memory-used"
                style={{
                  width: `${getMemoryPercentage()}%`,
                  backgroundColor: getMemoryColor()
                }}
              />
            </div>
            <div className="memory-text">
              <span className="memory-current">
                {memoryStats.plugins_used_mb} MB
              </span>
              <span className="memory-total">/ 8192 MB</span>
            </div>
          </div>
          <div className="memory-details">
            <div className="memory-item">
              <span>HarmonySync:</span>
              <strong>{memoryStats.harmonysync_used_mb} MB</strong>
            </div>
            <div className="memory-item">
              <span>Plugins:</span>
              <strong>{memoryStats.plugins_used_mb} MB</strong>
            </div>
            <div className="memory-item">
              <span>Available:</span>
              <strong>{memoryStats.available_mb} MB</strong>
            </div>
          </div>
        </div>
      )}

      {/* Plugin List */}
      <div className="plugin-grid">
        {plugins.length === 0 ? (
          <div className="empty-state">
            <p>No plugins loaded. Click "Add Plugin" to get started.</p>
            <p className="prototype-note">
              ℹ️ This is a prototype. In production, plugins would be loaded via libcarla.
            </p>
          </div>
        ) : (
          plugins.map(plugin => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              midiInputs={midiInputs}
              audioDevices={audioDevices}
              onUnload={handleUnloadPlugin}
              onMidiRouting={handleMidiRouting}
              onAudioRouting={handleAudioRouting}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PluginCard({ 
  plugin, 
  midiInputs, 
  audioDevices, 
  onUnload, 
  onMidiRouting, 
  onAudioRouting 
}) {
  const [midiDevice, setMidiDevice] = useState(plugin.midi_routing?.device_id || '');
  const [midiChannel, setMidiChannel] = useState(plugin.midi_routing?.channel || 1);
  const [audioChannels, setAudioChannels] = useState(
    plugin.audio_routing?.output_channels?.map(ch => ch + 1).join(',') || '1,2'
  );

  const handleMidiDeviceChange = (deviceId) => {
    setMidiDevice(deviceId);
    onMidiRouting(plugin.id, deviceId, midiChannel);
  };

  const handleMidiChannelChange = (channel) => {
    setMidiChannel(channel);
    onMidiRouting(plugin.id, midiDevice, channel);
  };

  const handleAudioChannelsChange = (channels) => {
    setAudioChannels(channels);
    onAudioRouting(plugin.id, channels);
  };

  return (
    <div className="plugin-card">
      <div className="plugin-card-header">
        <h4>{plugin.name}</h4>
        <button 
          className="btn-icon btn-danger"
          onClick={() => onUnload(plugin.id)}
          title="Unload Plugin"
        >
          ×
        </button>
      </div>

      <div className="plugin-card-body">
        <div className="plugin-info">
          <span className="plugin-type">{plugin.plugin_type}</span>
          <span className="plugin-memory">{plugin.memory_usage_mb} MB</span>
        </div>

        {/* MIDI Routing */}
        <div className="routing-section">
          <label className="routing-label">MIDI Input</label>
          <select 
            value={midiDevice}
            onChange={(e) => handleMidiDeviceChange(e.target.value)}
            className="routing-select"
          >
            <option value="">No MIDI Input</option>
            {midiInputs.map(device => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>

          {midiDevice && (
            <div className="midi-channel-selector">
              <label>Channel:</label>
              <select
                value={midiChannel}
                onChange={(e) => handleMidiChannelChange(parseInt(e.target.value))}
                className="channel-select"
              >
                {Array.from({ length: 16 }, (_, i) => i + 1).map(ch => (
                  <option key={ch} value={ch}>Ch {ch}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Audio Routing */}
        <div className="routing-section">
          <label className="routing-label">Audio Output Channels</label>
          <input
            type="text"
            value={audioChannels}
            onChange={(e) => handleAudioChannelsChange(e.target.value)}
            placeholder="e.g., 1,2"
            className="routing-input"
          />
          <small className="routing-hint">
            Comma-separated channel numbers (e.g., 1,2 for stereo)
          </small>
        </div>

        {/* Status Indicator */}
        <div className="plugin-status">
          <span className={`status-dot ${plugin.is_active ? 'active' : 'inactive'}`} />
          <span>{plugin.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>
  );
}

export default PluginManager;
