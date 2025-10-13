import React from 'react';

const AudienceScreen = ({ slides }) => {
  return (
    <div id="audience-screen" className="w-full h-full bg-black text-white">
      {/* Simple audience view placeholder — renders current slides full-bleed */}
      {slides && slides.length > 0 ? (
        <img src={slides[0].path} alt={slides[0].title || 'Current Slide'} className="w-full h-full object-contain" />
      ) : (
        <div className="flex items-center justify-center h-full">No slides loaded</div>
      )}
    </div>
  );
};

export default AudienceScreen;
