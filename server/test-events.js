import * as eventService from './services/eventService.js';
import pool from './db/connection.js';
import logger from './utils/logger.js';

// 测试events系统
async function testEventsSystem() {
  const testUserId = 1; // 使用管理员账号测试

  try {
    console.log('=== 测试Events系统 ===\n');

    // 1. 生成events序列
    console.log('1. 生成events序列...');
    const sequence = await eventService.generateEventSequence(testUserId);
    console.log(`✅ 已生成${sequence.length}个events`);
    console.log(`   序列: [${sequence.join(', ')}]\n`);

    // 2. 获取events状态
    console.log('2. 获取events状态...');
    const state = await eventService.getEventState(testUserId);
    console.log(`✅ 当前时代: ${state.era}`);
    console.log(`   已完成: ${state.completedEvents.length}/${state.eventSequence.length}`);
    console.log(`   已解锁钥匙: [${state.unlockedKeys.join(', ')}]\n`);

    // 3. 获取激活的event
    console.log('3. 获取当前激活的event...');
    const activeEvent = await eventService.getActiveEvent(testUserId);
    if (activeEvent) {
      console.log(`✅ 激活event: ${activeEvent.name}`);
      console.log(`   描述: ${activeEvent.description}`);
      console.log(`   所需钥匙: ${activeEvent.required_key}`);
      console.log(`   奖励: ${activeEvent.reward}\n`);
    } else {
      console.log('⚠️  没有激活的event\n');
    }

    // 4. 获取进度概览
    console.log('4. 获取进度概览...');
    const progress = await eventService.getProgressOverview(testUserId);
    console.log(`✅ 进度概览:`);
    console.log(`   时代: ${progress.era}`);
    console.log(`   完成度: ${progress.completedCount}/${progress.totalCount}`);
    console.log(`   已解锁钥匙: [${progress.unlockedKeys.join(', ')}]`);
    console.log(`\n   所有events:`);
    progress.allEvents.forEach((event, index) => {
      const status = event.active ? '🔵活跃' : event.completed ? '✅完成' : '⏸️待解锁';
      console.log(`   ${index + 1}. ${status} ${event.era} - ${event.name}`);
    });

    console.log('\n=== 测试完成 ===');
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    logger.error({ err }, 'Test error');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testEventsSystem();




