
import React from 'react';
import { observer } from 'mobx-react-lite';
import { getViewModel } from '../../viewmodels';

const LoadingModal = observer(() => {
    const serviceOrderViewModel = getViewModel('serviceOrderViewModel');
    const audioViewModel = getViewModel('audioViewModel');

    // Determine if we should show the modal
    // Show if ServiceOrder is loading (preloading or importing) OR Audio is loading (loading tracks)
    const isVisible =
        (serviceOrderViewModel.isLoading || serviceOrderViewModel.preloadingSongs.size > 0) &&
        (serviceOrderViewModel.loadingMessage !== '');

    // Prioritize messages
    const message = serviceOrderViewModel.loadingMessage || (audioViewModel.isLoading ? 'Loading audio...' : '');
    const progress = serviceOrderViewModel.loadingProgress;

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-semibold text-white mb-4">Processing</h3>

                <div className="space-y-4">
                    <p className="text-gray-300">{message}</p>

                    <div className="w-full bg-gray-700 rounded-full h-2.5 dark:bg-gray-700">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-400">
                        <span>{Math.round(progress)}%</span>
                        {serviceOrderViewModel.preloadingSongs.size > 0 && (
                            <span>{serviceOrderViewModel.preloadingSongs.size} remaining</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default LoadingModal;
