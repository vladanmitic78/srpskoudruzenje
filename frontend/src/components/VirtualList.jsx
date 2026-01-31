import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * VirtualList - Efficiently renders large lists by only rendering visible items
 * @param {array} items - Array of items to render
 * @param {number} itemHeight - Height of each item in pixels
 * @param {function} renderItem - Function to render each item
 * @param {number} overscan - Number of items to render outside visible area
 * @param {string} className - Container className
 */
const VirtualList = ({ 
  items, 
  itemHeight = 60, 
  renderItem, 
  overscan = 5,
  className = '',
  containerHeight = 400
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate which items are visible
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const total = items.length * itemHeight;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    const offset = start * itemHeight;

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: total,
      offsetY: offset
    };
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Visible items slice
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VirtualList;

/**
 * VirtualGrid - Efficiently renders large grids
 */
export const VirtualGrid = ({
  items,
  itemWidth = 200,
  itemHeight = 200,
  renderItem,
  overscan = 2,
  className = '',
  containerHeight = 600,
  gap = 16
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);

  // Measure container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate columns and rows
  const { columns, visibleItems, totalHeight, offsetY } = useMemo(() => {
    const cols = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
    const rows = Math.ceil(items.length / cols);
    const rowHeight = itemHeight + gap;
    const total = rows * rowHeight;

    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRows = Math.ceil(containerHeight / rowHeight);
    const endRow = Math.min(rows, startRow + visibleRows + overscan * 2);

    const startIndex = startRow * cols;
    const endIndex = Math.min(items.length, endRow * cols);
    const offset = startRow * rowHeight;

    return {
      columns: cols,
      visibleItems: items.slice(startIndex, endIndex).map((item, i) => ({
        item,
        index: startIndex + i
      })),
      totalHeight: total,
      offsetY: offset
    };
  }, [items, itemWidth, itemHeight, containerWidth, scrollTop, containerHeight, overscan, gap]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
            gap: `${gap}px`,
            justifyContent: 'center'
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ width: itemWidth, height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
