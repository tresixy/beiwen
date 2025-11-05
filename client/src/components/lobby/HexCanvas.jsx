import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 浅色地形配色
const TERRAIN_TYPES = {
    region: {
        base: '#d4e5c4',
        shadow: '#b5c99a',
        highlight: '#e8f4d8',
        border: '#97a97c',
    },
    grassland: { 
        base: '#b8d480', 
        shadow: '#9dba65', 
        highlight: '#d0e8a0',
        border: '#7d9a45'
    },
    forest: { 
        base: '#5a8a6a', 
        shadow: '#4a7a5a', 
        highlight: '#6a9a7a',
        border: '#3a6a4a'
    },
    mountain: { 
        base: '#b8a898', 
        shadow: '#9d8d7d', 
        highlight: '#d3c3b3',
        border: '#7d6d5d'
    },
    desert: { 
        base: '#f0dca8', 
        shadow: '#ddc078', 
        highlight: '#fff0c8',
        border: '#c8a858'
    },
    water: { 
        base: '#7aaccc', 
        shadow: '#5a8cb8', 
        highlight: '#9accec',
        border: '#4a7ca8'
    },
    ocean: {
        base: '#5a8fb8',
        shadow: '#4a7ca8',
        highlight: '#7aafcc',
        border: '#3a6a98'
    },
    snow: {
        base: '#f8fcff',
        shadow: '#e8f4ff',
        highlight: '#ffffff',
        border: '#d8ecf7'
    }
};

const REGION_ROWS = [
    // 东北地区（3个）- 右上角
    ['heilongjiang', 'Black Dragon River', '黑龙之河', '东北', false, true, 'NE', 'forest'],
    ['jilin', 'Lucky Forest', '幸运森林', '东北', false, true, 'NE', 'forest'],
    ['liaoning', 'Distant Peace', '遥远和平', '东北', true, true, 'NE', 'grassland'],
    
    // 华北地区（4个）- 中北部
    ['beijing', 'North Capital', '北方之都', '华北', false, false, 'N', 'grassland'],
    ['tianjin', 'Heavenly Ford', '天国之渡', '华北', true, false, 'N', 'grassland'],
    ['shanxi', "Mountain's Shadow", '山之影', '华北', false, false, 'NW', 'mountain'],
    ['hezhishouhu', "River's Guardian", '河之卫', '华北', true, false, 'N', 'grassland'],
    
    // 华东区域（6个）- 东部和东南沿海
    ['shanzhidong', "Mountain's Dawn", '山之晨', '华东', true, false, 'NE', 'mountain'],
    ['jiangzhidongxi', 'The Great River', '长江腹地', '华东', true, false, 'E', 'grassland'],
    ['shanghai', 'Up Sea', '海上明珠', '华东', true, false, 'E', 'grassland'],
    ['zhejiang', 'Crooked River', '弯曲河流', '华东', true, false, 'SE', 'forest'],
    ['fujian', 'Fortune Build', '财富建设', '华东', true, false, 'SE', 'forest'],
    ['taiwan', 'Platform Bay', '高台湾地', '华东', true, false, 'SE', 'mountain'],
    
    // 华中区域（2个）- 中心地带
    ['hezhinnanbei', "River's Body", '黄河身躯', '华中', false, false, 'C', 'grassland'],
    ['huzhinnanbei', 'The Twin Lakes', '神秘湖泊', '华中', false, false, 'C', 'grassland'],
    
    // 西北区域（4个）- 西北和西部
    ['shaanxi', 'Narrow West', '狭窄西部', '西北', false, false, 'NW', 'mountain'],
    ['ningxia', 'Quiet Summer', '宁静之夏', '西北', false, false, 'NW', 'desert'],
    ['qinghai', 'Turquoise Sea', '绿松石海', '西北', false, false, 'W', 'snow'],
    ['xinjiang', 'New Frontier', '新边疆', '西北', false, true, 'W', 'desert'],
    
    // 西南区域（5个）- 西南山地
    ['xizang', 'Western Depository', '西部宝藏', '西南', false, true, 'W', 'snow'],
    ['sichuan', 'Four Circuits of Rivers', '四河洼地', '西南', false, false, 'SW', 'mountain'],
    ['chongqing', 'Double Celebration', '双重庆典', '西南', false, false, 'SW', 'mountain'],
    ['guizhou', 'Precious Province', '珍贵大陆', '西南', false, false, 'SW', 'forest'],
    ['yunnan', 'The South of Cloud', '云之南', '西南', false, true, 'SW', 'forest'],
    
    // 华南区域（4个）- 南部沿海
    ['guangkuozhidi', 'Wide Land', '岭南大地', '华南', true, true, 'S', 'grassland'],
    ['hongkong', 'Fragrant Harbour', '芳香的港湾', '华南', true, false, 'S', 'grassland'],
    ['macau', 'Bay Gate', '海湾之门', '华南', true, false, 'S', 'grassland'],
    ['hainan', 'Sea South', '海之南', '华南', true, false, 'S', 'forest'],
];

