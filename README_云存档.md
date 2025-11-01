# 🎮 玩家数据云存档功能

## ✨ 功能亮点

- ☁️ **自动云端保存**：所有游戏进度自动同步到服务器
- 🔄 **跨设备游戏**：用相同邮箱登录，任何设备继续玩
- 💾 **智能同步**：关键操作实时保存，常规操作防抖保存
- 🔒 **安全认证**：JWT Token保护，7天有效期
- 📱 **离线模式**：断网也能玩，自动切换本地模式

## 🚀 快速开始

### 1. 登录游戏
```
输入邮箱 → 自动登录/注册 → 进入游戏
```

### 2. 换设备继续玩
```
新设备 → 输入相同邮箱 → 自动加载存档 → 继续游戏
```

## 📦 存档内容

| 类型 | 内容 | 同步方式 |
|------|------|----------|
| 资源 | 食物、生产力、研究点数 | 回合结束时 |
| 手牌 | 当前持有的卡牌 | 3秒防抖 |
| 背包 | 收集的物品 | 实时 |
| 职业 | 职业选择和历史 | 选择时 |
| 契约 | 社会契约状态 | 选择时 |
| 卡牌收藏 | 已解锁的卡牌 | 实时 |

## 🧪 测试功能

运行测试脚本：
```bash
cd /root/minigame
./test-save-game.sh
```

测试输出示例：
```
=== 测试玩家数据存档功能 ===

1. 登录用户...
✅ 登录成功，用户ID: 5

2. 获取初始游戏状态...
✅ 游戏状态: {...}

3. 保存手牌...
✅ 手牌已保存

4. 重新获取游戏状态（验证存档）...
✅ 手牌数量: 3

5. 结束回合...
✅ 回合已结束，当前回合: 1

6. 获取资源...
✅ 当前资源: {food: 15, production: 13, research: 7}

=== 测试完成 ===
✨ 玩家数据存档功能正常工作！
```

## 🔧 技术实现

### 前端集成
`useGameSimulation` Hook已集成云同步：

```javascript
// 自动检测token，启用服务器同步
const { loading, resources, hand, ... } = useGameSimulation({ 
  pushMessage, 
  token 
});

// 加载时显示
if (loading) {
  return <div>正在加载游戏数据...</div>;
}
```

### 后端API
| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/game/state` | GET | 获取完整游戏状态 |
| `/api/game/hand` | POST | 保存手牌 |
| `/api/game/contract` | POST | 保存契约 |
| `/api/game/contract` | DELETE | 清空契约 |
| `/api/turn/end` | POST | 结束回合 |
| `/api/turn/resources` | GET | 获取资源 |

### 数据库
```sql
-- 用户游戏状态表
CREATE TABLE user_game_state (
    user_id INTEGER PRIMARY KEY,
    hand_json JSONB,        -- 手牌
    contract_json JSONB,    -- 契约
    updated_at TIMESTAMP
);

-- 资源表
CREATE TABLE resources (
    user_id INTEGER PRIMARY KEY,
    food INTEGER,
    production INTEGER,
    research INTEGER,
    turn INTEGER
);
```

## 📊 同步策略

### 实时同步
- 回合结束
- 契约选择
- 职业选择

### 防抖同步（3秒）
- 手牌变化
- 背包变化

### 懒加载
- 游戏启动时
- 重新登录后

## 🛡️ 数据安全

- ✅ JWT Token认证
- ✅ 数据库事务
- ✅ 行锁防并发
- ✅ 自动冲突处理
- ✅ JSONB高效存储

## 📝 相关文档

详细文档：[docs/云存档功能说明.md](docs/云存档功能说明.md)

包含：
- API详细说明
- 数据库结构
- 故障排查
- 性能优化
- 未来改进

## 🎯 使用示例

### 测试跨设备存档

**设备A：**
```bash
# 1. 登录并玩一会
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "player@example.com"}'

# 2. 保存手牌
curl -X POST http://localhost:3000/api/game/hand \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hand": [...]}'

# 3. 结束几个回合
curl -X POST http://localhost:3000/api/turn/end \
  -H "Authorization: Bearer $TOKEN"
```

**设备B：**
```bash
# 1. 用相同邮箱登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "player@example.com"}'

# 2. 获取游戏状态
curl http://localhost:3000/api/game/state \
  -H "Authorization: Bearer $TOKEN"

# 3. 看到设备A的进度！
# ✅ 相同的手牌
# ✅ 相同的资源
# ✅ 相同的回合数
```

## 🎉 完成

现在您的游戏支持：
- ✅ 自动云端存档
- ✅ 跨设备游戏
- ✅ 邮箱登录系统
- ✅ 智能同步策略
- ✅ 离线模式降级
- ✅ 完整测试验证

**开始游戏，随时随地继续冒险！** 🚀

