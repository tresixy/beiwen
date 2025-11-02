import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 羊皮纸风格配色 - 手绘插画风
const TERRAIN_TYPES = {
    region: {
        base: '#b5c99a',
        shadow: '#97a97c',
        highlight: '#cfe1b9',
        border: '#7a8b6c',
    },
    grassland: { 
        base: '#b5c99a', 
        shadow: '#97a97c', 
        highlight: '#cfe1b9',
        border: '#8b7355'
    },
    forest: { 
        base: '#87986a', 
        shadow: '#6d7d52', 
        highlight: '#a4b687',
        border: '#7a6348'
    },
    mountain: { 
        base: '#c4b5a0', 
        shadow: '#a89985', 
        highlight: '#d9cbb7',
        border: '#8b6f47'
    },
    desert: { 
        base: '#e8d8c0', 
        shadow: '#d4c4ac', 
        highlight: '#f4e8d8',
        border: '#9b8878'
    },
    water: { 
        base: '#5a8ca8', 
        shadow: '#4a7890', 
        highlight: '#6aa0b8',
        border: '#3a5868'
    },
    ocean: {
        base: '#2d4a5c',
        shadow: '#1d3a4c',
        highlight: '#3d5a6c',
        border: '#1d2a3c'
    }
};

const REGION_ROWS = [
    // 右上角区域 - 东北三省
    ['heilongjiang', '黑龙江', 'Black Dragon River', '黑龙之河', '东北', false, true, 'NE'],
    ['jilin', '吉林', 'Lucky Forest', '幸运森林', '东北', false, true, 'N'],
    ['liaoning', '辽宁', 'Distant Peace', '遥远和平', '东北', true, true, 'NE'],
    
    // 中上区域 - 华北
    ['beijing', '北京', 'North Capital', '北方之都', '华北', false, false, 'NE'],
    ['tianjin', '天津', 'Heavenly Ford', '天国之渡', '华北', true, false, 'N'],
    ['shanxi', '山西', "Mountain's Shadow", '山之影', '华北', false, false, 'N'],
    ['hezhishouhu', '河之守护', "River's Guardian", '河之卫', '华北', true, false, 'NW'],
    
    // 华东区域
    ['shanghai', '上海', 'Up Sea', '海上明珠', '华东', true, false, 'E'],
    ['shanzhidong', '山之东', "Mountain's Dawn", '山之晨', '华东', true, false, 'NE'],
    ['jiangzhidongxi', '江之东西', 'The Great River', '长江腹地', '华东', true, false, 'E'],
    ['anhui', '安徽', 'Safe Emblem', '安全徽章', '华东', false, false, 'E'],
    ['zhejiang', '浙江', 'Crooked River', '弯曲河流', '华东', true, false, 'SE'],
    ['fujian', '福建', 'Fortune Build', '财富建设', '华东', true, false, 'SE'],
    ['taiwan', '台湾', 'Platform Bay', '高台湾地', '华东', true, false, 'SE'],
    
    // 华中区域
    ['hezhinnanbei', '河之南北', "River's Body", '黄河身躯', '华中', false, false, 'C'],
    ['huzhinnanbei', '湖之南北', 'The Twin Lakes', '神秘湖泊', '华中', false, false, 'C'],
    
    // 西北区域
    ['neimenggu', '内蒙古', 'Inner Mongolia', '蒙古腹地', '华北', false, true, 'NW'],
    ['qinghai', '青海', 'Turquoise Sea', '绿松石海', '西北', false, false, 'N'],
    ['xinjiang', '新疆', 'New Frontier', '新边疆', '西北', false, true, 'W'],
    ['ningxia', '宁夏', 'Quiet Summer', '宁静之夏', '西北', false, false, 'NW'],
    ['gansu', '甘肃', 'Sweet Eradicate', '甜根除', '西北', false, true, 'W'],
    ['shaanxi', '陕西', 'Narrow West', '狭窄西部', '西北', false, false, 'NW'],
    
    // 西南区域
    ['xizang', '西藏', 'Western Depository', '西部宝藏', '西南', false, true, 'W'],
    ['yunnan', '云南', 'The South of Cloud', '云之南', '西南', false, true, 'SW'],
    ['sichuan', '四川', 'Four Circuits of Rivers', '四河洼地', '西南', false, false, 'SW'],
    ['chongqing', '重庆', 'Double Celebration', '双重庆典', '西南', false, false, 'SW'],
    ['guizhou', '贵州', 'Precious Province', '珍贵大陆', '西南', false, false, 'SW'],
    
    // 华南区域
    ['guangkuozhidi', '广阔之地', 'Wide Land', '岭南大地', '华南', true, true, 'S'],
    ['hongkong', '香港', 'Fragrant Harbour', '芳香的港湾', '华南', true, false, 'SE'],
    ['macau', '澳门', 'Bay Gate', '海湾之门', '华南', true, false, 'S'],
    ['hainan', '海南', 'Sea South', '海之南', '华南', true, false, 'S'],
];

