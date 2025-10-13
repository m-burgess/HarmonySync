import React, { useEffect, useState } from 'react';
import * as TauriEvent from '@tauri-apps/api/event';

const ConfidenceMonitor = () => {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const unlisten = TauriEvent.listen('display-confidence-slide', ({ payload }) => {
      setCurrent(payload);
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  return (
    <div id="confidence-monitor" className="p-3 bg-surface rounded">
      <h3 className="text-sm text-muted">Confidence</h3>
      {current ? (
        <div>
          <div>Now: {current.current?.title}</div>
          <div>Next: {current.next?.title}</div>
        </div>
      ) : (
        <div>No data</div>
      )}
    </div>
  );
};

export default ConfidenceMonitor;
