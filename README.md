# SnapDict OCR (极简生词扫描本)

这是一个基于 React + Tailwind CSS + Tesseract.js 的纯前端 Web 应用，旨在帮助英语学习者通过摄像头快速扫描书籍或屏幕上的生词，并跳转至权威在线词典。

## ✨ 功能特性

*   **离线 OCR**: 使用 Tesseract.js 在浏览器端直接识别文字，无需后端 API。
*   **极简设计**: 沉浸式扫描界面，原生 App 般的流畅体验。
*   **多词典支持**: 支持 Cambridge, Merriam-Webster, Longman 一键跳转。
*   **历史记录**: 自动保存查询历史，支持手动添加和编辑单词。
*   **响应式布局**: 完美适配桌面端（侧边栏模式）和移动端（全屏模式）。

## 🛠️ 技术栈

*   **Core**: React 18+, TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS (CDN)
*   **OCR Engine**: Tesseract.js v5 (CDN)

## 🚀 本地开发 (Local Development)

在本地运行项目进行开发或调试：

1.  **环境要求**: 请确保已安装 [Node.js](https://nodejs.org/) (建议 v18 或更高版本)。
2.  **安装依赖**:
    ```bash
    npm install
    ```
3.  **启动开发服务器**:
    ```bash
    npm run dev
    ```
    打开浏览器访问控制台显示的地址 (通常是 `http://localhost:5173`)。

## 📦 构建与部署 (Build & Deploy)

本项目是纯静态应用，构建后生成的静态文件可部署到任何 Web 服务器。

### 1. 构建项目

运行以下命令将 TypeScript 和 React 代码编译为浏览器可识别的静态资源：

```bash
npm run build
```

*   构建完成后，项目根目录下会生成一个 **`dist`** 文件夹。
*   **`dist` 文件夹即为最终产物**，里面包含了优化后的 `index.html`、JS 和 CSS 文件。

### 2. 部署步骤

将 **`dist`** 文件夹内的**所有内容**上传到您的静态资源服务器即可。

**推荐托管平台 (免费且自动 HTTPS):**
*   **Vercel** (推荐): 导入 GitHub 仓库即可自动部署。
*   **Netlify**: 拖拽 `dist` 文件夹即可上线。
*   **GitHub Pages**: 设置 Source 为构建后的分支。

**传统服务器 (Nginx/Apache):**
将 `dist` 目录内容上传至服务器目录 (如 `/var/www/snapdict`)。

由于项目已配置 `base: './'`, **支持部署到子目录** (例如 `https://your-site.com/apps/snapdict/`)。

### 3. ⚠️ 关键注意事项 (HTTPS)

**非常重要：摄像头权限要求**

由于浏览器安全策略，调用摄像头 (`navigator.mediaDevices.getUserMedia`) **必须** 在 **安全上下文 (Secure Context)** 下运行。这意味着：

*   **线上环境**: 必须使用 **HTTPS** 协议 (如 `https://your-domain.com`)。如果使用 HTTP，摄像头将无法启动。
*   **本地环境**: `localhost` 或 `127.0.0.1` 被视为安全上下文，可以使用 HTTP 调试。

## 📂 目录结构

```
snapdict/
├── dist/               # 构建产出目录 (部署用这个)
├── src/                # 源代码目录 (如果你使用了 Vite 模版结构)
│   ├── components/     # React 组件 (Scanner, Sidebar, DetailView)
│   ├── services/       # 业务逻辑 (storage.ts)
│   ├── types.ts        # TypeScript 类型定义
│   └── ...
├── index.html          # 入口 HTML
├── package.json        # 项目依赖配置
├── tsconfig.json       # TypeScript 配置
├── vite.config.ts      # Vite 构建配置
└── README.md           # 说明文档
```

## 常见问题

**Q: 为什么点击扫描没反应？**
A: 请检查浏览器控制台 (F12)。如果是 "Permission denied" 或 "Cannot read properties of undefined (reading 'getUserMedia')", 通常是因为没有使用 HTTPS 访问。

**Q: 为什么 index.html 打开是空白的？**
A: 源码中的 `index.html` 引用了 `.tsx` 文件，浏览器无法直接运行。请务必执行 `npm run build`，然后使用生成的 `dist/index.html`。