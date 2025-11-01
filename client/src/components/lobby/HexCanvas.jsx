import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TERRAIN_TYPES = {
    grassland: { 
        base: '#8fbc5a', 
        shadow: '#6a944a', 
        highlight: '#b5d67f',
        side: '#7aa050'
    },
    forest: { 
        base: '#4a7c3a', 
        shadow: '#355a2a', 
        highlight: '#6a9c5a',
        side: '#3d6832'
    },
    mountain: { 
        base: '#9b8878', 
        shadow: '#7a6858', 
        highlight: '#c4b0a0',
        side: '#8a7868'
    },
    desert: { 
        base: '#e8d4a8', 
        shadow: '#d4b888', 
        highlight: '#f8e8c8',
        side: '#dcc898'
    },
    water: { 
        base: '#5fa8d3', 
        shadow: '#4888b3', 
        highlight: '#87ceeb',
        side: '#4f98c3'
    },
};

const getSkyGradient = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 7) {
        return { 
            top: '#ffb088', 
            middle: '#ffd4a8', 
            bottom: '#fff0d8',
            clouds: 'rgba(255, 240, 220, 0.65)'
        };
    } else if (hour >= 7 && hour < 17) {
        return { 
            top: '#87ceeb', 
            middle: '#b8e0f8', 
            bottom: '#e8f4fc',
            clouds: 'rgba(255, 255, 255, 0.75)'
        };
    } else if (hour >= 17 && hour < 19) {
        return { 
            top: '#ff8877', 
            middle: '#ffb088', 
            bottom: '#ffd8a8',
            clouds: 'rgba(255, 220, 200, 0.6)'
        };
    } else if (hour >= 19 && hour < 22) {
        return { 
            top: '#2d3848', 
            middle: '#485868', 
            bottom: '#687888',
            clouds: 'rgba(120, 140, 160, 0.35)'
        };
    } else {
        return { 
            top: '#1a2030', 
            middle: '#2d3848', 
            bottom: '#3d4858',
            clouds: 'rgba(60, 80, 100, 0.3)'
        };
    }
};

// 帝国时代风格 - 45度等距投影
function axialToIsometric(q, r, size) {
    // 45度等距投影，菱形网格
    const x = size * 1.5 * (q - r);
    const y = size * 0.75 * (q + r);
    return { x, y };
}

function isometricToAxial(x, y, size) {
    // 逆投影
    const q = (x / (size * 1.5) + y / (size * 0.75)) / 2;
    const r = (y / (size * 0.75) - x / (size * 1.5)) / 2;
    return axialRound(q, r);
}

function axialRound(q, r) {
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(-q - r);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - (-q - r));
    if (qDiff > rDiff && qDiff > sDiff) {
        rq = -rr - rs;
    } else if (rDiff > sDiff) {
        rr = -rq - rs;
    }
    return { q: rq, r: rr };
}

