// 从 CSV 导入更多卡牌 SVG 的脚本
// 使用方法：node client/scripts/import-card-svgs.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../../client/public/assets/灵感牌.csv');
const OUTPUT_PATH = path.join(__dirname, '../src/utils/cardSvgMap.js');

function parseCardFromCsv(csvContent) {
  const cards = [];
  const lines = csvContent.split('\n');
  
  let currentCard = null;
  let currentField = '';
  let fieldIndex = 0;
  let inQuotes = false;
  let svgContent = '';
  
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field完成
        if (fieldIndex === 0) {
          currentCard = { name: currentField.trim() };
        } else if (fieldIndex === 1) {
          currentCard.type = currentField.trim();
        } else if (fieldIndex === 2) {
          currentCard.svg = currentField.trim();
        }
        
        currentField = '';
        fieldIndex++;
      } else {
        currentField += char;
      }
    }
    
    // 行结束
    if (!inQuotes) {
      // 完整的一行
      if (fieldIndex === 2 && currentField) {
        currentCard.svg = currentField.trim();
        if (currentCard.name && currentCard.svg) {
          cards.push(currentCard);
        }
        currentCard = null;
        currentField = '';
        fieldIndex = 0;
      }
    } else {
      // 跨行的字段，添加换行符继续
      currentField += '\n';
    }
  }
  
  return cards;
}

function convertCsvToMap() {
  console.log('📖 读取 CSV 文件...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  
  const cards = parseCardFromCsv(csvContent);
  
  console.log(`✅ 找到 ${cards.length} 张卡牌\n`);
  
  const cardMap = {};
  let successCount = 0;
  let skipCount = 0;
  
  for (const card of cards) {
    const cardName = card.name.replace(/【|】/g, '').trim();
    const svgContent = card.svg;
    
    if (!cardName || !svgContent || svgContent.length < 10) {
      console.log(`⚠️  跳过 ${card.name}（无效SVG）`);
      skipCount++;
      continue;
    }
    
    cardMap[cardName] = svgContent;
    successCount++;
    console.log(`  ✓ ${cardName} (${card.type})`);
  }
  
  console.log(`\n📊 统计：`);
  console.log(`  - 成功：${successCount} 张`);
  console.log(`  - 跳过：${skipCount} 张`);
  console.log(`  - 总计：${successCount + skipCount} 张\n`);
  
  return cardMap;
}

function generateMapFile(cardMap) {
  console.log('📝 生成 cardSvgMap.js 文件...');
  
  let output = `// 从CSV解析的SVG卡牌映射
// 卡牌名称去掉【】符号作为key
// 自动生成，请勿手动编辑

export const CARD_SVG_MAP = {\n`;
  
  for (const [cardName, svgContent] of Object.entries(cardMap)) {
    const escapedSvg = svgContent.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    output += `  '${cardName}': \`${escapedSvg}\`,\n\n`;
  }
  
  output += `};

// 获取卡牌SVG
export function getCardSvg(cardName) {
  // 去掉卡牌名称中的【】符号
  const cleanName = cardName?.replace(/【|】/g, '') || '';
  return CARD_SVG_MAP[cleanName] || null;
}

// 检查卡牌是否有SVG
export function hasCardSvg(cardName) {
  const cleanName = cardName?.replace(/【|】/g, '') || '';
  return cleanName in CARD_SVG_MAP;
}
`;
  
  fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');
  console.log(`✅ 已生成文件：${OUTPUT_PATH}\n`);
}

function main() {
  console.log('🚀 开始导入卡牌 SVG...\n');
  
  try {
    const cardMap = convertCsvToMap();
    generateMapFile(cardMap);
    console.log('✨ 导入完成！\n');
  } catch (err) {
    console.error('❌ 导入失败:', err.message);
    process.exit(1);
  }
}

main();

