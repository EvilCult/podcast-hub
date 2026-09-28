# RadioProxy 📻

**RadioProxy** 是一个基于 **Svelte 5**、**SvelteKit** 和 **SQLite** 构建的自托管极简 Podcast (播客) 代理服务器与播放客户端。

它旨在为播客爱好者提供一个无缝的播客收听与管理平台，尤其适用于绕过上游源的跨域（CORS）、防盗链限制，以及为网络受限或老旧的设备/第三方客户端提供**实时音频转码**服务。

---

## ✨ 核心特性

- **➕ 一键订阅与 Apple Podcasts 支持**
  - 支持直接粘贴标准 Podcast RSS Feed 进行订阅。
  - 特别集成了 **Apple Podcasts 智能转换**。你可以直接输入 Apple Podcast 链接（如 `https://podcasts.apple.com/...`），系统会自动请求 iTunes API 解析并转换为其真实的 RSS 订阅源。

- **🔄 高性能实时音频转码 (`/api/transcode`)**
  - 深度整合系统级 `ffmpeg` & `ffprobe` 工具。
  - 通过 `ffprobe` 获取原始音频的时长，并以固定码率自动估算字节数，完美支持生成 `Content-Range`，保证原生浏览器或老旧播放器在转码流中依然能够**自由拖动进度条**。
  - **流式实时转码**：边转码边播放，无缓冲等待。将各种非通用格式或超高码率音频，实时转换为轻量、高兼容性的 **MP3 格式**（libmp3lame，单声道，44.100Hz 采样率，96kbps 码率）。

- **🖼️ 跨域音频与图片直通代理**
  - **音频代理 (`/api/audio`)**：突破某些播客托管商的防盗链及非安全协议限制，支持完整的 `HTTP Range` 续传，保障高保真直通播放。
  - **封面代理 (`/api/image`)**：无缝解决第三方封面图（如荔枝FM等）的跨域防盗链问题，并内置 1 天的客户端浏览器缓存（`Cache-Control`），降低上游带宽消耗。

- **💾 自动保存历史进度与续播**
  - 前端播放器核心基于 **Svelte 5 细粒度响应式系统 (Runes)** 控制，提供细腻的组件级播放交互。
  - 播放器每 **10 秒**自动在后台同步当前音频进度（`pos`），无感持久化至 SQLite 数据库。
  - 下次点击任意单集，秒级恢复到上一次的播放位置，实现**跨设备无缝续播**。

- **📜 无限滚动加载 (Infinite Scroll)**
  - 单集列表采用 `IntersectionObserver` 懒加载分页数据，首屏仅加载必要数据，即使订阅包含数千集的播客，也能保持界面的极速响应。

- **🤖 客户端专属扁平通道 (FlatAPI)**
  - 特别为老旧设备、智能手表（如 Pebble 等）、极简播放终端提供扁平化、无嵌套的精简 API（`/flatapi/radio`）。
  - **内置强制转码重定向**：FlatAPI 返回的所有单集音频地址会自动封装为本地实时转码链接。在受限设备上收听播客时，不仅可以大幅节约流量，还能获得卓越的播放兼容性。

---

## 🛠️ 技术栈