const REGION_DEFS = REGION_ROWS.map(([key, name, fantasyName, literalName, zone, coastal, border, direction]) => ({
    key,
    name,
    fantasyName,
    literalName,
    zone,
    coastal,
    border,
    direction,
}));

const ZONE_COLORS = {
    '西北': '#c3ccb0',
    '西南': '#c2d6a4',
    '华南': '#d1dfab',
    '华东': '#d7e1b7',
    '华中': '#cedbb1',
    '华北': '#c3d2af',
    '东北': '#bcd2b8',
};

const DIRECTION_CENTERS = {
    C: { q: 0, r: 0 },
    N: { q: -2, r: -8 },
    NE: { q: 9, r: -8 },
    E: { q: 11, r: 1 },
    SE: { q: 8, r: 8 },
    S: { q: 0, r: 11 },
    SW: { q: -6, r: 9 },
    W: { q: -11, r: 0 },
    NW: { q: -9, r: -5 },
};

const HEX_DIRECTIONS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
];

const MAP_RADIUS = 36;
const CLUSTER_SPACING = 5;
const LAND_RADIUS = 42;

function keyFromHex(hex) {
    return `${hex.q},${hex.r}`;
}

function coordsFromKey(key) {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
}

function hexLength(q, r) {
    const s = -q - r;
    return (Math.abs(q) + Math.abs(r) + Math.abs(s)) / 2;
}

function hexDistance(a, b) {
    return hexLength(a.q - b.q, a.r - b.r);
}

function pseudoNoise(q, r, seed = 0) {
    const value = Math.sin((q * 127.1 + r * 311.7 + seed * 71.7) * 12.9898);
    return value - Math.floor(value);
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash || 1;
}

function createRng(seedValue) {
    let seed = seedValue >>> 0;
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

function generateSpiralOffsets(count) {
    if (count <= 0) {
        return [];
    }
    const result = [{ q: 0, r: 0 }];
    let radius = 1;
    while (result.length < count) {
        let q = -radius;
        let r = radius;
        for (let side = 0; side < 6; side += 1) {
            for (let step = 0; step < radius; step += 1) {
                if (result.length >= count) {
                    break;
                }
                result.push({ q, r });
                q += HEX_DIRECTIONS[side].q;
                r += HEX_DIRECTIONS[side].r;
            }
            if (result.length >= count) {
                break;
            }
        }
        radius += 1;
    }
    return result;
}

function hexToHsl(hex) {
    let cleaned = hex.replace('#', '');
    if (cleaned.length === 3) {
        cleaned = cleaned.split('').map(ch => ch + ch).join('');
    }
    const r = parseInt(cleaned.slice(0, 2), 16) / 255;
    const g = parseInt(cleaned.slice(2, 4), 16) / 255;
    const b = parseInt(cleaned.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
        case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
        case g:
            h = (b - r) / d + 2;
            break;
        case b:
            h = (r - g) / d + 4;
            break;
        default:
            break;
        }
        h /= 6;
    }

    return [h, s, l];
}

