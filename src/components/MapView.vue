<template>
  <div class="map-container">
    <baidu-map
      ref="mapRef"
      class="map"
      :center="center"
      :zoom="zoom"
      :scroll-wheel-zoom="true"
      @ready="handleMapReady"
    >
      <!-- 地图控件 -->
      <bm-navigation anchor="BMAP_ANCHOR_TOP_RIGHT"></bm-navigation>
      <bm-map-type
        :map-types="['BMAP_NORMAL_MAP', 'BMAP_SATELLITE_MAP']"
        anchor="BMAP_ANCHOR_TOP_LEFT"
      ></bm-map-type>
    </baidu-map>

    <!-- 热力图控制按钮 -->
    <button class="heatmap-toggle" @click="toggleHeatmap">
      {{ isHeatmapVisible ? "隐藏热力图" : "显示热力图" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { mockWS } from "../services/mockWebSocket";
import { useHeatmap } from "../composables/useHeatmap";
import type { Vehicle, VehicleStatus } from "../types/vehicle";

// 定义地图实例类型
interface BaiduMapInstance {
  map: any;
  BMap: any;
}

// 坐标点类型
interface Point {
  lng: number;
  lat: number;
}

// 百度地图坐标（上海）
// 注意：百度地图使用 BD09 坐标系
const center: Point = { lng: 121.4737, lat: 31.2304 };
const zoom = ref<number>(14);
const mapRef = ref<BaiduMapInstance | null>(null);

let map: any = null;
let BMap: any = null;
const markers = new Map<string, any>(); // 存储车辆Marker
const markerCache = new Map<string, string>(); // 缓存车辆图标标识

// 热力图
const { isHeatmapVisible, initHeatmap, updateHeatmapData, toggleHeatmap } =
  useHeatmap();

// 当前车辆数据（用于热力图更新）
let currentVehicles: Vehicle[] = [];

let pendingVehicles: Vehicle[] | null = null;
let animationFrameId: number | null = null;

/**
 * 根据状态获取图标颜色
 */
const getStatusColor = (status: VehicleStatus): string => {
  switch (status) {
    case "sweeping":
      return "#10B981"; // 绿色-作业中
    case "idle":
      return "#F59E0B"; // 橙色-闲置
    case "fault":
      return "#EF4444"; // 红色-故障
    case "charging":
      return "#3B82F6"; // 蓝色-充电
    default:
      return "#6B7280";
  }
};

/**
 * 获取状态中文文本
 */
const getStatusText = (status: VehicleStatus): string => {
  const statusMap: Record<VehicleStatus, string> = {
    sweeping: "作业中",
    idle: "闲置",
    fault: "故障",
    charging: "充电中",
  };
  return statusMap[status] || status;
};

/**
 * 创建车辆图标（带方向角）
 */
const createVehicleIcon = (vehicle: Vehicle): any => {
  const color = getStatusColor(vehicle.status);
  const size = 32;

  // 创建 canvas 绘制图标
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("无法获取 Canvas 上下文");
  }

  ctx.clearRect(0, 0, size, size);

  // 绘制圆底
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
  ctx.fill();

  // 白色边框
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
  ctx.stroke();

  // 绘制方向箭头
  ctx.fillStyle = "white";
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate((vehicle.heading * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.fill();
  ctx.restore();

  // 中心点
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 3, 0, 2 * Math.PI);
  ctx.fill();

  // 转换为图片
  const url = canvas.toDataURL();
  return new BMap.Icon(url, new BMap.Size(size, size));
};

/**
 * 更新所有车辆Marker
 */
const updateVehicleMarkers = (vehicles: Vehicle[]): void => {
  if (!map) return;

  vehicles.forEach((vehicle) => {
    const point = new BMap.Point(vehicle.lng, vehicle.lat);
    let marker = markers.get(vehicle.id);

    if (marker) {
      // 更新位置
      marker.setPosition(point);

      // 更新图标（如果方向或状态变化）
      const iconKey = `${vehicle.id}_${vehicle.heading}_${vehicle.status}`;
      if (markerCache.get(vehicle.id) !== iconKey) {
        const newIcon = createVehicleIcon(vehicle);
        marker.setIcon(newIcon);
        markerCache.set(vehicle.id, iconKey);
      }
    } else {
      // 创建新Marker
      const icon = createVehicleIcon(vehicle);
      marker = new BMap.Marker(point, { icon: icon });

      // 创建信息窗口
      const infoContent = `
        <div style="padding: 8px; min-width: 160px;">
          <div style="font-weight: bold; margin-bottom: 8px;">${vehicle.id}</div>
          <div>速度: ${vehicle.speedKmh.toFixed(1)} km/h</div>
          <div>电量: ${vehicle.battery.toFixed(0)}%</div>
          <div>状态: ${getStatusText(vehicle.status)}</div>
          ${vehicle.faultCode ? `<div style="color: #EF4444;">故障码: ${vehicle.faultCode}</div>` : ""}
        </div>
      `;
      const infoWindow = new BMap.InfoWindow(infoContent, {
        width: 200,
        height: 120,
      });

      // 添加点击事件
      marker.addEventListener("click", () => {
        map.openInfoWindow(infoWindow, point);
      });

      map.addOverlay(marker);
      markers.set(vehicle.id, marker);
      markerCache.set(
        vehicle.id,
        `${vehicle.id}_${vehicle.heading}_${vehicle.status}`,
      );
    }
  });

  // 移除不存在的车辆
  const existingIds = new Set(vehicles.map((v) => v.id));
  for (const [id, marker] of markers) {
    if (!existingIds.has(id)) {
      map.removeOverlay(marker);
      markers.delete(id);
      markerCache.delete(id);
    }
  }
};

/**
 * 使用 requestAnimationFrame 节流更新 Marker
 */
const throttledUpdateMarkers = (vehicles: Vehicle[]): void => {
  pendingVehicles = vehicles;

  if (animationFrameId !== null) return;

  animationFrameId = requestAnimationFrame(() => {
    if (pendingVehicles) {
      updateVehicleMarkers(pendingVehicles);
      updateHeatmapData(pendingVehicles);
      pendingVehicles = null;
    }
    animationFrameId = null;
  });
};

/**
 * 地图加载完成处理
 */
const handleMapReady = ({
  map: mapInstance,
  BMap: BMapInstance,
}: {
  map: any;
  BMap: any;
}): void => {
  map = mapInstance;
  BMap = BMapInstance;
  mapRef.value = { map: mapInstance, BMap: BMapInstance };

  console.log("地图加载完成，开始模拟数据");

  // 初始化热力图
  setTimeout(() => {
    initHeatmap(map, BMap);
  }, 500);

  // 启动 WebSocket 模拟
  mockWS.start();

  // 监听车辆数据更新
  mockWS.on("message", (msg) => {
    if (msg.type === "vehicles_update") {
      console.log("收到车辆数据更新:", msg.data);
      currentVehicles = msg.data;
      // updateVehicleMarkers(currentVehicles);
      // // 更新热力图
      // updateHeatmapData(currentVehicles);
      // 使用节流更新，而不是直接更新
      throttledUpdateMarkers(currentVehicles);
    }
  });
};

/**
 * 暴露地图实例供父组件调用
 */
const flyToVehicle = (vehicle: Vehicle): void => {
  if (map) {
    const point = new BMap.Point(vehicle.lng, vehicle.lat);
    map.panTo(point);
    map.setZoom(16);
  }
};

/**
 * 绘制矩形围栏
 */
const drawRectangle = (bounds: {
  southWest: { lng: number; lat: number };
  northEast: { lng: number; lat: number };
}): void => {
  if (!map) return;

  const points = [
    new BMap.Point(bounds.southWest.lng, bounds.southWest.lat),
    new BMap.Point(bounds.northEast.lng, bounds.southWest.lat),
    new BMap.Point(bounds.northEast.lng, bounds.northEast.lat),
    new BMap.Point(bounds.southWest.lng, bounds.northEast.lat),
  ];

  const polygon = new BMap.Polygon(points, {
    strokeColor: "#10B981",
    fillColor: "#10B981",
    strokeWeight: 2,
    fillOpacity: 0.2,
  });

  map.addOverlay(polygon);
  return polygon;
};

/**
 * 绘制圆形围栏
 */
const drawCircle = (
  center: { lng: number; lat: number },
  radius: number,
): void => {
  if (!map) return;

  const circle = new BMap.Circle(
    new BMap.Point(center.lng, center.lat),
    radius,
    {
      strokeColor: "#10B981",
      fillColor: "#10B981",
      strokeWeight: 2,
      fillOpacity: 0.2,
    },
  );

  map.addOverlay(circle);
  return circle;
};

// 暴露方法给父组件
defineExpose({
  map,
  flyToVehicle,
  drawRectangle,
  drawCircle,
});

// 组件卸载时取消动画帧
onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  mockWS.stop();
  markers.forEach((marker) => {
    if (map) map.removeOverlay(marker);
  });
});
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}

.heatmap-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.heatmap-toggle:hover {
  background: #10b981;
  border-color: #10b981;
}
</style>