- **前端**：Svelte 5 (Runes), Tailwind CSS, Flowbite-Svelte (UI 组件库), Flowbite-Svelte-Icons
- **后端**：SvelteKit (采用 `@sveltejs/adapter-node` 进行服务端构建与代理)
- **数据库**：SQLite (`better-sqlite3`），默认开启 WAL (Write-Ahead Logging) 模式与外键约束
- **核心工具**：FFmpeg & FFprobe（音频解码、分析、实时流式转码）
- **部署**：Docker (内嵌 Cron 定时任务、FFmpeg 环境)

---

## 📂 项目结构

```txt
/
├── config/                  # 容器配置 (crontab, 启动脚本)
├── data/                    # 本地 SQLite 数据库目录 (database.db)
├── src/
│   ├── lib/
│   │   ├── components/      # 播放器及通用 UI 组件 (Flowbite)
│   │   ├── server/
│   │   │   ├── models/      # 播客与单集的数据模型 (TypeScript)
│   │   │   ├── repos/       # 数据库操作接口层 (better-sqlite3)
│   │   │   └── db.ts        # SQLite 初始连接
│   │   └── stores/          # Svelte 5 全局播放器状态管理
│   └── routes/              # SvelteKit 页面与 API 路由
│       ├── api/             # 播客、历史、音频代理、实时转码 API
│       ├── flatapi/         # 外部设备精简 FlatAPI
│       ├── radio/           # 播客单集展示与删除页面
│       └── history/         # 播放历史记录页面
└── Dockerfile               # 镜像构建配置 (集成 FFmpeg/Node 20)
```

---

## 🔌 API 接口文档

### 1. 播客管理 API

- **获取订阅列表**
  - **GET** `/api/radio`
  - _返回_：返回当前所有已订阅播客的精简列表。

- **添加播客订阅**
  - **POST** `/api/radio`
  - _请求体_：`{ "url": "https://..." }` (支持直接使用 RSS 或 Apple Podcast 详情链接)
  - _流程_：如果是 Apple Podcast，将自动请求 iTunes API 解析转换为真实的 RSS URL，然后抓取解析并入库。

- **删除播客订阅**
  - **DELETE** `/api/radio/[id]`
  - _说明_：会一并清除对应播客的所有单集数据。

- **获取播客单集分页列表**
  - **GET** `/api/radio/[id]/episodes?p=1&ps=10`
  - _参数_：`p` 页码（默认 1），`ps` 页大小（默认 5）

---

### 2. 播放历史与进度 API

- **更新单集播放进度**
  - **POST** `/api/episode/[id]/history`
  - _请求体_：`{ "pos": 120 }`（单位：秒，当前播放的实时位置）

- **获取单集播放进度**
  - **GET** `/api/episode/[id]/history`
  - _返回_：`{ "pos": 120 }`

---

### 3. 音视频与图片代理/转码 API

- **音频直通代理**
  - **GET** `/api/audio?url=<encode_url>`
  - _说明_：中转音频并解决跨域、防盗链、HTTP 等协议限制，完全支持 `Range` 请求。

- **图片缓存代理**
  - **GET** `/api/image?url=<encode_url>`
  - _说明_：中转播客封面，并附带浏览器本地强缓存。

- **实时 MP3 音频转码**
  - **GET** `/api/transcode?url=<encode_url>`
  - _原理_：拉取上游音频流，送入本地 `ffmpeg` 进程实时转码为 MP3（96kbps, 单声道）输出。支持断点拖动。
  - _可选参数_：`sr`（采样率 8000–48000，默认 44100）、`br`（码率 kbps 16–320，默认 96）、`ch`（声道 1–2，默认 1）。FlatAPI 设备端使用 `sr=22050&br=48&ch=1`。

---

### 4. 扁平化API FlatAPI (FOLO-AI-PASSPORT 客户端专用)

- **获取播客平面列表**
  - **GET** `/flatapi/radio`
  - _返回_：`[ { "title": "...", "url": "http://<PUBLIC_HOST>/flatapi/radio/[id]/episodes" } ]`

- **获取播客单集列表（强制转码模式）**
  - **GET** `/flatapi/radio/[id]/episodes?p=1&ps=5`
  - _说明_：返回结果中的音频 `url` 会自动替换为本地 `/api/transcode` 实时转码代理（设备 profile：22050Hz / 48kbps / 单声道），专为极简播放终端量身定制。

- **中文标题点阵位图（设备端渲染）**
  - **GET** `/flatapi/glyph?text=<urlencoded>&px=16`
  - _返回_：`application/octet-stream`，body 为 `[width: u16be][height: u16be][PackBits 压缩的 1bpp 像素]`（MSB 为最左像素，1=墨色，每行补齐到整字节）。

---

## 🚀 本地开发与运行

### 1. 系统要求

由于本项目集成了音频转码和时长分析功能，您的开发环境必须安装 **FFmpeg** 且将其加入到环境变量 `PATH` 中。

- **macOS**：`brew install ffmpeg`
- **Linux (Ubuntu/Debian)**：`sudo apt-get install ffmpeg`

### 2. 创建环境配置文件

在项目根目录下创建一个 `.env` 文件，用于指定本项目的公共可访问 API 基础路径：

```env
PUBLIC_API_URL=http://localhost:3000/api
PUBLIC_HOST=http://localhost:3000
```

### 3. 安装与运行

```sh
# 1. 安装依赖
npm install

# 2. 启动开发服务器 (默认端口 5173，可以通过 vite.config 指定端口)
npm run dev

# 3. 构建生产产物
npm run build

# 4. 本地预览构建产物
npm run preview
```

---

## 🐳 Docker 生产部署

推荐使用 Docker 镜像进行自托管部署，这样您无需在本机上额外配置 node 或 ffmpeg 运行环境。

### 1. 构建镜像

在项目根目录下执行以下命令构建 Docker 镜像：

```sh
docker build -t radioproxy .
```

### 2. 运行容器

建议将本地的 `data` 目录挂载到容器中，以确保 SQLite 数据库不会因容器重启而丢失。

```sh
docker run -d \
  --name radioproxy \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e PUBLIC_API_URL=http://你的服务器IP或域名:3000/api \
  -e PUBLIC_HOST=http://你的服务器IP或域名:3000 \
  --restart unless-stopped \
  radioproxy
```

运行成功后，访问 `http://localhost:3000` 即可开始订阅并收听您的 Podcast！

---

## 📜 许可证

本项目基于 MIT 许可证开源。请尽情享用！
