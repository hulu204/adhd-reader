# 竞品差评 → 功能对照（Bionic Reading 官方扩展）

来源：Chrome Web Store 评分约 **2.4 / 5**（约 317 条评价，约一半是 1 星）；[chrome-stats 评论文本](https://chrome-stats.com/d/kdfkejelgkdjgfoolngegkhkiecmlflj/reviews)；[ExtScope](https://extscope.org/extension/kdfkejelgkdjgfoolngegkhkiecmlflj)；Reddit（r/chrome_extensions、r/TwoXADHD 等对 PDF/扩展失效的讨论）；X 上相关讨论较少，未见可引用的官方扩展差评原文。竞品 ID：`kdfkejelgkdjgfoolngegkhkiecmlflj`，上次更新约 2024-06。

**商标注意：** 商店文案与代码中不得使用 “Bionic / Bionic Reading®”。

## 差评主题 → 功能表

| 用户抱怨（归纳） | 差评原意摘要 | 状态 | 我们的做法 |
| --- | --- | --- | --- |
| 每页要手动点图标、还要刷新才生效 | 大量 1–2 星：“Not working”“Clicked… nothing”；也有人教：点插件再刷新，**每一页都要重复** | **已做** | 打开网页自动生效；`Alt+Shift+R` 按站点开关；全局开关 |
| “阅读视图”改版式：灰罩、图坏、内容丢失 | Absolute trash：不是改原页文字，而是脏 reader mode，图灰度、排版乱、内容缺 | **已做** | 原地改文字节点；不进独立阅读壳；输入框/代码等跳过 |
| 不支持 PDF | 多条明确要 PDF；官方 viewer 隔离，扩展改不动内置 PDF 页 | **发版前必做** | 自带 PDF 阅读页（抽文本 + 强调）；弹窗一键打开；诚实说明无法改 Chrome 内置 PDF 画布 |
| 不支持 / 搞烂 Google Docs | 需全选再点；段落合成一大段；Docs 已 canvas 化 | **发版前必做** | Docs 上提供 Focus 阅读层（抽文本再强调）；说明无法在 canvas 上原地加粗 |
| 部分网站完全不生效 / 不稳定 | “works on some sites”；动态站、邮件站常挂 | **部分已做 / 继续加强** | 空闲分批 + MutationObserver；弹窗可管理站点黑名单；常见易坏站默认或可一键排除 |
| 没有说明怎么用 | “No instructions”；评分被“不会用”拖垮 | **发版前必做** | 弹窗内短说明 + README；自动生效写进商店描述 |
| 两年不更新 | Store 约 2024-06 后无更新 | **进行中** | 2026 新建 MV3，持续迭代 |
| 想调强度 / 颜色等 | 有人夸自定义，也有人觉得默认加粗过多 | **部分已做 / UI 加强** | Light / Balanced / Strong 预设 + 实时预览 + 深浅色弹窗 |
| 隐私 / 上传顾虑（对比其他阅读工具） | 官方声明处理 website content；社区更认本地处理 | **已做** | 仅 `storage`；不上传正文；PRIVACY.md |
| 移动端 / 其他平台 | Reddit/评价偶发要手机版 | **以后再说** | 先做好桌面 Chrome |
| EPUB / Kindle 等 | 官方 App 有，扩展没有 | **以后再说** | 超出 v0.2 |
| Shadow DOM / iframe 内文字 | 技术向剩余问题 | **以后再说** | REVIEW.md 已记录 |

## 发版前必做（Must）

1. PDF：扩展内阅读器 + 弹窗入口；文档写清 Chrome 内置 PDF 限制  
2. Google Docs：Focus 阅读层 + 限制说明  
3. 弹窗：预设、实时预览、深浅色、站点黑名单管理、简短用法  
4. 图标与文案：突出 ADHD / Focus / Speed Reading，禁用 bionic 商标词  

## 以后再说（Later）

- 原地改 Chrome PDF 内置 viewer（浏览器不允许）  
- Docs canvas 原地加粗（需 Google 白名单，不可靠）  
- iframe / closed Shadow DOM  
- EPUB、Kindle、移动端  
- 音节级 fixation、词性高亮等高级排版  

## 对我们产品的结论

用户要的不是“又一个脏阅读模式”，而是：**原页自动生效、不毁版式、能开 PDF/Docs、设置好看且跟手、坏站能关掉。** 本仓库按此优先级实现。
