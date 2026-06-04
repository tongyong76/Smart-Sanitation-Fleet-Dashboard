import {
  Vehicle,
  VehicleStatus,
  BASE_ROUTES,
  FAULT_CODES,
} from "../types/vehicle";

/**
 * 生成随机状态
 */
const getRandomStatus = (): VehicleStatus => {
  const statuses = [
    VehicleStatus.SWEEPING,
    VehicleStatus.SWEEPING,
    VehicleStatus.SWEEPING,
    VehicleStatus.IDLE,
    VehicleStatus.FAULT,
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

/**
 * 生成随机速度
 */
const getRandomSpeed = (): number => {
  return 10 + Math.random() * 15;
};

/**
 * 生成随机电量
 */
const getRandomBattery = (): number => {
  return 60 + Math.random() * 35;
};

/**
 * 生成10辆模拟车辆
 */
export const generateVehicles = (): Vehicle[] => {
  const vehicles: Vehicle[] = [];

  for (let i = 0; i < 10; i++) {
    const routeIndex = i % BASE_ROUTES.length;
    const route = BASE_ROUTES[routeIndex];
    const status = getRandomStatus();

    vehicles.push({
      id: `S${String(i + 1).padStart(3, "0")}`,
      route: route.points,
      currentPointIndex: 0,
      progress: 0,
      speed: route.speed,
      lng: route.points[0][0],
      lat: route.points[0][1],
      heading: 0,
      speedKmh: getRandomSpeed(),
      battery: getRandomBattery(),
      status: status,
      faultCode:
        status === VehicleStatus.FAULT
          ? FAULT_CODES[Math.floor(Math.random() * FAULT_CODES.length)]
          : null,
    });
  }

  return vehicles;
};