function hslToHex(h, s, l) {
    let r; let g; let b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            let tt = t;
            if (tt < 0) tt += 1;
            if (tt > 1) tt -= 1;
            if (tt < 1 / 6) return p + (q - p) * 6 * tt;
            if (tt < 1 / 2) return q;
            if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x) => {
        const hexComponent = Math.round(x * 255).toString(16).padStart(2, '0');
        return hexComponent;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shadeColor(hex, delta) {
    const [h, s, l] = hexToHsl(hex);
    const newL = Math.min(1, Math.max(0, l + delta));
    return hslToHex(h, s, newL);
}

// 羊皮纸底色 - 复古插画风
const getParchmentGradient = () => {
    return { 
        top: '#f9f3e8',
        middle: '#f4e8d8', 
        bottom: '#ede0c8',
        texture: 'rgba(139, 111, 71, 0.03)'
    };
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

function isWithinLandShape(q, r) {
    const { x, y } = axialToIsometric(q, r, 1);
    const dist = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    const angleWave = Math.sin(angle * 3) * 4 + Math.sin(angle * 5 + 1.3) * 3;
    const noise1 = (pseudoNoise(Math.floor(q / 2), Math.floor(r / 2), 3) - 0.5) * 6;
    const noise2 = (pseudoNoise(q * 0.8, r * 0.8, 11) - 0.5) * 4;
    const radius = LAND_RADIUS + angleWave + noise1 + noise2;
    return dist <= radius;
}

export function HexCanvas({ width = 1920, height = 1080, onSelectHex, markers = [], highlightedTiles = [] }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(0.45);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredHex, setHoveredHex] = useState(null);
    const [selectedHex, setSelectedHex] = useState(null);
    const hexMapRef = useRef(new Map());
    const [breathePhase, setBreathePhase] = useState(0);
    const labelBgImgRef = useRef(null);

    const terrainMap = useMemo(() => {
        const map = new Map();
        const claims = new Map();
        const regionCells = new Map();
        const regionLookup = new Map();
        const isWithinLandMask = ({ q, r }) => isWithinLandShape(q, r);

        const ensureWithinLand = (start) => {
            if (isWithinLandShape(start.q, start.r) && hexLength(start.q, start.r) <= MAP_RADIUS) {
                return start;
            }
            const visited = new Set();
            let frontier = [start];
            let steps = 0;
            while (frontier.length && steps < MAP_RADIUS * 2) {
                const next = [];
                for (const hex of frontier) {
                    const key = keyFromHex(hex);
                    if (visited.has(key)) continue;
                    visited.add(key);
                    if (isWithinLandShape(hex.q, hex.r) && hexLength(hex.q, hex.r) <= MAP_RADIUS) {
                        return hex;
                    }
                    for (const dir of HEX_DIRECTIONS) {
                        const neighbor = { q: hex.q + dir.q, r: hex.r + dir.r };
                        if (hexLength(neighbor.q, neighbor.r) > MAP_RADIUS) continue;
                        next.push(neighbor);
                    }
                }
                frontier = next;
                steps += 1;
            }
            return start;
        };

        REGION_DEFS.forEach((region) => {
            regionLookup.set(region.key, region);
            regionCells.set(region.key, new Set());
        });

        const directionCounts = REGION_DEFS.reduce((acc, region) => {
            const dir = DIRECTION_CENTERS[region.direction] ? region.direction : 'C';
            acc[dir] = (acc[dir] || 0) + 1;
            return acc;
        }, {});
        const maxGroupSize = Math.max(...Object.values(directionCounts), 1);
        const spiralOffsets = generateSpiralOffsets(maxGroupSize + 2);
        const directionState = {};
        const regionCenters = new Map();

        REGION_DEFS.forEach((region) => {
            const dir = DIRECTION_CENTERS[region.direction] ? region.direction : 'C';
            const baseCenter = DIRECTION_CENTERS[dir] || DIRECTION_CENTERS.C;
            const state = directionState[dir] ?? { index: 0 };
            directionState[dir] = state;
            const offset = spiralOffsets[state.index] || { q: 0, r: 0 };
            state.index += 1;
            let center = {
                q: baseCenter.q + offset.q * CLUSTER_SPACING,
                r: baseCenter.r + offset.r * CLUSTER_SPACING,
            };
            center = ensureWithinLand(center);
            regionCenters.set(region.key, center);
        });

        const computeRegionSize = (region) => {
            const zoneSizes = {
                '西北': 55,
                '西南': 54,
                '华南': 50,
                '华东': 48,
                '华中': 50,
                '华北': 46,
                '东北': 50,
            };
            let size = zoneSizes[region.zone] ?? 48;
            if (region.coastal) size -= 2;
            if (region.border) size += 6;
            
            // 特定地区大小调整
            if (region.key === 'heilongjiang') size = 56;
            if (region.key === 'neimenggu') size = 62;
            if (region.key === 'xinjiang') size = 65;
            if (region.key === 'xizang') size = 60;
            if (region.key === 'guangkuozhidi') size = 52;
            
            return Math.max(36, Math.round(size));
        };

        const generateRegionTiles = (region, targetSize) => {
            const center = regionCenters.get(region.key);
            if (!center) {
                return;
            }
            const rng = createRng(hashString(region.key));
            const tiles = [];
            const cellSet = regionCells.get(region.key);

            const tryClaim = (hex) => {
                const key = keyFromHex(hex);
                if (!isWithinLandMask(hex)) {
                    return false;
                }
                if (hexLength(hex.q, hex.r) > MAP_RADIUS) {
                    return false;
                }
                if (claims.has(key)) {
                    return false;
                }
                claims.set(key, region.key);
                cellSet?.add(key);
                tiles.push(hex);
                return true;
            };

            tryClaim(center);

            // 使用圆形扩散模式：按距离中心的半径逐层扩展
            let currentRadius = 0;
            const maxRadius = Math.ceil(Math.sqrt(targetSize / Math.PI) * 1.5);
            
            while (tiles.length < targetSize && currentRadius <= maxRadius) {
                // 获取当前半径范围内的所有候选格子
                const candidates = [];
                for (let q = -currentRadius; q <= currentRadius; q++) {
                    for (let r = -currentRadius; r <= currentRadius; r++) {
                        const hex = { q: center.q + q, r: center.r + r };
                        const dist = hexDistance(hex, center);
                        
                        // 只考虑当前半径附近的格子
                        if (dist >= currentRadius - 0.5 && dist <= currentRadius + 0.5) {
                            if (!isWithinLandMask(hex)) {
                                continue;
                            }
                            const key = keyFromHex(hex);
                            if (!claims.has(key) && hexLength(hex.q, hex.r) <= MAP_RADIUS) {
                                candidates.push({ hex, dist });
                            }
                        }
                    }
                }
                
                // 添加轻微随机性，但优先选择距离中心近的
                candidates.sort((a, b) => {
                    const distDiff = a.dist - b.dist;
                    const randomFactor = (rng() - 0.5) * 0.3;
                    return distDiff + randomFactor;
                });
                
                // 尝试占领这一层的格子
                for (const { hex } of candidates) {
                    if (tiles.length >= targetSize) break;
                    tryClaim(hex);
                }
                
                currentRadius += 1;
            }

            // 如果还没达到目标大小，随机填充附近的空缺
            let safety = 0;
            while (tiles.length < targetSize && safety < targetSize * 5) {
                safety += 1;
                const sample = tiles[Math.floor(rng() * tiles.length)] || center;
                const neighbors = HEX_DIRECTIONS.map((dir) => ({
                    q: sample.q + dir.q,
                    r: sample.r + dir.r,
                }));
                
                // 优先选择距离中心近的邻居
                neighbors.sort((a, b) => {
                    const distA = hexDistance(a, center);
                    const distB = hexDistance(b, center);
                    return distA - distB + (rng() - 0.5) * 0.5;
                });
                
                for (const neighbor of neighbors) {
                    if (tiles.length >= targetSize) break;
                    tryClaim(neighbor);
                }
            }
        };

        REGION_DEFS.forEach((region) => {
            const size = computeRegionSize(region);
            generateRegionTiles(region, size);
        });

        const waterClaims = new Set();
        REGION_DEFS.forEach((region) => {
            if (!region.coastal) return;
            const cellSet = regionCells.get(region.key);
            cellSet?.forEach((key) => {
                const { q, r } = coordsFromKey(key);
                HEX_DIRECTIONS.forEach((dir) => {
                    const neighbor = { q: q + dir.q, r: r + dir.r };
                    if (hexLength(neighbor.q, neighbor.r) > MAP_RADIUS) return;
                    const neighborKey = keyFromHex(neighbor);
                    if (!isWithinLandMask(neighbor)) {
                        waterClaims.add(neighborKey);
                        return;
                    }
                    if (!claims.has(neighborKey)) {
                        waterClaims.add(neighborKey);
                    }
                });
            });
        });

        const centerEntries = Array.from(regionCenters.entries());
        for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
            const rMin = Math.max(-MAP_RADIUS, -q - MAP_RADIUS);
            const rMax = Math.min(MAP_RADIUS, -q + MAP_RADIUS);
            for (let r = rMin; r <= rMax; r++) {
                const hex = { q, r };
                if (!isWithinLandMask(hex)) {
                    continue;
                }
                const key = keyFromHex(hex);
                if (waterClaims.has(key)) {
                    continue;
                }
                if (!claims.has(key)) {
                    let nearest = null;
                    for (const [regionKey, center] of centerEntries) {
                        const dist = hexDistance(hex, center);
                        if (!nearest || dist < nearest.dist) {
                            nearest = { regionKey, dist };
                        }
                    }
                    if (nearest) {
                        claims.set(key, nearest.regionKey);
                        regionCells.get(nearest.regionKey)?.add(key);
                    }
                }
            }
        }

        const regionPalette = new Map();
        REGION_DEFS.forEach((region) => {
            let baseColor = ZONE_COLORS[region.zone] ?? '#cbd9b2';
            if (region.coastal) {
                baseColor = shadeColor(baseColor, -0.05);
            }
            if (region.border) {
                baseColor = shadeColor(baseColor, -0.05);
            }
            regionPalette.set(region.key, {
                base: baseColor,
                border: shadeColor(baseColor, -0.18),
            });
        });

        claims.forEach((regionKey, key) => {
            if (waterClaims.has(key)) {
                return;
            }
            const palette = regionPalette.get(regionKey);
            map.set(key, {
                terrain: 'region',
                color: palette?.base,
                border: palette?.border,
                regionKey,
                region: regionLookup.get(regionKey),
            });
        });

        waterClaims.forEach((key) => {
            map.set(key, { terrain: 'water' });
        });

        // 计算每个区域的真实中心坐标（轴坐标）
        const regionAxialCenters = new Map();
        regionCells.forEach((cellSet, regionKey) => {
            let sumQ = 0;
            let sumR = 0;
            let count = 0;
            cellSet.forEach((key) => {
                const { q, r } = coordsFromKey(key);
                sumQ += q;
                sumR += r;
                count += 1;
            });
            if (count > 0) {
                regionAxialCenters.set(regionKey, { q: sumQ / count, r: sumR / count });
            }
        });

        return { map, regionAxialCenters };
    }, []);

    const drawMap = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { map: terrainMapData, regionAxialCenters } = terrainMap;
        
        const baseSize = 112;
        const size = baseSize * scale;
        const hexHeight = size * 2;
        const hexWidth = Math.sqrt(3) * size;

        const cols = Math.ceil(width / (hexWidth * 0.75)) + 8;
        const rows = Math.ceil(height / (hexHeight * 0.75)) + 8;

        const originX = width / 2 + offset.x;
        const originY = height / 3 + offset.y;

        // 黑色背景
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        hexMapRef.current.clear();

        // 手绘地块 - 羊皮纸插画风格
        const drawSketchTile = (px, py, terrainData, isSelected, isHovered) => {
            const palette = TERRAIN_TYPES[terrainData.terrain] || {};
            const fillColor = terrainData.color || palette.base || '#b5c99a';
            const borderColor = terrainData.border || palette.border || shadeColor(fillColor, -0.2);

            ctx.save();
            
            // 菱形顶点（确保无缝连接）
            const tileW = size * 1.5;
            const tileH = size * 0.75;
            const seamFix = 2.0; // 增大重叠值以消除黑色细线
            const basePoints = [
                { x: px, y: py - tileH },      // 上
                { x: px + tileW, y: py },      // 右
                { x: px, y: py + tileH },      // 下
                { x: px - tileW, y: py },      // 左
            ];
            const points = basePoints.map((p) => ({
                x: Math.round(p.x + (p.x > px ? seamFix : p.x < px ? -seamFix : 0)),
                y: Math.round(p.y + (p.y > py ? seamFix : p.y < py ? -seamFix : 0)),
            }));

            // 绘制地块主体 - 更统一的色块
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.closePath();

            // 填充纯色，确保格子间无缝
            ctx.fillStyle = fillColor;
            ctx.fill();

            // 内部纹理标记（简单的点或线）
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = borderColor;
            if (terrainData.terrain === 'forest') {
                // 森林：小点代表树木
                for (let i = 0; i < 3; i++) {
                    const dotX = px + (Math.sin(px + i) * tileW * 0.3);
                    const dotY = py + (Math.cos(py + i) * tileH * 0.3);
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (terrainData.terrain === 'mountain') {
                // 山脉：折线
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px - tileW * 0.3, py);
                ctx.lineTo(px - tileW * 0.1, py - tileH * 0.3);
                ctx.lineTo(px + tileW * 0.1, py - tileH * 0.2);
                ctx.lineTo(px + tileW * 0.3, py);
                ctx.stroke();
            } else if (terrainData.terrain === 'water' || terrainData.terrain === 'ocean') {
                // 水域/海域：波浪线
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px - tileW * 0.4, py);
                ctx.quadraticCurveTo(px - tileW * 0.2, py - 5, px, py);
                ctx.quadraticCurveTo(px + tileW * 0.2, py + 5, px + tileW * 0.4, py);
                ctx.stroke();
                
                // 深海额外标记
                if (terrainData.terrain === 'ocean') {
                    ctx.beginPath();
                    ctx.moveTo(px - tileW * 0.3, py + 8);
                    ctx.quadraticCurveTo(px - tileW * 0.15, py + 3, px, py + 8);
                    ctx.quadraticCurveTo(px + tileW * 0.15, py + 13, px + tileW * 0.3, py + 8);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;

            // 边框只在悬停或选中时显示
            if (isSelected) {
                // 选中：深色边框 + 明显高亮
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.moveTo(basePoints[0].x, basePoints[0].y);
                ctx.lineTo(basePoints[1].x, basePoints[1].y);
                ctx.lineTo(basePoints[2].x, basePoints[2].y);
                ctx.lineTo(basePoints[3].x, basePoints[3].y);
                ctx.closePath();
                ctx.stroke();
                ctx.globalAlpha = 1;
                
                // 外发光效果
                ctx.strokeStyle = '#ff9447';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ff9447';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.moveTo(basePoints[0].x, basePoints[0].y);
                ctx.lineTo(basePoints[1].x, basePoints[1].y);
                ctx.lineTo(basePoints[2].x, basePoints[2].y);
                ctx.lineTo(basePoints[3].x, basePoints[3].y);
                ctx.closePath();
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (isHovered) {
                // 悬停：显示边框 + 柔和高亮
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(basePoints[0].x, basePoints[0].y);
                ctx.lineTo(basePoints[1].x, basePoints[1].y);
                ctx.lineTo(basePoints[2].x, basePoints[2].y);
                ctx.lineTo(basePoints[3].x, basePoints[3].y);
                ctx.closePath();
                ctx.stroke();
                ctx.globalAlpha = 1;
                
                // 外发光效果
                ctx.strokeStyle = '#ffb86c';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#ffb86c';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(basePoints[0].x, basePoints[0].y);
                ctx.lineTo(basePoints[1].x, basePoints[1].y);
                ctx.lineTo(basePoints[2].x, basePoints[2].y);
                ctx.lineTo(basePoints[3].x, basePoints[3].y);
                ctx.closePath();
                ctx.stroke();
                ctx.shadowBlur = 0;
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

                // 视野裁剪（扩大范围确保覆盖整个画布）
                if (px < -size * 5 || px > width + size * 5 || py < -size * 5 || py > height + size * 5) {
                    continue;
                }

                const key = `${q},${r}`;
                const terrainData = terrainMapData.get(key);
                
                // 如果地图外，显示为深海
                const finalTerrain = terrainData 
                    ? terrainData 
                    : { terrain: 'ocean', height: 0 };
                
                hexesToDraw.push({ q, r, px, py, terrainData: finalTerrain });
                hexMapRef.current.set(key, { px, py, q, r });
            }
        }

        // 按Y坐标排序（从上到下绘制）
        hexesToDraw.sort((a, b) => a.py - b.py);

        // 创建高亮地块的Set以便快速查找
        const highlightedSet = new Set(highlightedTiles.map(t => `${t.q},${t.r}`));
        
        for (const hex of hexesToDraw) {
            const isSelected = selectedHex && selectedHex.q === hex.q && selectedHex.r === hex.r;
            const isHovered = hoveredHex && hoveredHex.q === hex.q && hoveredHex.r === hex.r;
            const isHighlighted = highlightedSet.has(`${hex.q},${hex.r}`);
            
            drawSketchTile(hex.px, hex.py, hex.terrainData, isSelected, isHovered);
            
            // 绘制永久高亮效果（呼吸边缘）
            if (isHighlighted) {
                const tileW = size * 1.5;
                const tileH = size * 0.75;
                const points = [
                    { x: hex.px, y: hex.py - tileH },
                    { x: hex.px + tileW, y: hex.py },
                    { x: hex.px, y: hex.py + tileH },
                    { x: hex.px - tileW, y: hex.py },
                ];
                
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.closePath();
                
                // 呼吸效果：alpha从0.3到0.8之间变化
                const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(breathePhase));
                ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.lineWidth = 4 * scale;
                ctx.stroke();
                
                // 内发光效果
                ctx.shadowColor = `rgba(255, 215, 0, ${alpha * 0.5})`;
                ctx.shadowBlur = 12 * scale;
                ctx.stroke();
                ctx.restore();
            }
        }
        
        // 绘制标志（必须在地块之后绘制，按Y轴排序确保遮挡关系正确）
        const markersToRender = markers
            .map(marker => {
                const key = `${marker.q},${marker.r}`;
                const hexPos = hexMapRef.current.get(key);
                if (!hexPos) return null;
                return { ...marker, px: hexPos.px, py: hexPos.py };
            })
            .filter(m => m !== null)
            .sort((a, b) => a.py - b.py); // 按Y坐标排序，上面的先画
        
        for (const marker of markersToRender) {
            if (marker.image_path) {
                // TODO: 加载并绘制标志图片
                // 这里先绘制一个占位符
                const markerSize = size * 0.8;
                ctx.save();
                ctx.fillStyle = 'rgba(255, 100, 50, 0.8)';
                ctx.beginPath();
                ctx.arc(marker.px, marker.py, markerSize * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = `${markerSize * 0.4}px var(--font-game)`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(marker.marker_type.substring(0, 2), marker.px, marker.py);
                ctx.restore();
            }
        }

        // 绘制区域名称标签 - 使用预计算的区域中心
        const fontSize = Math.max(48, Math.min(96, 64 * scale));
        ctx.font = `bold ${fontSize}px var(--font-game)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 12 * scale;

        regionAxialCenters.forEach((axialCenter, regionKey) => {
            const regionDef = REGION_DEFS.find(r => r.key === regionKey);
            if (regionDef) {
                // 将轴坐标转换为屏幕坐标
                const { x, y } = axialToIsometric(axialCenter.q, axialCenter.r, size);
                const centerX = originX + x;
                const centerY = originY + y;
                
                // 只绘制在视野内的标签
                if (centerX >= -100 && centerX <= width + 100 && centerY >= -100 && centerY <= height + 100) {
                    // 组合显示：英文直译 + 英文魔幻翻译
                    const labelText = `${regionDef.literalName} ${regionDef.fantasyName}`;
                    
                    // 绘制地名底板图片
                    if (labelBgImgRef.current) {
                        ctx.save();
                        // 使用图片原始比例
                        const imgWidth = labelBgImgRef.current.width;
                        const imgHeight = labelBgImgRef.current.height;
                        const imgAspectRatio = imgWidth / imgHeight;
                        
                        // 测量文字宽度以确定底板缩放
                        const textMetrics = ctx.measureText(labelText);
                        const textWidth = textMetrics.width;
                        const padding = 80 * scale;
                        const targetWidth = Math.max(textWidth + padding, imgWidth * scale * 0.3);
                        
                        // 根据原始宽高比计算高度
                        const bgWidth = targetWidth;
                        const bgHeight = bgWidth / imgAspectRatio;
                        
                        // 绘制底板
                        ctx.drawImage(
                            labelBgImgRef.current,
                            centerX - bgWidth / 2,
                            centerY - bgHeight / 2,
                            bgWidth,
                            bgHeight
                        );
                        ctx.restore();
                    }
                    
                    // 主文字（深色）
                    ctx.fillStyle = '#2a1810';
                    ctx.fillText(labelText, centerX, centerY);
                }
            }
        });

        ctx.shadowBlur = 0;
    }, [width, height, offset, scale, terrainMap, hoveredHex, selectedHex, markers, highlightedTiles, breathePhase]);

    useEffect(() => {
        drawMap();
    }, [drawMap]);
    
    // 加载地名底板图片
    useEffect(() => {
        const img = new Image();
        img.src = '/assets/UI/地名底板02.webp';
        img.onload = () => {
            labelBgImgRef.current = img;
            drawMap(); // 图片加载完成后重新绘制
        };
    }, [drawMap]);

    // 呼吸动画
    useEffect(() => {
        let animationFrame;
        let startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            setBreathePhase(elapsed * 0.002); // 呼吸周期约3秒
            animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
        
        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, []);

    // 设置高分辨率canvas以解决文字模糊
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // 设置canvas实际像素大小
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        // 设置canvas显示大小
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        
        // 缩放绘图上下文以匹配高分辨率
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
        
        // 重新绘制
        drawMap();
    }, [width, height, drawMap]);

    const wasDraggingRef = useRef(false);
    const mouseDownPosRef = useRef({ x: 0, y: 0 });
    const DRAG_THRESHOLD = 5; // 移动超过5像素才算拖拽

    const handleMouseDown = useCallback((e) => {
        wasDraggingRef.current = false;
        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
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
            // 检查是否真的在拖拽（移动超过阈值）
            const dx = e.clientX - mouseDownPosRef.current.x;
            const dy = e.clientY - mouseDownPosRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > DRAG_THRESHOLD) {
                wasDraggingRef.current = true;
                const newX = e.clientX - dragStart.x;
                const newY = e.clientY - dragStart.y;
                const MAX_OFFSET = 3500; // 增加拖动范围以适应UI布局
                setOffset({
                    x: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, newX)),
                    y: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, newY)),
                });
            }
        } else {
            const originX = width / 2 + offset.x;
            const originY = height / 3 + offset.y;
            const baseSize = 112;
            const hex = isometricToAxial(canvasX - originX, canvasY - originY, baseSize * scale);
            setHoveredHex(hex);
        }
    }, [isDragging, dragStart, width, height, offset, scale]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setScale(prev => {
            const newScale = prev + delta;
            return Math.max(0.2, Math.min(1.5, newScale));
        });
    }, []);

    const handleClick = useCallback((e) => {
        // 如果发生了拖拽（移动超过阈值），不触发选中
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
        const baseSize = 112;
        const hex = isometricToAxial(canvasX - originX, canvasY - originY, baseSize * scale);

        const key = `${hex.q},${hex.r}`;
        if (terrainMap.map.has(key)) {
            setSelectedHex(hex);
            onSelectHex?.(hex);
        }
    }, [width, height, offset, scale, onSelectHex, terrainMap]);

    return (
        <div ref={containerRef} className="lobby-hex-container">
            <canvas
                ref={canvasRef}
                className="lobby-hex-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleClick}
                onWheel={handleWheel}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
        </div>
    );
}
