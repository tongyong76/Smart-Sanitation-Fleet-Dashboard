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
type StatusCallback = (
  status: "connected" | "disconnected" | "reconnecting",
) => void;

class MockWebSocket {
  private listeners: Map<string, MessageCallback[]> = new Map();
  private statusListeners: Map<string, StatusCallback[]> = new Map();
  private vehicles: Vehicle[];
  private interval: number | null = null;
  private heartbeatInterval: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = true;
  private simulateDisconnect = false;

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
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emitStatus("connected");

    this.interval = window.setInterval(() => {
      if (!this.simulateDisconnect && this.isConnected) {
        this.updateVehicles();
        this.emitMessage();
      }
    }, 1000);

    // 心跳检测（每5秒发送一次心跳，模拟服务端响应）
    this.heartbeatInterval = window.setInterval(() => {
      if (!this.simulateDisconnect) {
        // 模拟收到心跳响应
        this.emitHeartbeat();
      }
    }, 5000);
  }

  /**
   * 停止模拟数据推送
   */
  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isConnected = false;
    this.emitStatus("disconnected");
  }

  /**
   * 模拟断开连接（用于测试重连）
   */
  public simulateDisconnectEvent(shouldDisconnect: boolean): void {
    this.simulateDisconnect = shouldDisconnect;
    if (shouldDisconnect && this.isConnected) {
      this.isConnected = false;
      this.emitStatus("disconnected");
      this.attemptReconnect();
    } else if (!shouldDisconnect && !this.isConnected) {
      this.reconnect();
    }
  }

  /**
   * 尝试重连（指数退避）
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("达到最大重连次数，停止重连");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`第 ${this.reconnectAttempts + 1} 次重连尝试，延迟 ${delay}ms`);
    this.emitStatus("reconnecting");

    setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * 执行重连
   */
  private reconnect(): void {
    if (this.simulateDisconnect) {
      // 模拟网络恢复
      this.simulateDisconnect = false;
    }

    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emitStatus("connected");
    console.log("重连成功");
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
   * 触发心跳事件
   */
  private emitHeartbeat(): void {
    const callbacks = this.listeners.get("heartbeat") || [];
    callbacks.forEach((cb) =>
      cb({ type: "heartbeat", timestamp: Date.now() } as any),
    );
  }

  /**
   * 触发连接状态事件
   */
  private emitStatus(
    status: "connected" | "disconnected" | "reconnecting",
  ): void {
    const callbacks = this.statusListeners.get("status") || [];
    callbacks.forEach((cb) => cb(status));
  }

  /**
   * 监听消息事件
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
   * 监听连接状态事件
   */
  public onStatus(callback: StatusCallback): void {
    if (!this.statusListeners.has("status")) {
      this.statusListeners.set("status", []);
    }
    this.statusListeners.get("status")!.push(callback);
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

  /**
   * 发送远程指令（模拟）
   */
  public sendCommand(
    vehicleId: string,
    command: string,
    params?: any,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const vehicle = this.vehicles.find((v) => v.id === vehicleId);
      if (!vehicle) {
        resolve(false);
        return;
      }

      // 模拟网络延迟 200-500ms
      setTimeout(
        () => {
          switch (command) {
            case "slow_down":
              vehicle.speedKmh = Math.max(5, vehicle.speedKmh * 0.6);
              break;
            case "resume_speed":
              vehicle.speedKmh = Math.min(25, vehicle.speedKmh / 0.6);
              break;
            case "stop":
              vehicle.speedKmh = 0;
              break;
            case "set_max_speed":
              if (params?.maxSpeed) {
                vehicle.speedKmh = Math.min(params.maxSpeed, vehicle.speedKmh);
              }
              break;
            default:
              console.warn(`未知指令: ${command}`);
          }
          resolve(true);
        },
        200 + Math.random() * 300,
      );
    });
  }
}

// 单例导出
export const mockWS = new MockWebSocket();
