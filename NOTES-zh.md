# ADHD Reader 0.2.0

## 已实现

- 网页默认自动启用；共享 fixation-style emphasis 算法，保持空闲时间分批处理，跳过代码、输入框和可编辑区域。
- 新弹窗支持明暗系统主题、Light / Balanced / Strong 预设、实时句子预览、全局/站点开关、禁用站点管理；默认黑名单为空。
- Alt+Shift+R 切换当前站点；拖动实时预览，松开保存同步设置。
- 本地打包 Mozilla pdf.js 5.4.149 及 worker、许可证。Chrome 151+ MIME handler 优先读取一次性流，保留原 URL，可处理嵌入 PDF；支持开关与原生查看器回退。
- PDF URL 模式支持 HTTP(S)/file，另有本地文件选择。按页提取文本，不上传。扫描件无 OCR，密码保护、过期链接和认证限制可能失败；排版和阅读顺序可能改变。
- Google Docs 有浮动 Focus Reader 按钮和独立阅读面板。文档开始时尝试 MAIN-world 标注提示，Google 可能仅对白名单扩展生效；优先提取已渲染 SVG 标注，失败时用户自行复制粘贴。不修改原文，不承诺画布内加粗。
- 新图标、0.2.0 manifest 与完整打包路径。

## 权限与隐私

storage 保存设置；activeTab 用于用户打开弹窗后识别当前 PDF/Docs URL；HTTP(S)/file 主机权限用于从原地址获取 PDF。URL 模式会再次请求原服务器，可能带认证 cookie；流模式复用 Chrome 响应。无追踪、远程运行代码、开发者服务器或文档上传；剪贴板仅由用户主动粘贴。

## 发布前仍需实际浏览器 QA

遵照本次要求，只做自动化 Node 验证，未驱动 GUI 浏览器。需要验证实际 Chrome MIME 路由和切换、Docs 白名单/标注可用性、长 PDF 和多网站无障碍体验。安装或更新后重新加载 Docs/网页；file URL 获取需要扩展的文件访问开关，本地文件选择不需要。
