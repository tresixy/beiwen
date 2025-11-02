/**
 * 预加载2D图片素材
 * 在登录页面加载时预加载所有可能的2D图片，避免游戏中使用时出现延迟
 */

const EXTENSIONS = ['.png', '.jpg', '.webp', '.jpeg'];

/**
 * 已知的2D图片名称列表（根据游戏设计文档）
 * 如果有新的图片，需要更新此列表
 */
const KNOWN_2D_IMAGES = [
    '篝火',
    '麦田',
    '石碑',
    '图书馆',
    '市场',
    '城墙',
    '学堂',
    '港口',
    '哨塔',
];

/**
 * 预加载单个图片
 * @param {string} imageName - 图片名称（不含扩展名）
 * @returns {Promise<void>}
 */
function preloadImage(imageName) {
    return new Promise((resolve, reject) => {
        let loaded = false;
        let lastError = null;

        // 尝试所有可能的扩展名
        const loadAttempts = EXTENSIONS.map(ext => {
            return new Promise((resolveAttempt) => {
                const img = new Image();
                const imagePath = `/assets/2d/${imageName}${ext}`;

                img.onload = () => {
                    if (!loaded) {
                        loaded = true;
                        resolveAttempt(true);
                    }
                };

                img.onerror = () => {
                    resolveAttempt(false);
                };

                img.src = imagePath;
            });
        });

        // 等待所有尝试完成
        Promise.all(loadAttempts).then(results => {
            if (results.some(success => success)) {
                resolve();
            } else {
                // 如果所有扩展名都失败，不算错误（图片可能不存在）
                // 静默失败，不阻塞其他图片的加载
                resolve();
            }
        });
    });
}

/**
 * 预加载所有2D图片
 * @returns {Promise<void>}
 */
export function preloadAll2DImages() {
    const promises = KNOWN_2D_IMAGES.map(imageName => preloadImage(imageName));
    return Promise.allSettled(promises).then(() => {
        console.log('[Preload] 2D图片预加载完成');
    });
}

/**
 * 预加载指定名称的图片
 * @param {string[]} imageNames - 图片名称数组
 * @returns {Promise<void>}
 */
export function preload2DImages(imageNames) {
    const promises = imageNames.map(imageName => preloadImage(imageName));
    return Promise.allSettled(promises);
}


