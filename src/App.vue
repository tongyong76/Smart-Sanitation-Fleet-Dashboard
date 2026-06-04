<template>
  <MapView ref="mapViewRef" />
  <InfoPanel :vehicles="vehicles" @select-vehicle="onSelectVehicle" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import MapView from "./components/MapView.vue";
import InfoPanel from "./components/InfoPanel.vue";
import { mockWS } from "./services/mockWebSocket";
import type { Vehicle } from "./types/vehicle";

const mapViewRef = ref<InstanceType<typeof MapView> | null>(null);
const vehicles = ref<Vehicle[]>([]);

/**
 * 选中车辆时，地图定位到车辆位置
 */
const onSelectVehicle = (vehicle: Vehicle): void => {
  if (mapViewRef.value && mapViewRef.value.flyToVehicle) {
    mapViewRef.value.flyToVehicle(vehicle);
  }
};

onMounted(() => {
  // 监听车辆数据更新
  mockWS.on("message", (msg) => {
    if (msg.type === "vehicles_update") {
      vehicles.value = msg.data;
    }
  });
});

onUnmounted(() => {
  mockWS.stop();
});
</script>
