import { ref } from "vue";
import type { Vehicle } from "../types/vehicle";

// 声明全局的 BMapLib 类型
declare global {
  interface Window {
    BMapLib: any;
  }
}

// 热力图数据点
export interface HeatmapPoint {
  lng: number;
  lat: number;
  count: number; // 作业密度权重
}

export function useHeatmap() {
  const heatmapOverlay = ref<any>(null);
  const isHeatmapVisible = ref(true);

  /**
   * 初始化热力图
   * @param map 百度地图实例
   * @param BMap 百度地图API
   */
  const initHeatmap = (map: any, BMap: any): void => {
    if (!map || !window.BMapLib) {
      console.warn("热力图库未加载完成");
      return;
    }

    // 创建热力图实例
    heatmapOverlay.value = new window.BMapLib.HeatmapOverlay({
      radius: 50, // 热力图半径（像素）
      opacity: 0.6, // 透明度
      gradient: {
        // 颜色渐变
        0.2: "rgb(0, 255, 0)",
        0.4: "rgb(0, 255, 255)",
        0.6: "rgb(255, 255, 0)",
        0.8: "rgb(255, 128, 0)",
        1.0: "rgb(255, 0, 0)",
      },
    });

    map.addOverlay(heatmapOverlay.value);
    console.log("热力图初始化完成");
  };

  /**
   * 更新热力图数据（基于作业中的车辆位置）
   * @param vehicles 车辆列表
   */
  const updateHeatmapData = (vehicles: Vehicle[]): void => {
    if (!heatmapOverlay.value) return;

    // 筛选出作业中的车辆
    const sweepingVehicles = vehicles.filter((v) => v.status === "sweeping");

    // 构建热力图数据点（每个作业车辆算1个点，可根据速度/作业强度调整权重）
    const points: HeatmapPoint[] = sweepingVehicles.map((vehicle) => ({
      lng: vehicle.lng,
      lat: vehicle.lat,
      count: Math.min(10, Math.floor(vehicle.speedKmh / 5) + 1), // 速度越快，权重越高
    }));

    // 更新热力图
    heatmapOverlay.value.setDataSet({ data: points, max: 10 });
  };

  /**
   * 切换热力图显示/隐藏
   */
  const toggleHeatmap = (): void => {
    console.log(
      "切换热力图显示状态",
      heatmapOverlay.value,
      isHeatmapVisible.value ? "隐藏" : "显示",
    );
    if (!heatmapOverlay.value) return;

    if (isHeatmapVisible.value) {
      heatmapOverlay.value.hide();
    } else {
      heatmapOverlay.value.show();
    }

    isHeatmapVisible.value = !isHeatmapVisible.value;
  };

  /**
   * 显示热力图
   */
  const showHeatmap = (): void => {
    if (heatmapOverlay.value) {
      heatmapOverlay.value.show();
      isHeatmapVisible.value = true;
    }
  };

  /**
   * 隐藏热力图
   */
  const hideHeatmap = (): void => {
    if (heatmapOverlay.value) {
      heatmapOverlay.value.hide();
      isHeatmapVisible.value = false;
    }
  };

  return {
    heatmapOverlay,
    isHeatmapVisible,
    initHeatmap,
    updateHeatmapData,
    toggleHeatmap,
    showHeatmap,
    hideHeatmap,
  };
}
