import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import './styles/lowerthirds.css';

const LowerThirdsScreen = () => {
  const [line1, setLine1] = useState('Line 1');
  const [line2, setLine2] = useState('Line 2');

  useEffect(() => {
    const unlisten = listen('set-lower-thirds-text', (event) => {
      const { line1, line2 } = event.payload;
      setLine1(line1);
      setLine2(line2);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return (
    <div className="lower-thirds-container">
      <div className="lower-thirds-text">
        <p>{line1}</p>
        <p>{line2}</p>
      </div>
    </div>
  );
};

export default LowerThirdsScreen;