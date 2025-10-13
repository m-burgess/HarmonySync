import React, { useRef, useEffect, useState } from 'react';

const ResizableColumns = ({
  defaultLeft = 300,
  defaultRight = 300,
  onWidthsChange = () => {},
  left, middle, right,
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeft);
  const [rightWidth, setRightWidth] = useState(defaultRight);
  const containerRef = useRef(null);
  const draggingRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    // expose widths upward when they change
    onWidthsChange({ leftWidth, rightWidth });
  }, [leftWidth, rightWidth]);

  useEffect(() => {
    const handleUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  const startDrag = (side, e) => {
    e.preventDefault();
    const startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const startLeft = leftWidth;
    const startRight = rightWidth;
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    draggingRef.current = { side, startX, startLeft, startRight, containerWidth: containerRect.width };
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!draggingRef.current) return;
      const clientX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
      const { side, startX, startLeft, startRight, containerWidth } = draggingRef.current;
      const dx = clientX - startX;
      const minCol = 120;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (side === 'left') {
          let newLeft = Math.max(minCol, startLeft + dx);
          const maxLeft = containerWidth - startRight - minCol;
          if (newLeft > maxLeft) newLeft = maxLeft;
          setLeftWidth(newLeft);
        } else if (side === 'right') {
          let newRight = Math.max(minCol, startRight - dx);
          const maxRight = containerWidth - startLeft - minCol;
          if (newRight > maxRight) newRight = maxRight;
          setRightWidth(newRight);
        }
      });
    };

    const onUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  const resetColumns = () => {
    setLeftWidth(defaultLeft);
    setRightWidth(defaultRight);
  };

  return (
    <div className="container relative" ref={containerRef} style={{ gridTemplateColumns: `${leftWidth}px 1fr ${rightWidth}px` }}>
      <div className="left-col overflow-auto">{left}</div>
      <div className="middle-col overflow-auto">{middle}</div>
      <div className="right-col overflow-auto p-2">{right}</div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={(e) => startDrag('left', e)}
        onDoubleClick={() => resetColumns()}
        className="absolute top-0 bottom-0 w-6 -translate-x-3 bg-transparent hover:bg-gray-600/10 z-20 cursor-col-resize flex items-center justify-center"
        style={{ left: `${leftWidth}px` }}
      >
        <div className="space-y-1">
          <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
          <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
          <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
        </div>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={(e) => startDrag('right', e)}
        onDoubleClick={() => resetColumns()}
        className="absolute top-0 bottom-0 w-6 -translate-x-3 bg-transparent hover:bg-gray-600/10 z-20 cursor-col-resize flex items-center justify-center"
        style={{ left: `calc(100% - ${rightWidth}px)` }}
      >
        <div className="space-y-1">
          <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
          <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
          <span className="block w-6 h-0.5 bg-gray-500 rounded"></span>
        </div>
      </div>
    </div>
  );
};

export default ResizableColumns;
