import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Button from '../ui/Button';
import Card from '../ui/Card';

const DmxFixtureManager = () => {
  const [fixtures, setFixtures] = useState([]);
  const [isAddingFixture, setIsAddingFixture] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    fixture_type: 'RGB LED Par (6ch)',
    dmx_address: 1,
    universe: 1,
    channel_count: 6,
    channel_definitions: JSON.stringify({
      channels: [
        { name: 'Red', type: 'color' },
        { name: 'Green', type: 'color' },
        { name: 'Blue', type: 'color' },
        { name: 'Dimmer', type: 'dimmer' },
        { name: 'Strobe', type: 'effect' },
        { name: 'Mode', type: 'mode' }
      ]
    })
  });

  useEffect(() => {
    loadFixtures();
  }, []);

  const loadFixtures = async () => {
    try {
      const result = await invoke('get_dmx_fixtures');
      setFixtures(result);
    } catch (error) {
      console.error('Failed to load fixtures:', error);
    }
  };

  const handleAddFixture = () => {
    setIsAddingFixture(true);
    setEditingFixture(null);
    setFormData({
      id: `fixture_${Date.now()}`,
      name: '',
      fixture_type: 'RGB LED Par (6ch)',
      dmx_address: 1,
      universe: 1,
      channel_count: 6,
      channel_definitions: JSON.stringify({
        channels: [
          { name: 'Red', type: 'color' },
          { name: 'Green', type: 'color' },
          { name: 'Blue', type: 'color' },
          { name: 'Dimmer', type: 'dimmer' },
          { name: 'Strobe', type: 'effect' },
          { name: 'Mode', type: 'mode' }
        ]
      })
    });
  };

  const handleEditFixture = (fixture) => {
    setEditingFixture(fixture);
    setIsAddingFixture(false);
    setFormData(fixture);
  };

  const handleSaveFixture = async () => {
    try {
      if (editingFixture) {
        await invoke('update_dmx_fixture', { fixture: formData });
      } else {
        await invoke('add_dmx_fixture', { fixture: formData });
      }
      setIsAddingFixture(false);
      setEditingFixture(null);
      await loadFixtures();
    } catch (error) {
      console.error('Failed to save fixture:', error);
      alert('Failed to save fixture: ' + error);
    }
  };

  const handleDeleteFixture = async (id) => {
    if (!confirm('Are you sure you want to delete this fixture?')) return;
    
    try {
      await invoke('delete_dmx_fixture', { id });
      await loadFixtures();
    } catch (error) {
      console.error('Failed to delete fixture:', error);
      alert('Failed to delete fixture: ' + error);
    }
  };

  const handleCancel = () => {
    setIsAddingFixture(false);
    setEditingFixture(null);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">DMX Fixtures</h2>
        <Button onClick={handleAddFixture}>Add Fixture</Button>
      </div>

      {(isAddingFixture || editingFixture) && (
        <Card className="mb-4 p-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingFixture ? 'Edit Fixture' : 'Add New Fixture'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Fixture Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                placeholder="e.g., Stage Par 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fixture Type</label>
              <select
                value={formData.fixture_type}
                onChange={(e) => setFormData({ ...formData, fixture_type: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
              >
                <option value="RGB LED Par (6ch)">RGB LED Par (6 channel)</option>
                <option value="RGBW LED Par (8ch)">RGBW LED Par (8 channel)</option>
                <option value="Dimmer (1ch)">Dimmer (1 channel)</option>
                <option value="Dimmer Pack (4ch)">Dimmer Pack (4 channel)</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">DMX Address</label>
                <input
                  type="number"
                  value={formData.dmx_address}
                  onChange={(e) => setFormData({ ...formData, dmx_address: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                  min="1"
                  max="512"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Universe</label>
                <input
                  type="number"
                  value={formData.universe}
                  onChange={(e) => setFormData({ ...formData, universe: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                  min="1"
                  max="1"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Channels</label>
                <input
                  type="number"
                  value={formData.channel_count}
                  onChange={(e) => setFormData({ ...formData, channel_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                  min="1"
                  max="32"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={handleCancel} variant="secondary">Cancel</Button>
              <Button onClick={handleSaveFixture}>Save Fixture</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {fixtures.length === 0 ? (
          <Card className="p-4 text-center text-gray-400">
            No fixtures configured. Click "Add Fixture" to get started.
          </Card>
        ) : (
          fixtures.map((fixture) => (
            <Card key={fixture.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{fixture.name}</h3>
                  <p className="text-sm text-gray-400">
                    {fixture.fixture_type} • Address: {fixture.dmx_address} • 
                    Universe: {fixture.universe} • Channels: {fixture.channel_count}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEditFixture(fixture)} variant="secondary">
                    Edit
                  </Button>
                  <Button onClick={() => handleDeleteFixture(fixture.id)} variant="danger">
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DmxFixtureManager;
