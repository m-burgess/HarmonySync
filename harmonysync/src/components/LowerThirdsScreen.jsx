import React from 'react';

const LowerThirdsScreen = ({ items }) => {
  return (
    <div id="lower-thirds" className="w-full h-full">
      {items && items.map((it, i) => (
        <div key={i} className="p-2 bg-black/60 text-white">{it.text}</div>
      ))}
    </div>
  );
};

export default LowerThirdsScreen;