export const REGION_DEFS = REGION_ROWS.map(([key, fantasyName, literalName, zone, coastal, border, direction, terrain]) => ({
    key,
    fantasyName,
    literalName,
    zone,
    coastal,
    border,
    direction,
    terrain,
}));

// 地形配色现在直接从 TERRAIN_TYPES 获取，不再使用 ZONE_COLORS

const DIRECTION_CENTERS = {
    C: { q: 0, r: 0 },         // 中心
    N: { q: 0, r: -9 },         // 正北
    NE: { q: 10, r: -7 },       // 东北
    E: { q: 12, r: 0 },         // 正东
    SE: { q: 10, r: 8 },        // 东南
    S: { q: 0, r: 12 },         // 正南
    SW: { q: -8, r: 10 },       // 西南
    W: { q: -12, r: 0 },        // 正西
    NW: { q: -9, r: -7 },       // 西北
};

// 区域标签位置微调（轴坐标偏移，单位：六边形格）
// 例：将“河之卫”标签向右上(NE)平移3个单元 => { q:+3, r:-3 }
const REGION_LABEL_OFFSETS = new Map([
    ['hezhishouhu', { q: 3, r: -3 }],
]);

const HEX_DIRECTIONS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
];

const MAP_RADIUS = 38;
const CLUSTER_SPACING = 4;
const LAND_RADIUS = 44;
const BASE_HEX_SIZE = 112;

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

