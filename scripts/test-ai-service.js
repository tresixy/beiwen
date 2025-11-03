import { synthesizeByAI } from '../server/services/aiService.js';

async function main() {
  const inputItems = [
    {
      id: 'wood-001',
      name: '木材',
      tier: 1,
      ai_civilization_name: '星辉部落',
    },
    {
      id: 'stone-002',
      name: '石头',
      tier: 1,
      ai_civilization_name: '星辉部落',
    },
  ];

  try {
    console.log('=== 测试AI合成服务 ===');
    console.log('输入材料:', inputItems.map(i => i.name).join(' + '));
    console.log('所属时代: 生存时代');
    console.log('AI文明名称:', inputItems[0].ai_civilization_name);
    console.log('');
    
    const result = await synthesizeByAI(inputItems, '测试合成', 'test-user', '生存时代', null);
    console.log('=== AI返回结果 ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('AI合成调用失败:', error);
    process.exitCode = 1;
  }
}

main();

