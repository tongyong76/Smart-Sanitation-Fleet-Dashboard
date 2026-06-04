import { createApp } from "vue";
// 如果 style.css 在项目中暂时缺失，忽略其导入以避免编译错误
// @ts-ignore: missing style import
import "./style.css";
import App from "./App.vue";
import BaiduMap from "vue-baidu-map-next";

const app = createApp(App);
// 注册百度地图组件
app.use(BaiduMap, {
  ak: (import.meta as any).env.VITE_BAIDU_MAP_AK, // 使用环境变量
  v: "3.0", // API 版本
});
app.mount("#app");
