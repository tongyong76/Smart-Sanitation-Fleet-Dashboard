/// <reference types="vite/client" />
/// <reference types="@types/bmapgl" />
declare const BMap: any;

interface ImportMetaEnv {
  readonly VITE_BAIDU_MAP_AK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
