<template>
  <div class="app">
    <MapView ref="mapViewRef" />
    <InfoPanel
      :vehicles="vehicles"
      @select-vehicle="onSelectVehicle"
      @replay-vehicle="onReplayVehicle"
    />
    <Dashboard :vehicles="vehicles" @select-vehicle="onSelectVehicle" />
    <TrajectoryPlayer
      :visible="playerVisible"
      :selected-vehicle="selectedVehicle"
      :trajectory-points="trajectoryPoints"
      @close="closePlayer"
      @play-point="onPlayPoint"
    />
    <FenceManager
      ref="fenceManagerRef"
      :visible="fenceVisible"
      @close="closeFence"
      @draw-start="onDrawStart"
      @draw-end="onDrawEnd"
      @clear-fences="onClearFences"
      @delete-fence="onDeleteFence"
    />

    <!-- 连接状态指示器 -->
    <div class="connection-status" :class="connectionStatus">
      <span class="status-dot"></span>
      <span class="status-text">{{ connectionStatusText }}</span>
      <button
        v-if="connectionStatus === 'disconnected'"
        @click="manualReconnect"
        class="reconnect-btn"
      >
        手动重连
      </button>
      <button
        v-if="connectionStatus === 'connected'"
        @click="simulateDisconnect"
        class="disconnect-btn"
      >
        模拟断网
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import MapView from "./components/MapView.vue";
import InfoPanel from "./components/InfoPanel.vue";
import Dashboard from "./components/Dashboard.vue";
import TrajectoryPlayer from "./components/TrajectoryPlayer.vue";
import FenceManager from "./components/FenceManager.vue";
import { mockWS } from "./services/mockWebSocket";
import type {
  Vehicle,
  TrajectoryPoint,
  GeoFence,
  FenceType,
} from "./types/vehicle";
import { checkBoundary } from "./utils/geoFence";

const mapViewRef = ref<InstanceType<typeof MapView> | null>(null);
const fenceManagerRef = ref<InstanceType<typeof FenceManager> | null>(null);
const vehicles = ref<Vehicle[]>([]);

// 连接状态
const connectionStatus = ref<"connected" | "disconnected" | "reconnecting">(
  "connected",
);
const connectionStatusText = ref("已连接");

// 轨迹回放状态
const playerVisible = ref(false);
const selectedVehicle = ref<Vehicle | null>(null);
const trajectoryPoints = ref<TrajectoryPoint[]>([]);

// 电子围栏状态
const fenceVisible = ref(false);
let drawMode: FenceType | null = null;
let fences: GeoFence[] = [];

/**
 * 选中车辆时，地图定位到车辆位置
 */
const onSelectVehicle = (vehicle: Vehicle): void => {
  if (mapViewRef.value && mapViewRef.value.flyToVehicle) {
    mapViewRef.value.flyToVehicle(vehicle);
  }
};

/**
 * 轨迹回放
 */
const onReplayVehicle = (vehicle: Vehicle): void => {
  const trajectory = mockWS.getVehicleTrajectory(vehicle.id);
  if (trajectory && trajectory.length > 0) {
    selectedVehicle.value = vehicle;
    trajectoryPoints.value = trajectory;
    playerVisible.value = true;
  }
};

/**
 * 关闭轨迹回放
 */
const closePlayer = (): void => {
  playerVisible.value = false;
  selectedVehicle.value = null;
  trajectoryPoints.value = [];
};

/**
 * 播放轨迹点
 */
const onPlayPoint = (point: TrajectoryPoint): void => {
  if (mapViewRef.value && mapViewRef.value.map) {
    const pointObj = new BMap.Point(point.lng, point.lat);
    mapViewRef.value.map.panTo(pointObj);
  }
};

/**
 * 电子围栏相关方法
 */
const toggleFence = (): void => {
  fenceVisible.value = !fenceVisible.value;
};

const closeFence = (): void => {
  fenceVisible.value = false;
  drawMode = null;
};

const onDrawStart = (type: FenceType): void => {
  drawMode = type;
  // 这里需要实现地图上的绘制交互
  // 简化版：直接创建演示围栏
  createDemoFence();
};

const createDemoFence = (): void => {
  const newFence: GeoFence = {
    id: `fence_${Date.now()}`,
    name: `围栏_${fences.length + 1}`,
    type: FenceType.RECTANGLE,
    center: { lng: 121.455, lat: 31.23 },
    bounds: {
      southWest: { lng: 121.45, lat: 31.225 },
      northEast: { lng: 121.46, lat: 31.235 },
    },
    createdAt: Date.now(),
  };
  fences.push(newFence);
  fenceManagerRef.value?.addFence(newFence);
  drawMode = null;
};

const onDrawEnd = (fence: Omit<GeoFence, "id" | "createdAt">): void => {
  const newFence: GeoFence = {
    ...fence,
    id: `fence_${Date.now()}`,
    createdAt: Date.now(),
  };
  fences.push(newFence);
  fenceManagerRef.value?.addFence(newFence);
};

const onClearFences = (): void => {
  fences = [];
};

const onDeleteFence = (fenceId: string): void => {
  fences = fences.filter((f) => f.id !== fenceId);
};

/**
 * 检查车辆是否越界
 */
const checkAllVehiclesBoundary = (): void => {
  vehicles.value.forEach((vehicle) => {
    fences.forEach((fence) => {
      const isOutside = checkBoundary(
        { lng: vehicle.lng, lat: vehicle.lat },
        fence,
      );
      if (isOutside) {
        fenceManagerRef.value?.addAlert(vehicle.id, fence, {
          lng: vehicle.lng,
          lat: vehicle.lat,
        });
      }
    });
  });
};

/**
 * 连接状态处理
 */
const updateConnectionStatus = (
  status: "connected" | "disconnected" | "reconnecting",
): void => {
  connectionStatus.value = status;
  switch (status) {
    case "connected":
      connectionStatusText.value = "已连接";
      break;
    case "disconnected":
      connectionStatusText.value = "连接断开，尝试重连...";
      break;
    case "reconnecting":
      connectionStatusText.value = "重连中...";
      break;
  }
};

const simulateDisconnect = (): void => {
  mockWS.simulateDisconnectEvent(true);
};

const manualReconnect = (): void => {
  mockWS.simulateDisconnectEvent(false);
  // 手动触发重连逻辑已在 mockWS 内部处理
};

onMounted(() => {
  // 监听车辆数据更新
  mockWS.on("message", (msg) => {
    if (msg.type === "vehicles_update") {
      vehicles.value = msg.data;
      // 检查围栏越界（每秒检查一次）
      checkAllVehiclesBoundary();
    }
  });

  mockWS.onStatus(updateConnectionStatus);
  mockWS.start();
});

onUnmounted(() => {
  mockWS.stop();
});

// 暴露方法供外部调用（如添加围栏按钮）
defineExpose({
  toggleFence,
});
</script>

<style>
.app {
  width: 100%;
  height: 100%;
  position: relative;
}

.connection-status {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 30;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.connection-status.connected .status-dot {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}
.connection-status.disconnected .status-dot {
  background: #ef4444;
}
.connection-status.reconnecting .status-dot {
  background: #f59e0b;
  animation: pulse 1s infinite;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.reconnect-btn,
.disconnect-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 10px;
}
.reconnect-btn:hover {
  background: #10b981;
}
.disconnect-btn:hover {
  background: #ef4444;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
</style>