export function HexCanvas({ width = 1920, height = 1080, onSelectHex }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredHex, setHoveredHex] = useState(null);
    const [selectedHex, setSelectedHex] = useState(null);
    const hexMapRef = useRef(new Map());

    const terrainMap = useMemo(() => {
        const map = new Map();
        const seed = 12345;
        const MAP_RADIUS = 15;
        
        const pseudoRandom = (x, y, s) => {
            const hash = ((x * 374761393) + (y * 668265263) + s) % 2147483647;
            return (hash / 2147483647 + 1) / 2;
        };

        const getTerrainType = (q, r) => {
            const noise = pseudoRandom(q, r, seed);
            const distFromCenter = Math.sqrt(q * q + r * r);
            
            if (distFromCenter < 5) return 'grassland';
            if (noise < 0.2) return 'water';
            if (noise < 0.6) return 'grassland';
            if (noise < 0.75) return 'forest';
            if (noise < 0.85) return 'desert';
            return 'mountain';
        };

        for (let r = -MAP_RADIUS; r <= MAP_RADIUS; r++) {
            for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
                if (Math.abs(q) + Math.abs(r) + Math.abs(-q - r) > MAP_RADIUS * 2) continue;
                const key = `${q},${r}`;
                const terrain = getTerrainType(q, r);
                const height = pseudoRandom(q, r, seed + 1000) * 12 + 2; // 增加高度变化
                map.set(key, { terrain, height });
            }
        }

        return map;
    }, []);

    const drawMap = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const size = 112; // 六边形半径（增大4倍）
        const hexHeight = size * 2;
        const hexWidth = Math.sqrt(3) * size;

        const cols = Math.ceil(width / (hexWidth * 0.75)) + 4;
        const rows = Math.ceil(height / (hexHeight * 0.75)) + 4;

        const originX = width / 2 + offset.x;
        const originY = height / 3 + offset.y;

        const sky = getSkyGradient();
        
        // 天空渐变
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
        skyGradient.addColorStop(0, sky.top);
        skyGradient.addColorStop(0.4, sky.middle);
        skyGradient.addColorStop(1, sky.bottom);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);

        // 云朵效果
        const cloudY = height * 0.15;
        for (let i = 0; i < 4; i++) {
            const cloudX = (i * width / 3) - 50;
            const cloudSize = 70 + i * 10;
            const cloudGradient = ctx.createRadialGradient(
                cloudX, cloudY + i * 20, 0,
                cloudX, cloudY + i * 20, cloudSize
            );
            cloudGradient.addColorStop(0, sky.clouds);
            cloudGradient.addColorStop(0.5, sky.clouds.replace(/[\d.]+\)/, '0.25)'));
            cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = cloudGradient;
            ctx.fillRect(cloudX - cloudSize, cloudY + i * 20 - cloudSize / 2, cloudSize * 2, cloudSize);
        }

        const hour = new Date().getHours();
        if (hour >= 7 && hour < 19) {
            // 太阳 - 卡通风格
            const sunY = height * 0.15 - (Math.abs(hour - 13) / 6) * height * 0.1;
            const sunX = width * 0.75;
            
            // 光晕
            const sunHaloGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 90);
            sunHaloGradient.addColorStop(0, 'rgba(255, 240, 160, 0.4)');
            sunHaloGradient.addColorStop(0.5, 'rgba(255, 220, 120, 0.2)');
            sunHaloGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
            ctx.fillStyle = sunHaloGradient;
            ctx.fillRect(0, 0, width, height);
            
            // 太阳本体 - 带描边
            ctx.fillStyle = '#ffeb99';
            ctx.beginPath();
            ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffcc66';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (hour >= 19 || hour < 5) {
            // 星星 - 闪烁效果
            for (let i = 0; i < 35; i++) {
                const sx = (i * 137.5) % width;
                const sy = (i * 97.3) % (height * 0.5);
                const twinkle = Math.sin(Date.now() / 500 + i) * 0.2 + 0.8;
                ctx.fillStyle = `rgba(255, 255, 240, ${(0.5 + (i % 3) * 0.15) * twinkle})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5 + (i % 3) * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 月亮 - 卡通风格带描边
            const moonX = width * 0.25;
            const moonY = height * 0.2;
            ctx.fillStyle = '#f8f8e8';
            ctx.beginPath();
            ctx.arc(moonX, moonY, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d8d8c8';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // 地平线渐变 - 更柔和
        const horizonGradient = ctx.createLinearGradient(0, height * 0.45, 0, height);
        horizonGradient.addColorStop(0, 'rgba(45, 36, 24, 0)');
        horizonGradient.addColorStop(0.4, 'rgba(45, 36, 24, 0.08)');
        horizonGradient.addColorStop(1, 'rgba(45, 36, 24, 0.18)');
        ctx.fillStyle = horizonGradient;
        ctx.fillRect(0, height * 0.45, width, height * 0.55);

        hexMapRef.current.clear();

        // 帝国时代风格 - 45度等距菱形地块
        const drawAOETile = (px, py, terrainData, isSelected, isHovered) => {
            const terrain = TERRAIN_TYPES[terrainData.terrain];
            const heightOffset = terrainData.height;

            ctx.save();
            
            // 菱形顶点（45度等距投影）
            const tileW = size * 1.4;
            const tileH = size * 0.7;
            const points = [
                { x: px, y: py - tileH },           // 上
                { x: px + tileW, y: py },           // 右
                { x: px, y: py + tileH },           // 下
                { x: px - tileW, y: py },           // 左
            ];

            // 1. 绘制侧面（强烈的高度感）
            const h = heightOffset * 1.2; // 放大高度效果
            if (h > 2) {
                // 左侧面（暗）
                ctx.beginPath();
                ctx.moveTo(points[3].x, points[3].y);
                ctx.lineTo(points[0].x, points[0].y);
                ctx.lineTo(points[0].x, points[0].y + h);
                ctx.lineTo(points[3].x, points[3].y + h);
                ctx.closePath();
                ctx.fillStyle = terrain.shadow;
                ctx.fill();

                // 右侧面（稍亮）
                ctx.beginPath();
                ctx.moveTo(points[1].x, points[1].y);
                ctx.lineTo(points[0].x, points[0].y);
                ctx.lineTo(points[0].x, points[0].y + h);
                ctx.lineTo(points[1].x, points[1].y + h);
                ctx.closePath();
                ctx.fillStyle = terrain.side;
                ctx.fill();

                // 下侧面（最暗，增强立体感）
                ctx.beginPath();
                ctx.moveTo(points[1].x, points[1].y);
                ctx.lineTo(points[2].x, points[2].y);
                ctx.lineTo(points[2].x, points[2].y + h);
                ctx.lineTo(points[1].x, points[1].y + h);
                ctx.closePath();
                const darkGradient = ctx.createLinearGradient(
                    points[1].x, points[1].y,
                    points[2].x, points[2].y + h
                );
                darkGradient.addColorStop(0, terrain.side);
                darkGradient.addColorStop(1, terrain.shadow);
                ctx.fillStyle = darkGradient;
                ctx.fill();
            }

            // 2. 绘制阴影（软阴影，增强地面感）
            if (h > 1) {
                ctx.beginPath();
                const shadowPts = [
                    { x: points[0].x + 8, y: points[0].y + h + 10 },
                    { x: points[1].x + 8, y: points[1].y + h + 10 },
                    { x: points[2].x + 8, y: points[2].y + h + 10 },
                    { x: points[3].x + 8, y: points[3].y + h + 10 },
                ];
                ctx.moveTo(shadowPts[0].x, shadowPts[0].y);
                for (let i = 1; i < 4; i++) {
                    ctx.lineTo(shadowPts[i].x, shadowPts[i].y);
                }
                ctx.closePath();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fill();
            }

            // 3. 绘制顶面（菱形）
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.closePath();

            // 光照渐变（左上亮，右下暗）
            const lightGradient = ctx.createLinearGradient(
                points[3].x, points[0].y,
                points[1].x, points[2].y
            );
            lightGradient.addColorStop(0, terrain.highlight);
            lightGradient.addColorStop(0.4, terrain.base);
            lightGradient.addColorStop(1, terrain.shadow);
            ctx.fillStyle = lightGradient;
            ctx.fill();

            // 边框 - 手绘风格
            ctx.strokeStyle = 'rgba(90, 63, 42, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 4. 选中和悬停效果 - 温暖色调
            if (isSelected) {
                ctx.strokeStyle = '#ffb347';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#ff9447';
                ctx.shadowBlur = 15;
                ctx.stroke();
            } else if (isHovered) {
                ctx.strokeStyle = 'rgba(255, 235, 205, 0.9)';
                ctx.lineWidth = 3;
                ctx.shadowColor = 'rgba(255, 200, 100, 0.6)';
                ctx.shadowBlur = 10;
                ctx.stroke();
            }

            ctx.restore();
        };

        // 文明风格 - 按Y坐标排序绘制
        const hexesToDraw = [];
        for (let r = -rows; r < rows; r++) {
            for (let q = -cols; q < cols; q++) {
                const { x, y } = axialToIsometric(q, r, size);
                const px = originX + x;
                const py = originY + y;

                // 视野裁剪
                if (px < -size * 3 || px > width + size * 3 || py < -size * 3 || py > height + size * 3) {
                    continue;
                }

                const key = `${q},${r}`;
                const terrainData = terrainMap.get(key) || { terrain: 'grassland', height: 0 };
                
                hexesToDraw.push({ q, r, px, py, terrainData });
                hexMapRef.current.set(key, { px, py, q, r });
            }
        }

        // 按Y坐标排序（从上到下绘制）
        hexesToDraw.sort((a, b) => a.py - b.py);

        for (const hex of hexesToDraw) {
            const isSelected = selectedHex && selectedHex.q === hex.q && selectedHex.r === hex.r;
            const isHovered = hoveredHex && hoveredHex.q === hex.q && hoveredHex.r === hex.r;
            drawAOETile(hex.px, hex.py, hex.terrainData, isSelected, isHovered);
        }
    }, [width, height, offset, terrainMap, hoveredHex, selectedHex]);

    useEffect(() => {
        drawMap();
    }, [drawMap]);

    const wasDraggingRef = useRef(false);

    const handleMouseDown = useCallback((e) => {
        wasDraggingRef.current = false;
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }, [offset]);

    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 转换为canvas坐标
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        const canvasX = mouseX * scaleX;
        const canvasY = mouseY * scaleY;

        if (isDragging) {
            wasDraggingRef.current = true;
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            const MAX_OFFSET = 800; // 增加拖动范围以适应更大的块
            setOffset({
                x: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, newX)),
                y: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, newY)),
            });
        } else {
            const originX = width / 2 + offset.x;
            const originY = height / 3 + offset.y;
            const hex = isometricToAxial(canvasX - originX, canvasY - originY, 112);
            setHoveredHex(hex);
        }
    }, [isDragging, dragStart, width, height, offset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleClick = useCallback((e) => {
        if (wasDraggingRef.current) {
            wasDraggingRef.current = false;
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        const canvasX = mouseX * scaleX;
        const canvasY = mouseY * scaleY;

        const originX = width / 2 + offset.x;
        const originY = height / 3 + offset.y;
        const hex = isometricToAxial(canvasX - originX, canvasY - originY, 112);

        const key = `${hex.q},${hex.r}`;
        if (terrainMap.has(key)) {
            setSelectedHex(hex);
            onSelectHex?.(hex);
        }
    }, [width, height, offset, onSelectHex, terrainMap]);

    return (
        <div ref={containerRef} className="lobby-hex-container">
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="lobby-hex-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleClick}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
        </div>
    );
}
