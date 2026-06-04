// 车辆状态枚举
export enum VehicleStatus {
  SWEEPING = "sweeping",
  IDLE = "idle",
  FAULT = "fault",
  CHARGING = "charging",
}

// 车辆数据结构
export interface Vehicle {
  id: string;
  route: [number, number][]; // 路线点集 [经度, 纬度]
  currentPointIndex: number; // 当前路径段索引
  progress: number; // 当前段进度 (0-1)
  speed: number; // 移动速度系数
  lng: number; // 当前经度
  lat: number; // 当前纬度
  heading: number; // 方向角 (度)
  speedKmh: number; // 速度 (km/h)
  battery: number; // 电量百分比
  status: VehicleStatus; // 状态
  faultCode: string | null; // 故障码
}

// 路线配置
export interface RouteConfig {
  points: [number, number][];
  speed: number;
}

// WebSocket 消息类型
export interface WebSocketMessage {
  type: "vehicles_update";
  data: Vehicle[];
  timestamp: number;
}

// 路线预设
export const BASE_ROUTES: RouteConfig[] = [
  {
    points: [
      [121.44, 31.22],
      [121.46, 31.22],
      [121.46, 31.24],
      [121.44, 31.24],
    ],
    speed: 0.0001,
  },
  {
    points: [
      [121.43, 31.23],
      [121.47, 31.23],
    ],
    speed: 0.00015,
  },
  {
    points: [
      [121.45, 31.21],
      [121.45, 31.25],
    ],
    speed: 0.00012,
  },
  {
    points: [
      [121.445, 31.225],
      [121.455, 31.225],
      [121.455, 31.235],
      [121.445, 31.235],
    ],
    speed: 0.0001,
  },
  {
    points: [
      [121.44, 31.22],
      [121.48, 31.26],
    ],
    speed: 0.00013,
  },
];

// 故障码列表
export const FAULT_CODES = ["ERR_001", "ERR_002", "ERR_003"];
