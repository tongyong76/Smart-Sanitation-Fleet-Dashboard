# 无人环卫车云端监控演示平台

## 技术栈

- **框架**: Vue 3 + TypeScript + Vite
- **地图**: 百度地图 API v3.0 + vue-baidu-map-next
- **状态**: WebSocket (Mock)
- **类型安全**: 完整的 TypeScript 类型定义

## 项目结构

src/
├── types/ # TypeScript 类型定义
│ ├── vehicle.ts # 车辆数据类型
│ └── baidu-map.d.ts # 百度地图类型声明
├── models/ # 数据模型
│ └── vehicle.ts # 车辆生成器
├── services/ # 服务层
│ └── mockWebSocket.ts # WebSocket 模拟服务
├── utils/ # 工具函数
│ └── vehicleMovement.ts # 车辆移动逻辑
├── components/ # Vue 组件
│ ├── MapView.vue # 地图组件
│ └── InfoPanel.vue # 信息面板
├── App.vue
├── main.ts
└── env.d.ts # 环境变量类型

## TypeScript 特性

- ✅ 完整的类型定义
- ✅ 接口和枚举
- ✅ 泛型约束
- ✅ 类型守卫
- ✅ 模块化导出

## 快速开始

```bash
npm install
npm run dev
```