export function HexCanvas({ width = 1920, height = 1080, onSelectHex, markers = [], highlightedTiles = [], onRegionMapReady, onRegionClick }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(0.35);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredHex, setHoveredHex] = useState(null);
    const [selectedHex, setSelectedHex] = useState(null);
    const hexMapRef = useRef(new Map());
    const [breathePhase, setBreathePhase] = useState(0);
    const labelBgImgRef = useRef(null);
    const maskImgRef = useRef(null);
    const holeMaskCanvasRef = useRef(null);
    const landmarkImagesRef = useRef(new Map());

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
            const terrainType = region.terrain || 'grassland';
            const terrainColors = TERRAIN_TYPES[terrainType];
            
            regionPalette.set(region.key, {
                terrain: terrainType,
                base: terrainColors.base,
                border: terrainColors.border,
            });
        });

        claims.forEach((regionKey, key) => {
            if (waterClaims.has(key)) {
                return;
            }
            const palette = regionPalette.get(regionKey);
            map.set(key, {
                terrain: palette?.terrain || 'grassland',
                color: palette?.base,
                border: palette?.border,
                regionKey,
                region: regionLookup.get(regionKey),
            });
        });

        waterClaims.forEach((key) => {
            map.set(key, { terrain: 'ocean' });
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

        // 构建区域->地块映射表
        const regionToTiles = new Map();
        claims.forEach((regionKey, key) => {
            if (waterClaims.has(key)) return;
            if (!regionToTiles.has(regionKey)) {
                regionToTiles.set(regionKey, []);
            }
            const { q, r } = coordsFromKey(key);
            regionToTiles.get(regionKey).push({ q, r });
        });

        return { map, regionAxialCenters, regionToTiles };
    }, []);

    useEffect(() => {
        if (onRegionMapReady && terrainMap.regionToTiles) {
            onRegionMapReady(terrainMap.regionToTiles);
        }
    }, [terrainMap, onRegionMapReady]);

    const drawMap = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { map: terrainMapData, regionAxialCenters } = terrainMap;
        
        const baseSize = BASE_HEX_SIZE;
        const size = baseSize * scale;
        const hexHeight = size * 2;
        const hexWidth = Math.sqrt(3) * size;

        const cols = Math.ceil(width / (hexWidth * 0.75)) + 8;
        const rows = Math.ceil(height / (hexHeight * 0.75)) + 8;

        const originX = width / 2 + offset.x;
        const originY = height / 3 + offset.y;

        // 海色渐变背景，避免拖动出现黑边
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
        oceanGrad.addColorStop(0, '#0b2a3f');
        oceanGrad.addColorStop(1, '#07324d');
        ctx.fillStyle = oceanGrad;
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
            const seamOverlap = Math.max(4, size * 0.28); // 按比例扩展填充，避免缩放出现缝隙
            const basePoints = [
                { x: px, y: py - tileH },      // 上
                { x: px + tileW, y: py },      // 右
                { x: px, y: py + tileH },      // 下
                { x: px - tileW, y: py },      // 左
            ];
            const fillPoints = [
                { x: px, y: py - tileH - seamOverlap },
                { x: px + tileW + seamOverlap, y: py },
                { x: px, y: py + tileH + seamOverlap },
                { x: px - tileW - seamOverlap, y: py },
            ];

            // 绘制地块主体 - 更统一的色块
            ctx.beginPath();
            ctx.moveTo(fillPoints[0].x, fillPoints[0].y);
            ctx.lineTo(fillPoints[1].x, fillPoints[1].y);
            ctx.lineTo(fillPoints[2].x, fillPoints[2].y);
            ctx.lineTo(fillPoints[3].x, fillPoints[3].y);
            ctx.closePath();

            // 填充纯色，确保格子间无缝
            ctx.fillStyle = fillColor;
            ctx.lineJoin = 'round';
            ctx.fill();
            ctx.lineWidth = Math.max(1, seamOverlap * 0.25);
            ctx.strokeStyle = fillColor;
            ctx.stroke();

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
            } else if (terrainData.terrain === 'desert') {
                // 沙漠：沙丘曲线
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px - tileW * 0.3, py - 5);
                ctx.quadraticCurveTo(px - tileW * 0.15, py - 10, px, py - 5);
                ctx.quadraticCurveTo(px + tileW * 0.15, py, px + tileW * 0.3, py - 5);
                ctx.stroke();
            } else if (terrainData.terrain === 'snow') {
                // 雪地：雪花标记
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1;
                for (let i = 0; i < 2; i++) {
                    const cx = px + (i === 0 ? -tileW * 0.2 : tileW * 0.2);
                    const cy = py;
                    const r = 3;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r);
                    ctx.lineTo(cx, cy + r);
                    ctx.moveTo(cx - r, cy);
                    ctx.lineTo(cx + r, cy);
                    ctx.stroke();
                }
            } else if (terrainData.terrain === 'grassland') {
                // 草原：小草标记
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const gx = px + (i - 1) * tileW * 0.2;
                    const gy = py + (i % 2 === 0 ? 2 : -2);
                    ctx.beginPath();
                    ctx.moveTo(gx, gy + 3);
                    ctx.lineTo(gx, gy - 3);
                    ctx.stroke();
                }
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
        // 基于当前偏移计算屏幕中心所对应的轴坐标，确保大拖动时仍填满视口
        const centerAxial = isometricToAxial(-offset.x, -offset.y, size);
        const qMin = Math.floor(centerAxial.q) - cols;
        const qMax = Math.floor(centerAxial.q) + cols;
        const rMin = Math.floor(centerAxial.r) - rows;
        const rMax = Math.floor(centerAxial.r) + rows;
        for (let r = rMin; r <= rMax; r += 1) {
            for (let q = qMin; q <= qMax; q += 1) {
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
                
                // 呼吸效果：alpha从0.5到1.0之间变化，更亮
                const alpha = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(breathePhase));
                ctx.strokeStyle = `rgba(255, 148, 71, ${alpha})`;
                ctx.lineWidth = 5 * scale;
                ctx.shadowColor = 'rgba(255, 148, 71, 0.6)';
                ctx.shadowBlur = 15 * scale;
                ctx.stroke();
                ctx.shadowBlur = 0;
                
                // 内发光效果
                ctx.shadowColor = `rgba(255, 148, 71, ${alpha * 0.5})`;
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
            const baseSize = size * 1.4;
            const flagHeight = baseSize * 1.5;
            const flagWidth = baseSize * 1.2;
            
            ctx.save();
            ctx.translate(marker.px, marker.py - baseSize * 0.5);
            
            // 绘制底部发光光圈
            const pulseScale = 1 + Math.sin(breathePhase) * 0.15;
            const gradient = ctx.createRadialGradient(0, baseSize * 0.5, 0, 0, baseSize * 0.5, baseSize * 0.8 * pulseScale);
            gradient.addColorStop(0, 'rgba(255, 200, 100, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, baseSize * 0.5, baseSize * 0.8 * pulseScale, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制旗杆
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            const poleGradient = ctx.createLinearGradient(-2, 0, 2, 0);
            poleGradient.addColorStop(0, '#8B7355');
            poleGradient.addColorStop(0.5, '#A0826D');
            poleGradient.addColorStop(1, '#6B5344');
            ctx.fillStyle = poleGradient;
            ctx.fillRect(-2, -flagHeight * 0.9, 4, flagHeight);
            
            // 绘制旗帜主体（飘扬效果）
            const wave = Math.sin(breathePhase * 2) * 0.1;
            ctx.beginPath();
            ctx.moveTo(2, -flagHeight * 0.85);
            ctx.bezierCurveTo(
                flagWidth * 0.3, -flagHeight * 0.85 + wave * 10,
                flagWidth * 0.6, -flagHeight * 0.7 - wave * 10,
                flagWidth * 0.9, -flagHeight * 0.7
            );
            ctx.lineTo(flagWidth * 0.9 - wave * 8, -flagHeight * 0.4);
            ctx.bezierCurveTo(
                flagWidth * 0.6, -flagHeight * 0.4 + wave * 8,
                flagWidth * 0.3, -flagHeight * 0.3 - wave * 8,
                2, -flagHeight * 0.3
            );
            ctx.closePath();
            
            // 旗帜渐变色
            const flagGradient = ctx.createLinearGradient(0, -flagHeight * 0.85, flagWidth, -flagHeight * 0.4);
            flagGradient.addColorStop(0, '#E63946');
            flagGradient.addColorStop(0.5, '#DC2F3C');
            flagGradient.addColorStop(1, '#B71C2E');
            ctx.fillStyle = flagGradient;
            ctx.fill();
            
            // 旗帜边框
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(180, 30, 40, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制旗帜上的文字/图标
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 3;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${baseSize * 0.45}px var(--font-game)`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const markerText = marker.marker_type || marker.event_name || '✓';
            ctx.fillText(markerText.substring(0, 2), flagWidth * 0.45, -flagHeight * 0.57);
            
            // 绘制旗帜顶端的装饰
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, -flagHeight * 0.9, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        }

        // 绘制区域名称标签 - 使用预计算的区域中心
        // 放大字体，减小行距
        const fontSize = Math.max(24, Math.min(240, 184 * scale));
        const lineHeight = fontSize * 0.6; // 更贴近：缩小中英文的行距
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        regionAxialCenters.forEach((axialCenter, regionKey) => {
            const regionDef = REGION_DEFS.find(r => r.key === regionKey);
            if (regionDef) {
                // 将轴坐标转换为屏幕坐标
                const off = REGION_LABEL_OFFSETS.get(regionKey) || { q: 0, r: 0 };
                const { x, y } = axialToIsometric(axialCenter.q + off.q, axialCenter.r + off.r, size);
                const centerX = originX + x;
                const centerY = originY + y;
                
                // 只绘制在视野内的标签
                if (centerX >= -100 && centerX <= width + 100 && centerY >= -100 && centerY <= height + 100) {
                    // 中文使用直译名；英文使用直译英文
                    const chineseName = regionDef.literalName;
                    const englishName = regionDef.fantasyName;
                    
                    // 测量文字宽度以确定底板大小
                    ctx.font = `bold ${fontSize}px var(--font-game)`;
                    const textMetricsCN = ctx.measureText(chineseName);
                    const maxTextWidthCN = textMetricsCN.width;
                    const englishFontSize = fontSize * 0.7;
                    ctx.font = `bold ${englishFontSize}px var(--font-game)`;
                    const textMetricsEN = ctx.measureText(englishName);
                    const maxTextWidth = Math.max(maxTextWidthCN, textMetricsEN.width);
                    
                    // 计算文本块上下边界（基于 middle baseline 估算）
                    const cnY = centerY - lineHeight / 2;
                    const enY = centerY + lineHeight / 2;
                    const blockTop = cnY - fontSize * 0.5;
                    const blockBottom = enY + englishFontSize * 0.5;
                    const textBlockHeight = blockBottom - blockTop;
                    
                    // 获取landmark插画
                    const landmarkImg = landmarkImagesRef.current.get(regionDef.literalName);
                    let landmarkHeight = 0;
                    
                    // 绘制landmark插画（在名字板上方）- 更大尺寸
                    if (landmarkImg) {
                        ctx.save();
                        const landmarkAspectRatio = landmarkImg.width / landmarkImg.height;
                        const landmarkWidth = 500 * scale; // 增大插画尺寸
                        landmarkHeight = landmarkWidth / landmarkAspectRatio;
                        
                        ctx.drawImage(
                            landmarkImg,
                            centerX - landmarkWidth / 2,
                            (blockTop - 15 * scale) - landmarkHeight, // 减小间距
                            landmarkWidth,
                            landmarkHeight
                        );
                        ctx.restore();
                    }
                    
                    // 绘制地名底板图片：根据文本动态计算（允许纵向拉伸，保证文字总在底板内）
                    if (labelBgImgRef.current) {
                        ctx.save();
                        const padX = 180 * scale;
                        const padY = 14 * scale; // 更小的上下内边距以贴近文本
                        const bgWidth = Math.max(maxTextWidth + padX * 2, labelBgImgRef.current.width * scale * 0.25);
                        const bgHeight = Math.max(textBlockHeight + padY * 2, labelBgImgRef.current.height * scale * 0.20);
                        const bgX = centerX - bgWidth / 2;
                        const bgY = blockTop - padY;
                        ctx.drawImage(labelBgImgRef.current, bgX, bgY, bgWidth, bgHeight);
                        ctx.restore();
                    }
                    
                    // 绘制中文名称（上方）
                    ctx.save();
                    ctx.font = `bold ${fontSize}px var(--font-game)`;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
                    ctx.shadowBlur = 15 * scale;
                    ctx.fillStyle = '#1a0f0a'; // 更深的颜色
                    ctx.fillText(chineseName, centerX, cnY);
                    
                    // 绘制英文名称（下方，稍小）
                    ctx.font = `bold ${englishFontSize}px var(--font-game)`;
                    ctx.fillStyle = '#4a3520'; // 更清晰的对比色
                    ctx.shadowBlur = 10 * scale;
                    ctx.fillText(englishName, centerX, enY);
                    ctx.restore();
                }
            }
        });

        ctx.shadowBlur = 0;

        // 在四周海域标注方位名称：北海/南海/西海/东海
        (function drawSeaNames() {
            const seaFont = Math.max(28, Math.min(64, 54 * scale));
            const margin = 32;
            const sideMargin = 52;
            ctx.save();
            ctx.fillStyle = 'rgba(240, 248, 255, 0.85)';
            ctx.strokeStyle = 'rgba(13, 34, 48, 0.85)';
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 6;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${seaFont}px var(--font-game)`;

            // 北海（上）
            ctx.strokeText('北海', width / 2, margin);
            ctx.fillText('北海', width / 2, margin);

            // 南海（下）
            ctx.strokeText('南海', width / 2, height - margin);
            ctx.fillText('南海', width / 2, height - margin);

            // 西海（左）
            ctx.strokeText('西海', sideMargin, height / 2);
            ctx.fillText('西海', sideMargin, height / 2);

            // 东海（右）
            ctx.strokeText('东海', width - sideMargin, height / 2);
            ctx.fillText('东海', width - sideMargin, height / 2);

            ctx.restore();
        })();

        // 在地图之上叠加黑色遮罩，仅在 UI 透明处挖孔，确保非透明处全部为黑色
        if (maskImgRef.current) {
            // 确保“透明区域”掩膜可用（白色=挖孔处，来自 UI 透明区域）
            if (!holeMaskCanvasRef.current || holeMaskCanvasRef.current.width !== width || holeMaskCanvasRef.current.height !== height) {
                const holeCanvas = document.createElement('canvas');
                holeCanvas.width = width;
                holeCanvas.height = height;
                const hctx = holeCanvas.getContext('2d');
                if (hctx) {
                    // 先铺满白色
                    hctx.fillStyle = '#fff';
                    hctx.fillRect(0, 0, width, height);
                    // destination-out 去掉 UI 不透明处 => 保留 UI 透明处为白色
                    hctx.globalCompositeOperation = 'destination-out';
                    hctx.imageSmoothingEnabled = true;
                    hctx.drawImage(maskImgRef.current, 0, 0, width, height);
                    hctx.globalCompositeOperation = 'source-over';
                }
                holeMaskCanvasRef.current = holeCanvas;
            }

            const overlayCanvas = document.createElement('canvas');
            overlayCanvas.width = width;
            overlayCanvas.height = height;
            const octx = overlayCanvas.getContext('2d');
            if (octx) {
                // 覆盖整层为黑色
                octx.fillStyle = '#000';
                octx.fillRect(0, 0, width, height);

                // 使用“透明区域掩膜”做 destination-out，仅在 UI 透明处挖孔
                octx.globalCompositeOperation = 'destination-out';
                octx.imageSmoothingEnabled = false; // 掩膜保持硬边，避免1px 漏光
                octx.drawImage(holeMaskCanvasRef.current, 0, 0);

                // 将结果叠加到主画布上（在上层）
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(overlayCanvas, 0, 0);
                ctx.restore();
            }
        }
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

    // 加载主页图作为遮罩（用于挖孔）
    useEffect(() => {
        const img = new Image();
        img.src = '/assets/UI/主页.webp';
        img.onload = () => {
            maskImgRef.current = img;
            drawMap();
        };
    }, [drawMap]);

    // 预加载landmark插画
    useEffect(() => {
        const landmarkNames = [
            '黑龙之河', '幸运森林', '遥远和平',
            '北方之都', '天国之渡', '山之影', '河之卫',
            '山之晨', '长江腹地', '海上明珠', '弯曲河流', '财富建设', '高台湾地',
            '黄河身躯', '神秘湖泊',
            '狭窄西部', '宁静之夏', '绿松石海',
            '西部宝藏', '双重庆典',
            '岭南大地', '芳香的港湾', '海湾之门', '海之南',
            '新边疆', '四河洼地', '珍贵大陆'
        ];
        
        let loadedCount = 0;
        landmarkNames.forEach(name => {
            const img = new Image();
            img.src = `/assets/landmark/${name}.webp`;
            img.onload = () => {
                landmarkImagesRef.current.set(name, img);
                loadedCount++;
                if (loadedCount === landmarkNames.length) {
                    drawMap();
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load landmark: ${name}`);
                loadedCount++;
                if (loadedCount === landmarkNames.length) {
                    drawMap();
                }
            };
        });
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
    const rafIdRef = useRef(null); // requestAnimationFrame ID
    const DRAG_THRESHOLD = 5; // 移动超过5像素才算拖拽

    const getLogicalCanvasCoords = useCallback((event) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const dpr = window.devicePixelRatio || 1;
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const scaledX = (mouseX * canvas.width) / rect.width;
        const scaledY = (mouseY * canvas.height) / rect.height;
        return { x: scaledX / dpr, y: scaledY / dpr };
    }, []);

    const findHexAtCanvasPoint = useCallback((canvasPoint) => {
        if (!canvasPoint) return null;
        const baseSize = BASE_HEX_SIZE;
        const size = baseSize * scale;
        const originX = width / 2 + offset.x;
        const originY = height / 3 + offset.y;
        const approx = isometricToAxial(canvasPoint.x - originX, canvasPoint.y - originY, size);
        const tileW = size * 1.5;
        const tileH = size * 0.75;

        const candidateKeys = new Set([`${approx.q},${approx.r}`]);
        HEX_DIRECTIONS.forEach((dir) => {
            candidateKeys.add(`${approx.q + dir.q},${approx.r + dir.r}`);
        });

        let best = null;
        candidateKeys.forEach((key) => {
            const [q, r] = key.split(',').map(Number);
            // 使用当前的 scale 和 offset 实时计算坐标，而不是依赖 hexMapRef 中可能过时的数据
            const { x, y } = axialToIsometric(q, r, size);
            const px = originX + x;
            const py = originY + y;
            
            const dx = Math.abs(canvasPoint.x - px);
            const dy = Math.abs(canvasPoint.y - py);
            const score = dx / tileW + dy / tileH;
            if (score <= 1.05 && (!best || score < best.score)) {
                best = { q, r, score };
            }
        });

        if (best) {
            return { q: best.q, r: best.r };
        }

        // 检查 terrainMap 中是否存在该坐标（而不是检查可能过时的 hexMapRef）
        const { map: terrainMapData } = terrainMap;
        if (terrainMapData.has(`${approx.q},${approx.r}`)) {
            return approx;
        }

        return null;
    }, [offset, scale, width, height, terrainMap]);

    const handleMouseDown = useCallback((e) => {
        wasDraggingRef.current = false;
        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }, [offset]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            // 检查是否真的在拖拽（移动超过阈值）
            const dx = e.clientX - mouseDownPosRef.current.x;
            const dy = e.clientY - mouseDownPosRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > DRAG_THRESHOLD) {
                wasDraggingRef.current = true;
                const newX = e.clientX - dragStart.x;
                const newY = e.clientY - dragStart.y;
                const MAX_OFFSET = 3500;
                
                // 使用 requestAnimationFrame 节流更新，避免频繁渲染
                if (rafIdRef.current) {
                    cancelAnimationFrame(rafIdRef.current);
                }
                
                rafIdRef.current = requestAnimationFrame(() => {
                    setOffset({
                        x: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, newX)),
                        y: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, newY)),
                    });
                    rafIdRef.current = null;
                });
            }
        } else {
            const logicalPos = getLogicalCanvasCoords(e);
            if (!logicalPos) return;
            const hex = findHexAtCanvasPoint(logicalPos);
            setHoveredHex((prev) => {
                if (!hex) return null;
                if (prev && prev.q === hex.q && prev.r === hex.r) {
                    return prev;
                }
                return hex;
            });
        }
    }, [isDragging, dragStart, getLogicalCanvasCoords, findHexAtCanvasPoint]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        // 清理未完成的动画帧
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
    }, []);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.0005; // 增加缩放灵敏度
        
        // 使用 requestAnimationFrame 节流缩放
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
        }
        
        rafIdRef.current = requestAnimationFrame(() => {
            setScale(prev => {
                const newScale = prev + delta;
                return Math.max(0.1, Math.min(0.8, newScale));
            });
            rafIdRef.current = null;
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

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const logicalPos = getLogicalCanvasCoords(e);
        if (!logicalPos) return;

        // 检查是否点击了区域标签（包括landmark插画区域）
        const { regionAxialCenters } = terrainMap;
        let clickedRegion = null;
        const fontSize = Math.max(24, Math.min(240, 184 * scale));
        const lineHeight = fontSize * 0.6;
        
        regionAxialCenters.forEach((axialCenter, regionKey) => {
            const regionDef = REGION_DEFS.find(r => r.key === regionKey);
            if (!regionDef) return;
            
            const off = REGION_LABEL_OFFSETS.get(regionKey) || { q: 0, r: 0 };
            const { x, y } = axialToIsometric(axialCenter.q + off.q, axialCenter.r + off.r, BASE_HEX_SIZE * scale);
            const centerX = width / 2 + offset.x + x;
            const centerY = height / 3 + offset.y + y;
            
            // 与绘制一致的文本与底板几何
            const englishFontSize = fontSize * 0.7;
            const cnY = centerY - lineHeight / 2;
            const enY = centerY + lineHeight / 2;
            const blockTop = cnY - fontSize * 0.5;
            const blockBottom = enY + englishFontSize * 0.5;
            const textBlockHeight = blockBottom - blockTop;
            const padX = 180 * scale;
            const padY = 14 * scale;

            // 文本宽度测量
            ctx.font = `bold ${fontSize}px var(--font-game)`;
            const wCN = ctx.measureText(regionDef.literalName).width;
            ctx.font = `bold ${englishFontSize}px var(--font-game)`;
            const wEN = ctx.measureText(regionDef.fantasyName).width;
            const maxTextWidth = Math.max(wCN, wEN);
            const areaWidth = Math.max(maxTextWidth + padX * 2, 200 * scale);
            const baseboardTop = blockTop - padY;
            const baseboardHeight = textBlockHeight + padY * 2;

            // 扩展点击区域到包含上方插图
            const landmarkImg = landmarkImagesRef.current.get(regionDef.literalName);
            let clickAreaTop = baseboardTop;
            let clickAreaHeight = baseboardHeight;
            if (landmarkImg) {
                const ar = landmarkImg.width / landmarkImg.height;
                const landmarkWidth = 500 * scale;
                const landmarkHeight = landmarkWidth / ar;
                const topWithLandmark = baseboardTop - (landmarkHeight + 15 * scale);
                clickAreaTop = Math.min(clickAreaTop, topWithLandmark);
                clickAreaHeight = (baseboardTop + baseboardHeight) - clickAreaTop;
            }
            
            // 检查点击是否在区域内（矩形检测）
            const clickAreaWidth = areaWidth;
            if (logicalPos.x >= centerX - clickAreaWidth / 2 && 
                logicalPos.x <= centerX + clickAreaWidth / 2 &&
                logicalPos.y >= clickAreaTop && 
                logicalPos.y <= clickAreaTop + clickAreaHeight) {
                clickedRegion = regionKey;
            }
        });
        
        // 如果点击了区域标签，触发区域高亮
        if (clickedRegion && onRegionClick) {
            onRegionClick(clickedRegion);
            return;
        }
        
        // 点击地块时，高亮该地块所属的整个区域
        const hex = findHexAtCanvasPoint(logicalPos);
        if (!hex) {
            return;
        }
        const key = `${hex.q},${hex.r}`;
        const tileData = terrainMap.map.get(key);
        if (tileData && tileData.regionKey && onRegionClick) {
            // 调用区域点击逻辑，高亮整个区域
            onRegionClick(tileData.regionKey);
        }
    }, [width, height, offset, scale, terrainMap, onRegionClick, getLogicalCanvasCoords, findHexAtCanvasPoint]);

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
