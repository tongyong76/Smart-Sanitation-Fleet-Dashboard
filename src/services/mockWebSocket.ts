import {
  Vehicle,
  WebSocketMessage,
  VehicleStatus,
  FAULT_CODES,
  MAX_TRAJECTORY_POINTS,
} from "../types/vehicle";
import { generateVehicles, updateVehicleTrajectory } from "../models/vehicle";
import { updateVehiclePosition } from "../utils/vehicleMovement";

type MessageCallback = (message: WebSocketMessage) => void;

class MockWebSocket {
  private listeners: Map<string, MessageCallback[]> = new Map();
  private vehicles: Vehicle[];
  private interval: number | null = null;

  constructor() {
    this.vehicles = generateVehicles();
  }

  /**
   * 启动模拟数据推送
   */
  public start(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = window.setInterval(() => {
      this.updateVehicles();
      this.emitMessage();
    }, 1000);
  }

  /**
   * 停止模拟数据推送
   */
  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * 更新所有车辆状态
   */
  private updateVehicles(): void {
    this.vehicles.forEach((vehicle) => {
      // 更新位置
      updateVehiclePosition(vehicle);

      // 记录轨迹（新增）
      updateVehicleTrajectory(vehicle);

      // 模拟随机故障产生（千分之一概率）
      if (Math.random() < 0.001 && vehicle.status !== VehicleStatus.FAULT) {
        vehicle.status = VehicleStatus.FAULT;
        vehicle.faultCode =
          FAULT_CODES[Math.floor(Math.random() * FAULT_CODES.length)];
      }

      // 模拟故障恢复（百分之二概率）
      if (vehicle.status === VehicleStatus.FAULT && Math.random() < 0.02) {
        vehicle.status = VehicleStatus.SWEEPING;
        vehicle.faultCode = null;
      }

      // 随机变化速度（±2 km/h，限制范围 5-25）
      vehicle.speedKmh = Math.max(
        5,
        Math.min(25, vehicle.speedKmh + (Math.random() - 0.5) * 2),
      );

      // 随机变化电量（±0.5%，限制范围 0-100）
      vehicle.battery = Math.max(
        0,
        Math.min(100, vehicle.battery + (Math.random() - 0.5) * 0.5),
      );
    });
  }

  /**
   * 触发消息事件
   */
  private emitMessage(): void {
    const message: WebSocketMessage = {
      type: "vehicles_update",
      data: [...this.vehicles], // 返回副本
      timestamp: Date.now(),
    };

    const callbacks = this.listeners.get("message") || [];
    callbacks.forEach((cb) => cb(message));
  }

  /**
   * 监听事件
   * @param event 事件名
   * @param callback 回调函数
   */
  public on(event: string, callback: MessageCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听
   * @param event 事件名
   * @param callback 回调函数
   */
  public off(event: string, callback: MessageCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 获取当前车辆数据
   */
  public getVehicles(): Vehicle[] {
    return [...this.vehicles];
  }

  /**
   * 获取指定车辆的轨迹
   */
  public getVehicleTrajectory(vehicleId: string): Vehicle["trajectory"] | null {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    return vehicle ? [...vehicle.trajectory] : null;
  }
}

// 单例导出
export const mockWS = new MockWebSocket();
