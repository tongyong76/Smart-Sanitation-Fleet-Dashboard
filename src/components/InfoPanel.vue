<template>
  <div class="info-panel">
    <div class="panel-header">
      <h3>🚛 车队状态总览</h3>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ totalVehicles }}</div>
        <div class="stat-label">总车辆</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #10b981">{{ sweepingCount }}</div>
        <div class="stat-label">作业中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #f59e0b">{{ idleCount }}</div>
        <div class="stat-label">闲置</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #ef4444">{{ faultCount }}</div>
        <div class="stat-label">故障</div>
      </div>
    </div>

    <div class="avg-speed">
      <span>📊 平均速度</span>
      <strong>{{ avgSpeed.toFixed(1) }} km/h</strong>
    </div>

    <div class="avg-battery">
      <span>🔋 平均电量</span>
      <div class="battery-bar">
        <div class="battery-fill" :style="{ width: avgBattery + '%' }"></div>
      </div>
      <strong>{{ avgBattery.toFixed(0) }}%</strong>
    </div>

    <div class="vehicle-list">
      <div class="list-header">📋 车辆列表</div>
      <div class="list-items">
        <div
          v-for="vehicle in vehicles"
          :key="vehicle.id"
          class="vehicle-item"
          :class="{ 'is-fault': vehicle.status === 'fault' }"
          @click="handleSelectVehicle(vehicle)"
        >
          <span class="vehicle-id">{{ vehicle.id }}</span>
          <span class="vehicle-status" :class="vehicle.status">
            {{ getStatusText(vehicle.status) }}
          </span>
          <span class="vehicle-speed"
            >{{ vehicle.speedKmh.toFixed(0) }} km/h</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Vehicle, VehicleStatus } from "../types/vehicle";

const props = defineProps<{
  vehicles: Vehicle[];
}>();

const emit = defineEmits<{
  (e: "select-vehicle", vehicle: Vehicle): void;
}>();

// 统计数据
const totalVehicles = computed(() => props.vehicles.length);
const sweepingCount = computed(
  () => props.vehicles.filter((v) => v.status === "sweeping").length,
);
const idleCount = computed(
  () => props.vehicles.filter((v) => v.status === "idle").length,
);
const faultCount = computed(
  () => props.vehicles.filter((v) => v.status === "fault").length,
);

// 平均速度
const avgSpeed = computed(() => {
  if (props.vehicles.length === 0) return 0;
  const sum = props.vehicles.reduce((acc, v) => acc + v.speedKmh, 0);
  return sum / props.vehicles.length;
});

// 平均电量
const avgBattery = computed(() => {
  if (props.vehicles.length === 0) return 0;
  const sum = props.vehicles.reduce((acc, v) => acc + v.battery, 0);
  return sum / props.vehicles.length;
});

/**
 * 获取状态中文文本
 */
const getStatusText = (status: VehicleStatus): string => {
  const statusMap: Record<VehicleStatus, string> = {
    sweeping: "作业",
    idle: "闲置",
    fault: "故障",
    charging: "充电",
  };
  return statusMap[status] || status;
};

/**
 * 处理车辆选择
 */
const handleSelectVehicle = (vehicle: Vehicle): void => {
  emit("select-vehicle", vehicle);
};
</script>

<style scoped>
.info-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 280px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  color: white;
  font-size: 14px;
  z-index: 10;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

.avg-speed,
.avg-battery {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.battery-bar {
  flex: 1;
  margin: 0 12px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.battery-fill {
  height: 100%;
  background: #10b981;
  border-radius: 3px;
  transition: width 0.3s;
}

.vehicle-list {
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.list-header {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.vehicle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.vehicle-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.vehicle-item.is-fault {
  background: rgba(239, 68, 68, 0.2);
  border-left: 2px solid #ef4444;
}

.vehicle-id {
  font-weight: bold;
  font-size: 12px;
}

.vehicle-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.vehicle-status.sweeping {
  background: #10b981;
}
.vehicle-status.idle {
  background: #f59e0b;
}
.vehicle-status.fault {
  background: #ef4444;
}

.vehicle-speed {
  font-size: 11px;
  font-family: monospace;
}

.vehicle-list::-webkit-scrollbar {
  width: 4px;
}
.vehicle-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}
.vehicle-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}
</style>
