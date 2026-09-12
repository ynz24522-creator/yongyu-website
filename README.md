# 永裕光电官网 / Yongyu Optoelectronics Website

> 广东永裕光电有限公司官方网站 —— 纯静态、中英双语、零依赖。
> Static, dependency-free bilingual corporate website for Guangdong Yongyu Optoelectronics Co., Ltd.

## 线上地址 / Live site

- <https://ynz24522-creator.github.io/yongyu-website/>
- 仓库 / Repository: <https://github.com/ynz24522-creator/yongyu-website>

## 特性 / Highlights

| 中文 | English |
| --- | --- |
| 8 个静态页面，双击 `index.html` 即可浏览，无需构建、无外部 CDN | 8 static pages, open `index.html` directly - no build step, no external CDN |
| 中英双语切换（默认中文，`?lang=en` 可分享英文链接） | Chinese / English switch (Chinese by default, share with `?lang=en`) |
| 收录画册 V0 全部参数：23 个封装系列、35 张参数表、131 个型号、268 行数据 | Complete catalog V0 data: 23 package series, 35 specification tables, 131 part numbers, 268 rows |
| 产品中心支持按家族 / 发光颜色筛选与型号搜索 | Product center with family / colour filters and part-number search |
| 询价清单：逐行加入型号、填数量备注、一键生成邮件 | Inquiry list: add part numbers, set quantity and notes, generate an email |
| 响应式布局，手机端参数表转为卡片流；支持打印 | Responsive layout with card-style tables on phones; print friendly |

## 页面 / Pages

| 文件 File | 中文 | English |
| --- | --- | --- |
| `index.html` | 首页 | Home |
| `about.html` | 关于我们 | About |
| `products.html` | 产品中心 | Products |
| `product.html` | 系列详情页（`?series=0201`） | Series detail (`?series=0201`) |
| `applications.html` | 应用领域 | Applications |
| `strength.html` | 实力与认证 | Strength & certification |
| `contact.html` | 联系我们 | Contact |
| `inquiry.html` | 询价清单 | Inquiry list |

## 本地预览 / Local preview

直接用浏览器打开 `index.html`；或用任意静态服务器（例如在仓库根目录执行 `python3 -m http.server`）后访问 `http://localhost:8000/`。

Open `index.html` in a browser, or serve the folder with any static server.

> 提示：`file://` 协议下部分浏览器会禁用 `localStorage`，此时语言偏好与询价清单只在当前页面内有效；部署到 http(s) 后功能完整。代码已做降级处理，不会报错。

## 目录结构 / Repository layout

```
.
├── index.html … inquiry.html      8 个页面 / the 8 pages
├── assets/
│   ├── css/style.css              全站样式与设计变量 / styles + design tokens
│   ├── js/product-data.js         产品与公司数据 / product + company data
│   ├── js/i18n.js                 中英文字典 / bilingual dictionary
│   ├── js/app.js                  渲染与交互 / rendering + interactions
│   ├── img/                       图片（含 manifest.json 来源映射）
│   └── download/                  可下载的画册 PDF / catalog PDF
├── docs/                          使用说明与数据说明 / maintenance + data notes
├── .nojekyll                      GitHub Pages：跳过 Jekyll 处理
└── .gitignore / .gitattributes
```

## 内容维护 / Where to edit

| 想改什么 What to change | 改哪里 Where |
| --- | --- |
| 界面文案 UI copy | `assets/js/i18n.js`（`zh` / `en` 字典，页面用 `data-i18n` 引用） |
| 产品参数 Product specifications | `assets/js/product-data.js` → `series[].tables[].rows` |
| 联系方式 / 历程 / 认证 / 简介 Contact, history, certifications, profile | `assets/js/product-data.js` → `contacts` / `milestones` / `certifications` / `company` |
| 图片 Images | 覆盖 `assets/img/` 下同名文件 Replace same-named files |
| 配色与视觉 Visual tokens | `assets/css/style.css` 顶部 `:root` 变量 |

## 数据来源与声明 / Data provenance

- 全部参数逐条转录自《永裕光电产品画册 (V0)》，未做单位换算或推断；缺值在页面上显示为「—」。
- All values are transcribed verbatim from the Product Catalog (V0) without conversion or inference.
- 画册中存在少量疑似笔误（如个别型号重复、两行数值与颜色标签互换、拼写错误等），仓库按原样呈现，清单见 [`docs/画册数据与笔误说明.md`](docs/画册数据与笔误说明.md)。
- 画册目录列出的照明 LED 与光传感在正文中没有参数页，站点按「开发中」呈现，未虚构数据。

## 部署 / Deployment

仓库使用 **GitHub Pages 分支发布**，无需 GitHub Actions：

1. 仓库 → Settings → Pages
2. Source 选择 `Deploy from a branch`
3. Branch 选择 `main`，目录选择 **`/ (root)`**
4. 保存后约 1 分钟，访问 <https://ynz24522-creator.github.io/yongyu-website/>

因为站点全部使用相对路径，也可以把仓库文件（不含 `.git/`）直接上传到任意虚拟主机或 CDN，无需任何服务端配置。

## 更新流程 / Update workflow

```bash
git add -A
git commit -m "描述本次修改"
git push
```

推送后 GitHub Pages 会自动重新发布。 

## 浏览器支持 / Browser support

最新版 Chrome / Edge / Safari / Firefox 及移动端浏览器。站点不使用外部字体与第三方脚本，离线打开也能正常显示。

## 文档 / Documentation

- [`docs/使用说明.md`](docs/使用说明.md) —— 页面结构、维护位置、从画册重新生成数据的流程
- [`docs/画册数据与笔误说明.md`](docs/画册数据与笔误说明.md) —— 数据口径与画册疑似笔误清单

## 版权 / Copyright

© 2026 广东永裕光电有限公司 (Guangdong Yongyu Optoelectronics Co., Ltd). 保留所有权利。仓库与站点内容（含产品参数、图片、画册）归公司所有，未经许可请勿再分发或商用。

All rights reserved. Contents of this repository (including product data, images and the catalog) belong to the company and may not be redistributed or used commercially without permission.
