// ─── Whiteboard Canvas (Konva) ───
// Main drawing surface. Renders all shapes from CRDT state.
// Handles mouse/touch interactions for drawing, selecting, panning.

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Line, Ellipse, Text, Group, Circle, Arrow } from 'react-konva';
import Konva from 'konva';
import { useWhiteboardStore } from '@/store/whiteboardStore';
import {
  addShape,
  updateShape,
  updateCursor,
  updateSelection,
} from '@/lib/collaboration';
import { generateId } from '@shared/index';
import type { Shape, PenShape, RectangleShape, EllipseShape, TextShape, StickyNoteShape, LineShape, ArrowShape } from '@shared/index';
import { CursorsLayer } from '@/components/presence/CursorsLayer';

export function WhiteboardCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const {
    shapes,
    activeTool,
    camera,
    setCamera,
    isDrawing,
    setIsDrawing,
    currentDrawingPoints,
    setCurrentDrawingPoints,
    appendDrawingPoint,
    selectedShapeIds,
    setSelectedShapeIds,
    clearSelection,
    strokeColor,
    fillColor,
    strokeWidth,
    activeLayerId,
    userId,
  } = useWhiteboardStore();

  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  // Resize handler
  useEffect(() => {
    const handler = () => setStageSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Get pointer position in world coordinates
  const getWorldPos = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: (pointer.x - camera.x) / camera.zoom,
      y: (pointer.y - camera.y) / camera.zoom,
    };
  }, [camera]);

  // ─── Mouse Down ───
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getWorldPos(e);
    
    // Update cursor for presence
    updateCursor(pos.x, pos.y);

    // Pan tool
    if (activeTool === 'pan' || e.evt.button === 1) {
      setIsPanning(true);
      const pointer = stageRef.current?.getPointerPosition();
      if (pointer) setPanStart({ x: pointer.x - camera.x, y: pointer.y - camera.y });
      return;
    }

    // Select tool — let Konva handle selection via shape click
    if (activeTool === 'select') {
      // Clicked on empty canvas → clear selection
      if (e.target === e.currentTarget || e.target.name() === 'background') {
        clearSelection();
        updateSelection([]);
      }
      return;
    }

    // Drawing tools
    setIsDrawing(true);
    setDrawStart(pos);

    if (activeTool === 'pen') {
      setCurrentDrawingPoints([pos.x, pos.y]);
    }
  }, [activeTool, camera, getWorldPos]);

  // ─── Mouse Move ───
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getWorldPos(e);
    updateCursor(pos.x, pos.y);

    // Panning
    if (isPanning && panStart) {
      const pointer = stageRef.current?.getPointerPosition();
      if (pointer) {
        setCamera({
          ...camera,
          x: pointer.x - panStart.x,
          y: pointer.y - panStart.y,
        });
      }
      return;
    }

    // Drawing
    if (!isDrawing || !drawStart) return;

    if (activeTool === 'pen') {
      appendDrawingPoint(pos.x, pos.y);
    }
  }, [isDrawing, isPanning, drawStart, panStart, activeTool, camera, getWorldPos]);

  // ─── Mouse Up ───
  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (!isDrawing || !drawStart) return;
    setIsDrawing(false);

    const pos = getWorldPos(e);
    const now = Date.now();

    const baseShape = {
      id: generateId(),
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      width: Math.abs(pos.x - drawStart.x),
      height: Math.abs(pos.y - drawStart.y),
      rotation: 0,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth,
      opacity: 1,
      layerId: activeLayerId,
      locked: false,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    switch (activeTool) {
      case 'pen': {
        const pts = currentDrawingPoints;
        if (pts.length < 4) break;
        addShape({
          ...baseShape,
          type: 'pen',
          points: pts,
          roughness: 0,
        } as PenShape);
        break;
      }
      case 'line': {
        addShape({
          ...baseShape,
          type: 'line',
          x: drawStart.x,
          y: drawStart.y,
          width: 0,
          height: 0,
          points: [drawStart.x, drawStart.y, pos.x, pos.y],
        } as LineShape);
        break;
      }
      case 'rectangle': {
        if (baseShape.width < 2 && baseShape.height < 2) break;
        addShape({
          ...baseShape,
          type: 'rectangle',
          borderRadius: 0,
          roughness: 0,
        } as RectangleShape);
        break;
      }
      case 'ellipse': {
        if (baseShape.width < 2 && baseShape.height < 2) break;
        addShape({
          ...baseShape,
          type: 'ellipse',
          roughness: 0,
        } as EllipseShape);
        break;
      }
      case 'text': {
        addShape({
          ...baseShape,
          type: 'text',
          text: 'Double-click to edit',
          fontSize: 16,
          fontFamily: 'Inter',
          textAlign: 'left',
          width: Math.max(baseShape.width, 150),
          height: Math.max(baseShape.height, 30),
        } as TextShape);
        break;
      }
      case 'sticky-note': {
        addShape({
          ...baseShape,
          type: 'sticky-note',
          text: '',
          fontSize: 14,
          noteColor: '#f9e2af',
          width: Math.max(baseShape.width, 200),
          height: Math.max(baseShape.height, 200),
          fill: '#f9e2af',
        } as StickyNoteShape);
        break;
      }
      case 'arrow': {
        addShape({
          ...baseShape,
          type: 'arrow',
          x: drawStart.x,
          y: drawStart.y,
          width: 0,
          height: 0,
          points: [drawStart.x, drawStart.y, pos.x, pos.y],
        } as ArrowShape);
        break;
      }
    }

    setCurrentDrawingPoints([]);
    setDrawStart(null);
  }, [isDrawing, drawStart, activeTool, currentDrawingPoints, strokeColor, fillColor, strokeWidth, activeLayerId, userId, getWorldPos]);

  // ─── Wheel (Zoom) ───
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const oldZoom = camera.zoom;
    const newZoom = e.evt.deltaY < 0
      ? Math.min(oldZoom * scaleBy, 5)
      : Math.max(oldZoom / scaleBy, 0.1);

    const mousePointTo = {
      x: (pointer.x - camera.x) / oldZoom,
      y: (pointer.y - camera.y) / oldZoom,
    };

    setCamera({
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
      zoom: newZoom,
    });
  }, [camera]);

  // ─── Shape Click (Selection) ───
  const handleShapeClick = useCallback((shapeId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'select') return;
    e.cancelBubble = true;

    if (e.evt.shiftKey) {
      // Multi-select
      const ids = selectedShapeIds.includes(shapeId)
        ? selectedShapeIds.filter((id: string) => id !== shapeId)
        : [...selectedShapeIds, shapeId];
      setSelectedShapeIds(ids);
      updateSelection(ids);
    } else {
      setSelectedShapeIds([shapeId]);
      updateSelection([shapeId]);
    }
  }, [activeTool, selectedShapeIds]);

  // ─── Render Shape ───
  const renderShape = useCallback((shape: Shape) => {
    const isSelected = selectedShapeIds.includes(shape.id);
    const commonProps = {
      key: shape.id,
      opacity: shape.opacity,
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleShapeClick(shape.id, e),
    };

    switch (shape.type) {
      case 'pen':
        return (
          <Line
            {...commonProps}
            points={shape.points}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={10}
          />
        );
      case 'line':
        return (
          <Line
            {...commonProps}
            points={shape.points}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            lineCap="round"
            hitStrokeWidth={10}
          />
        );
      case 'rectangle':
        return (
          <Rect
            {...commonProps}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={shape.fill === 'transparent' ? undefined : shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            cornerRadius={shape.borderRadius}
            rotation={shape.rotation}
            dash={isSelected ? [6, 3] : undefined}
            shadowEnabled={isSelected}
            shadowColor="#89b4fa"
            shadowBlur={8}
            shadowOpacity={0.4}
          />
        );
      case 'ellipse':
        return (
          <Ellipse
            {...commonProps}
            x={shape.x + shape.width / 2}
            y={shape.y + shape.height / 2}
            radiusX={shape.width / 2}
            radiusY={shape.height / 2}
            fill={shape.fill === 'transparent' ? undefined : shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            rotation={shape.rotation}
          />
        );
      case 'text':
        return (
          <Text
            {...commonProps}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            text={shape.text}
            fontSize={shape.fontSize}
            fontFamily={shape.fontFamily}
            fill={shape.stroke}
            align={shape.textAlign}
          />
        );
      case 'sticky-note':
        return (
          <Group {...commonProps} x={shape.x} y={shape.y}>
            <Rect
              width={shape.width}
              height={shape.height}
              fill={shape.noteColor}
              cornerRadius={4}
              shadowEnabled
              shadowColor="rgba(0,0,0,0.3)"
              shadowBlur={8}
              shadowOffset={{ x: 2, y: 2 }}
            />
            <Text
              x={8}
              y={8}
              width={shape.width - 16}
              height={shape.height - 16}
              text={shape.text || 'Click to edit...'}
              fontSize={shape.fontSize}
              fontFamily="Inter"
              fill="#1e1e2e"
              wrap="word"
            />
          </Group>
        );
      case 'arrow':
        return (
          <Arrow
            {...commonProps}
            points={shape.points}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            fill={shape.stroke}
            pointerLength={10}
            pointerWidth={10}
            hitStrokeWidth={10}
          />
        );
      default:
        return null;
    }
  }, [selectedShapeIds, handleShapeClick]);

  // ─── Drawing Preview (current operation) ───
  const renderDrawingPreview = () => {
    if (!isDrawing || !drawStart) return null;

    if (activeTool === 'pen' && currentDrawingPoints.length >= 4) {
      return (
        <Line
          points={currentDrawingPoints}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    }

    return null;
  };

  return (
    <Stage
      ref={stageRef}
      width={stageSize.width}
      height={stageSize.height}
      scaleX={camera.zoom}
      scaleY={camera.zoom}
      x={camera.x}
      y={camera.y}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{
        cursor: activeTool === 'pan' || isPanning ? 'grab' : 
               activeTool === 'select' ? 'default' : 'crosshair',
        background: '#1e1e2e',
      }}
    >
      <Layer>
        {/* Background grid */}
        <Rect
          name="background"
          x={-10000}
          y={-10000}
          width={20000}
          height={20000}
          fill="#1e1e2e"
          listening={true}
        />

        {/* Grid dots */}
        {renderGrid(camera)}

        {/* Shapes from CRDT */}
        {shapes.map(renderShape)}

        {/* Drawing preview */}
        {renderDrawingPreview()}
      </Layer>

      {/* Remote cursors layer (separate from shapes) */}
      <CursorsLayer />
    </Stage>
  );
}

// Grid rendering helper
function renderGrid(camera: { x: number; y: number; zoom: number }) {
  const gridSize = 40;
  const dots: React.ReactNode[] = [];
  const startX = Math.floor(-camera.x / camera.zoom / gridSize) * gridSize - gridSize;
  const startY = Math.floor(-camera.y / camera.zoom / gridSize) * gridSize - gridSize;
  const endX = startX + (window.innerWidth / camera.zoom) + gridSize * 2;
  const endY = startY + (window.innerHeight / camera.zoom) + gridSize * 2;

  for (let x = startX; x < endX; x += gridSize) {
    for (let y = startY; y < endY; y += gridSize) {
      dots.push(
        <Circle
          key={`grid-${x}-${y}`}
          x={x}
          y={y}
          radius={1}
          fill="#313244"
          listening={false}
        />
      );
    }
  }
  return <>{dots}</>;
}
