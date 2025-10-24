import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Button from '../ui/Button';
import Card from '../ui/Card';

const DmxSceneManager = () => {
  const [scenes, setScenes] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [editingScene, setEditingScene] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    fade_time_ms: 3000,
    scene_data: '{}'
  });

  useEffect(() => {
    loadScenes();
    loadFixtures();
  }, []);

  const loadScenes = async () => {
    try {
      const result = await invoke('get_dmx_scenes');
      setScenes(result);
    } catch (error) {
      console.error('Failed to load scenes:', error);
    }
  };

  const loadFixtures = async () => {
    try {
      const result = await invoke('get_dmx_fixtures');
      setFixtures(result);
    } catch (error) {
      console.error('Failed to load fixtures:', error);
    }
  };

  const handleAddScene = () => {
    setIsAddingScene(true);
    setEditingScene(null);
    
    // Initialize scene data with all fixtures set to 0
    const initialSceneData = {};
    fixtures.forEach(fixture => {
      initialSceneData[fixture.id] = {
        name: fixture.name,
        values: Array(fixture.channel_count).fill(0)
      };
    });

    setFormData({
      id: `scene_${Date.now()}`,
      name: '',
      description: '',
      fade_time_ms: 3000,
      scene_data: JSON.stringify(initialSceneData)
    });
  };

  const handleEditScene = (scene) => {
    setEditingScene(scene);
    setIsAddingScene(false);
    setFormData(scene);
  };

  const handleSaveScene = async () => {
    try {
      if (editingScene) {
        await invoke('update_dmx_scene', { scene: formData });
      } else {
        await invoke('create_dmx_scene', { scene: formData });
      }
      setIsAddingScene(false);
      setEditingScene(null);
      await loadScenes();
    } catch (error) {
      console.error('Failed to save scene:', error);
      alert('Failed to save scene: ' + error);
    }
  };

  const handleDeleteScene = async (id) => {
    if (!confirm('Are you sure you want to delete this scene?')) return;
    
    try {
      await invoke('delete_dmx_scene', { id });
      await loadScenes();
    } catch (error) {
      console.error('Failed to delete scene:', error);
      alert('Failed to delete scene: ' + error);
    }
  };

  const handleRecallScene = async (sceneId) => {
    try {
      await invoke('recall_dmx_scene', { sceneId });
      console.log('Scene recalled:', sceneId);
    } catch (error) {
      console.error('Failed to recall scene:', error);
      alert('Failed to recall scene: ' + error);
    }
  };

  const handleCancel = () => {
    setIsAddingScene(false);
    setEditingScene(null);
  };

  const updateFixtureValue = (fixtureId, channelIndex, value) => {
    const sceneData = JSON.parse(formData.scene_data);
    if (!sceneData[fixtureId]) return;
    
    sceneData[fixtureId].values[channelIndex] = parseInt(value);
    setFormData({ ...formData, scene_data: JSON.stringify(sceneData) });
  };

  const renderSceneEditor = () => {
    const sceneData = JSON.parse(formData.scene_data);
    
    return (
      <Card className="mb-4 p-4">
        <h3 className="text-lg font-semibold mb-4">
          {editingScene ? 'Edit Scene' : 'Create New Scene'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Scene Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
              placeholder="e.g., Worship - Blue Purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <input
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
              placeholder="e.g., Blue and purple stage lighting for worship"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fade Time (seconds)</label>
            <input
              type="number"
              value={formData.fade_time_ms / 1000}
              onChange={(e) => setFormData({ ...formData, fade_time_ms: parseInt(e.target.value * 1000) })}
              className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
              min="0"
              max="10"
              step="0.5"
            />
          </div>

          {fixtures.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              No fixtures configured. Add fixtures first before creating scenes.
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-semibold">Fixture Values</h4>
              {fixtures.map((fixture) => (
                <Card key={fixture.id} className="p-3">
                  <h5 className="font-medium mb-2">{fixture.name}</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {Array(fixture.channel_count).fill(0).map((_, idx) => {
                      const channelDefs = JSON.parse(fixture.channel_definitions);
                      const channelName = channelDefs.channels?.[idx]?.name || `CH${idx + 1}`;
                      const currentValue = sceneData[fixture.id]?.values[idx] || 0;
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <label className="text-xs text-gray-400">{channelName}</label>
                          <input
                            type="range"
                            min="0"
                            max="255"
                            value={currentValue}
                            onChange={(e) => updateFixtureValue(fixture.id, idx, e.target.value)}
                            className="w-full"
                          />
                          <div className="text-xs text-center text-gray-400">{currentValue}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button onClick={handleCancel} variant="secondary">Cancel</Button>
            <Button onClick={handleSaveScene} disabled={!formData.name || fixtures.length === 0}>
              Save Scene
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">DMX Scenes</h2>
        <Button onClick={handleAddScene} disabled={fixtures.length === 0}>
          Create Scene
        </Button>
      </div>

      {(isAddingScene || editingScene) && renderSceneEditor()}

      <div className="space-y-2">
        {scenes.length === 0 ? (
          <Card className="p-4 text-center text-gray-400">
            {fixtures.length === 0 
              ? 'Add fixtures first before creating scenes.'
              : 'No scenes configured. Click "Create Scene" to get started.'}
          </Card>
        ) : (
          scenes.map((scene) => (
            <Card key={scene.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{scene.name}</h3>
                  <p className="text-sm text-gray-400">
                    {scene.description || 'No description'} • 
                    Fade: {scene.fade_time_ms / 1000}s
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleRecallScene(scene.id)}>
                    Recall
                  </Button>
                  <Button onClick={() => handleEditScene(scene)} variant="secondary">
                    Edit
                  </Button>
                  <Button onClick={() => handleDeleteScene(scene.id)} variant="danger">
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

export default DmxSceneManager;
