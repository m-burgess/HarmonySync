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
    <div className="lower-thirds-container" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end', // Align to bottom
      alignItems: 'center',
      width: '100vw',
      height: '100vh',
      padding: '5vmin',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <div className="lower-thirds-text" style={{
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '2vmin 4vmin',
        borderRadius: '1vmin',
        width: '80%',   // Limit width
        textAlign: 'center'
      }}>
        {line1 && <p style={{ fontSize: 'min(3vw, 5vh)', margin: '0 0 1vmin 0', color: '#aaa' }}>{line1}</p>}
        {line2 && <p style={{
          fontSize: 'min(5vw, 8vh)',
          margin: 0,
          color: 'white',
          fontWeight: 'bold',
          lineHeight: '1.2',
          whiteSpace: 'pre-wrap' // Preserve newlines
        }}>{line2}</p>}
      </div>
    </div>
  );
};

export default LowerThirdsScreen;