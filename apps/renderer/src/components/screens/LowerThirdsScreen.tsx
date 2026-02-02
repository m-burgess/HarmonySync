import { useState, useEffect } from 'react';
import { event } from '../../electron-adapter';
import '../../styles/lowerthirds.css';

const LowerThirdsScreen = () => {
  const [line1, setLine1] = useState('Line 1');
  const [line2, setLine2] = useState('Line 2');

  useEffect(() => {
    const unlisten = event.listen('set-lower-thirds-text', (e: { payload: { line1: string; line2: string } }) => {
      const { line1, line2 } = e.payload;
      setLine1(line1);
      setLine2(line2);
    });

    return unlisten;
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