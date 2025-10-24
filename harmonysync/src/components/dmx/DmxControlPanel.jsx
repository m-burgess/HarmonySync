import React, { useState } from 'react';
import DmxFixtureManager from './DmxFixtureManager';
import DmxSceneManager from './DmxSceneManager';
import Card from '../ui/Card';

const DmxControlPanel = () => {
  const [activeTab, setActiveTab] = useState('scenes');

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('scenes')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'scenes'
              ? 'bg-gray-800 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Scenes
        </button>
        <button
          onClick={() => setActiveTab('fixtures')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'fixtures'
              ? 'bg-gray-800 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Fixtures
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'about'
              ? 'bg-gray-800 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          About
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'scenes' && <DmxSceneManager />}
        {activeTab === 'fixtures' && <DmxFixtureManager />}
        {activeTab === 'about' && (
          <div className="p-4">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">DMX Lighting Control</h2>
              <div className="space-y-4">
                <section>
                  <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300">
                    <li>Go to the <strong>Fixtures</strong> tab and add your DMX fixtures</li>
                    <li>Configure each fixture with its DMX address and type</li>
                    <li>Go to the <strong>Scenes</strong> tab and create lighting scenes</li>
                    <li>Set the desired values for each fixture in your scenes</li>
                    <li>Use the <strong>Recall</strong> button to activate a scene</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">Universe Configuration</h3>
                  <p className="text-gray-300">
                    Currently, HarmonySync supports 1 DMX universe (512 channels). 
                    This is sufficient for most church and small venue setups.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">Integration</h3>
                  <p className="text-gray-300 mb-2">
                    DMX scenes can be integrated with other HarmonySync features:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li><strong>Scheduler:</strong> Automatically trigger scenes at specific times</li>
                    <li><strong>Macros:</strong> Link scenes to presentation slides</li>
                    <li><strong>Manual Control:</strong> Use the Recall button for immediate control</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">Hardware Requirements</h3>
                  <p className="text-gray-300 mb-2">
                    To use DMX control, you need:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li>USB DMX interface (e.g., ENTTEC DMX USB PRO)</li>
                    <li>DMX fixtures (LED pars, dimmer packs, etc.)</li>
                    <li>XLR cables to connect fixtures</li>
                  </ul>
                  <p className="text-sm text-gray-400 mt-2">
                    Note: Hardware output support is planned for a future update. 
                    Currently, you can configure fixtures and scenes, and they will be 
                    stored and ready for when hardware support is added.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
                  <p className="text-gray-300">
                    Check out the DMX Quick Start Guide in the documentation folder 
                    for detailed setup instructions and examples.
                  </p>
                </section>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DmxControlPanel;
