# Infinite Synthesis Client

React 19 + Phaser 3 单页前端，服务于无限合成游戏。该客户端通过 Vite 打包，登录/注册直接调用后端 `/api/auth/*` 接口，游戏主循环以单机模拟运行，可无缝接入实时多人逻辑。

## 运行先决条件

- Node.js >= 20

在仓库根目录执行 `npm --prefix client install` 安装依赖。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（默认 http://localhost:8080） |
| `npm run dev-nolog` | 无匿名日志版本的开发服务器 |
| `npm run build` | 构建生产资源到 `dist/` |
| `npm run build-nolog` | 构建但禁用模板统计 |

> 根目录通过 `npm run client:dev` / `npm run client:build` 调用这些脚本。

## 项目结构

| 路径 | 说明 |
|------|------|
| `index.html` | SPA 入口，与 Express 生产托管保持一致 |
| `src/main.jsx` | React 挂载入口，注入全局样式 |
| `src/App.jsx` | 登录态管理、消息提示、游戏容器切换 |
| `src/services/api.js` | 后端 REST API 封装（登录 / 注册） |
| `src/hooks/useGameSimulation.js` | 单机回合、资源、熔炉、契约模拟逻辑 |
| `src/components/auth/*` | 登录 / 注册界面 |
| `src/components/game/*` | HUD、手牌、熔炉、职业、契约、操控组件 |
| `src/game/*` | Phaser 场景、事件总线、启动入口 |
| `src/styles/app.css` | 液态毛玻璃 + 深色 UI 主题 |
| `public/` | 静态资源（favicon 等），构建时自动复制 |

## 开发流程

1. 安装依赖：`npm --prefix client install`
2. 启动后端（根目录 `npm run dev`）
3. 启动前端：`npm run client:dev`
4. 修改 `src/` 下任意文件，Vite 热更新生效，Phaser 场景支持自动重建。

## 构建与部署

```bash
npm run client:build
# 产物位于 client/dist/，Express 自动托管
```

若独立部署，请将 `dist/` 全量复制到目标静态目录，并保持 `/index.html` 可被回退路由访问。

## 其他说明

- `log.js` 沿用官方模板的匿名使用统计，若需禁用请使用 `dev-nolog`/`build-nolog`。
- Phaser 版本固定 3.60.0，如需升级请同时调整 `src/game` 内部逻辑并完整测试。
