import { useCallback, useEffect, useRef, useState } from 'react';
import './MapEditor.css';

const TERRAIN_TYPES = {
    ocean: { name: '海洋', base: '#4a90b5', border: '#3a7090' },
    grassland: { name: '草原', base: '#b5c99a', border: '#96a87a' },
    forest: { name: '森林', base: '#6b8e5a', border: '#556e46' },
    mountain: { name: '山脉', base: '#8b7355', border: '#6b5335' },
    desert: { name: '沙漠', base: '#d4b896', border: '#b49876' },
    snow: { name: '雪地', base: '#e8f4f8', border: '#c8d4d8' },
};

// 坐标转换：axial -> 等距投影
function axialToIsometric(q, r, size) {
    const x = size * 1.5 * q;
    const y = size * 0.75 * (2 * r + q);
    return { x, y };
}

// 反转换：屏幕坐标 -> axial
function screenToAxial(screenX, screenY, originX, originY, size) {
    const x = screenX - originX;
    const y = screenY - originY;
    const q = x / (size * 1.5);
    const r = (y - size * 0.75 * q) / (size * 1.5);
    return { q: Math.round(q), r: Math.round(r) };
}

export function MapEditor() {
    const canvasRef = useRef(null);
    const [tiles, setTiles] = useState(new Map());
    const [selectedTerrain, setSelectedTerrain] = useState('grassland');
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(0.5);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredTile, setHoveredTile] = useState(null);

    const width = 1600;
    const height = 900;

    // 绘制地图
    const drawMap = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const baseSize = 112;
        const size = baseSize * scale;
        const originX = width / 2 + offset.x;
        const originY = height / 2 + offset.y;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // 绘制网格参考线
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        for (let r = -10; r <= 10; r++) {
            for (let q = -10; q <= 10; q++) {
                const { x, y } = axialToIsometric(q, r, size);
                const px = originX + x;
                const py = originY + y;

                const tileW = size * 1.5;
                const tileH = size * 0.75;
                
                ctx.beginPath();
                ctx.moveTo(px, py - tileH);
                ctx.lineTo(px + tileW, py);
                ctx.lineTo(px, py + tileH);
                ctx.lineTo(px - tileW, py);
                ctx.closePath();
                ctx.stroke();
            }
        }

        // 绘制已放置的地块
        tiles.forEach((terrain, key) => {
            const [q, r] = key.split(',').map(Number);
            const { x, y } = axialToIsometric(q, r, size);
            const px = originX + x;
            const py = originY + y;

            const tileW = size * 1.5;
            const tileH = size * 0.75;
            const terrainData = TERRAIN_TYPES[terrain];
            const isHovered = hoveredTile === key;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(px, py - tileH);
            ctx.lineTo(px + tileW, py);
            ctx.lineTo(px, py + tileH);
            ctx.lineTo(px - tileW, py);
            ctx.closePath();

            ctx.fillStyle = terrainData.base;
            ctx.fill();

            ctx.strokeStyle = isHovered ? '#ffff00' : terrainData.border;
            ctx.lineWidth = isHovered ? 3 : 2;
            ctx.stroke();

            // 显示坐标
            ctx.fillStyle = '#000';
            ctx.font = `${12 * scale}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${q},${r}`, px, py);
            ctx.restore();
        });
    }, [tiles, offset, scale, hoveredTile, width, height]);

    useEffect(() => {
        drawMap();
    }, [drawMap]);

    const handleCanvasClick = useCallback((event) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        const baseSize = 112;
        const size = baseSize * scale;
        const originX = width / 2 + offset.x;
        const originY = height / 2 + offset.y;

        const { q, r } = screenToAxial(screenX, screenY, originX, originY, size);
        const key = `${q},${r}`;

        setTiles(prev => {
            const newMap = new Map(prev);
            if (newMap.has(key)) {
                newMap.delete(key);
            } else {
                newMap.set(key, selectedTerrain);
            }
            return newMap;
        });
    }, [offset, scale, selectedTerrain, width, height]);

    const handleMouseDown = useCallback((event) => {
        if (event.button === 2) { // 右键拖动
            event.preventDefault();
            setIsDragging(true);
            setDragStart({ x: event.clientX - offset.x, y: event.clientY - offset.y });
        }
    }, [offset]);

    const handleMouseMove = useCallback((event) => {
        if (isDragging) {
            setOffset({
                x: event.clientX - dragStart.x,
                y: event.clientY - dragStart.y,
            });
        }

        // 更新悬停地块
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        const baseSize = 112;
        const size = baseSize * scale;
        const originX = width / 2 + offset.x;
        const originY = height / 2 + offset.y;
        const { q, r } = screenToAxial(screenX, screenY, originX, originY, size);
        const key = `${q},${r}`;
        setHoveredTile(tiles.has(key) ? key : null);
    }, [isDragging, dragStart, tiles, scale, offset, width, height]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleWheel = useCallback((event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.max(0.2, Math.min(2, prev * delta)));
    }, []);

    const handleExport = useCallback(() => {
        const data = {};
        tiles.forEach((terrain, key) => {
            data[key] = { terrain };
        });
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'map-config.json';
        a.click();
        URL.revokeObjectURL(url);
    }, [tiles]);

    const handleImport = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const newMap = new Map();
                Object.entries(data).forEach(([key, value]) => {
                    newMap.set(key, value.terrain);
                });
                setTiles(newMap);
            } catch (err) {
                alert('导入失败: ' + err.message);
            }
        };
        reader.readAsText(file);
    }, []);

    const handleClear = useCallback(() => {
        if (confirm('确定清空所有地块？')) {
            setTiles(new Map());
        }
    }, []);

    return (
        <div className="map-editor">
            <div className="editor-toolbar">
                <h2>地块编辑器</h2>
                <div className="terrain-selector">
                    {Object.entries(TERRAIN_TYPES).map(([key, data]) => (
                        <button
                            key={key}
                            className={`terrain-btn ${selectedTerrain === key ? 'active' : ''}`}
                            style={{ backgroundColor: data.base }}
                            onClick={() => setSelectedTerrain(key)}
                            title={data.name}
                        >
                            {data.name}
                        </button>
                    ))}
                </div>
                <div className="editor-actions">
                    <button onClick={handleExport}>导出配置</button>
                    <label className="import-btn">
                        导入配置
                        <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                    </label>
                    <button onClick={handleClear}>清空</button>
                    <span className="tile-count">地块数: {tiles.size}</span>
                </div>
                <div className="editor-help">
                    <p>左键点击：放置/删除地块 | 右键拖动：移动视图 | 滚轮：缩放</p>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="editor-canvas"
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
            />
        </div>
    );
}

