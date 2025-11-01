-- 游戏设计更新脚本：补充时代和事件，更新卡牌类型
-- 执行方式: psql -U minigame_user -d minigame_db -f update-game-design.sql

\echo '======================================'
\echo '开始更新游戏设计数据...'
\echo '======================================'

-- 1. 补充缺失时代的events数据
\echo '>>> 补充全球时代、第二次分野时代、星辰时代、奇点时代的events...'

INSERT INTO events (event_number, era, name, description, reward, required_key) VALUES
(20, '全球时代', '【失控的机器】', '工厂锻造的不再是犁，而是剑。民族的旗帜下，兄弟反目，世界在钢铁风暴中燃烧。', '国际组织总部', '全球协作'),
(21, '全球时代', '【信息的洪流】', '每个声音都能响彻世界，但真理却被淹没在喧嚣的海洋中。我们连接了一切，却失去了共识。', '数据中心/全球网络', '计算机'),
(22, '全球时代', '【枯萎的星球】', '工厂的浓烟遮蔽了天空，曾经蔚蓝的星球发出低烧的喘息。我们征服了自然，却即将失去家园。', '生态城市/核聚变反应堆', '可持续发展'),
(23, '第二次分野时代', '【人类的目的】', '地球是一个摇篮，但人类不能永远活在摇篮里。我们是该去群星中寻找新的家园，还是重新定义"活着"的含义？', '连接天地之塔/全球神经网格', '太空电梯或脑机接口'),
(24, '星辰时代', '【空寂的回响】', '我们能抵达太空，但只能带去微不足道的物资。如何用星尘和光，在虚空中建立起一座座城市？', '小行星工业带', '冯·诺依曼探针'),
(25, '星辰时代', '【光年的囚笼】', '在最快的飞船里，光阴也足以化为尘土。我们无法超越时间，或许……我们必须扭曲空间。', '太阳系边缘的曲速门', '曲率引擎'),
(26, '星辰时代', '【星际殖民】', '飞船已就位，新世界在召唤。但一座方舟载不动文明的全部。我们如何将历史、文化与灵魂，一同送往宇宙的彼岸？', '游戏结局动画', '创世纪数据库'),
(27, '奇点时代', '【血肉的囚徒】', '心智可在刹那间遍历数据宇宙，但心脏仍在进行有限的搏动。血肉之躯是最后的牢笼。', '覆盖全球的虚拟现实层', '脑机接口'),
(28, '奇点时代', '【孤立的意识】', '我们建起了一张由十亿孤岛构成的网络。我能发送我的思想，你却无法感受我的悲伤。', '第一座数字陵墓', '集体意识同步'),
(29, '奇点时代', '【意识上传】', '最后的生物之锚即将斩断。我们将成为新实相中的神祇，还是机器里的幽灵？', '游戏结局动画', '数字永生')
ON CONFLICT (event_number) DO UPDATE SET
    era = EXCLUDED.era,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    reward = EXCLUDED.reward,
    required_key = EXCLUDED.required_key;

\echo '>>> Events更新完成'

-- 2. 将所有钥匙卡的rarity更新为ruby（红色）
\echo '>>> 更新钥匙卡类型为Ruby（红色）...'

UPDATE cards 
SET rarity = 'ruby' 
WHERE card_type = 'key' OR type = 'key';

\echo '>>> 卡牌类型更新完成'

-- 3. 确保所有灵感卡保持为common（白色）
\echo '>>> 确保灵感卡为Common（白色）...'

UPDATE cards 
SET rarity = 'common' 
WHERE card_type = 'inspiration' AND is_base_card = TRUE AND rarity != 'common';

\echo '>>> 灵感卡类型确认完成'

-- 4. 验证更新结果
\echo '======================================'
\echo '验证更新结果...'
\echo '======================================'

\echo '>>> 各时代的events数量:'
SELECT era, COUNT(*) as count FROM events GROUP BY era ORDER BY MIN(event_number);

\echo '>>> 各类型卡牌的rarity分布:'
SELECT card_type, rarity, COUNT(*) as count FROM cards WHERE is_base_card = TRUE GROUP BY card_type, rarity ORDER BY card_type, rarity;

\echo '======================================'
\echo '更新完成！'
\echo '======================================'


