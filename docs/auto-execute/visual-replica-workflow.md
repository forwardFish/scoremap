# scoremap UI 一比一复刻流程

本流程参照 `C:\LYH\Code\AuraCue\docs\auto-execute\visual-replica-workflow.md`，用于逐页对照 `docs/UI/小程序` 中的参考图复刻微信小程序页面。目标不是“差不多”，而是用截图、坐标、字体、颜色、图标和功能路径一起验证。

## 当前策略

- 当前执行方式：批量自检模式。
- Codex 先按页面顺序自行对所有参考图完成一比一自检、修复、截图、标注和差异记录。
- 批量自检阶段不需要逐页询问用户。
- 全部自检达到内部 OK 后，再从头开始逐页交给用户确认。
- 用户确认某一页通过后，才把该页视为最终通过。

## 页面清单

- `C01 首页上传资料` -> `docs/UI/小程序/01-首页-上传资料.png` -> `/pages/index/index`
- `C02 填写孩子信息` -> `docs/UI/小程序/02-填写孩子信息.png` -> `/pages/student-info/index`
- `C03 AI分析中` -> `docs/UI/小程序/03-AI分析中.png` -> `/pages/analysis/index`
- `C04 处理失败` -> `docs/UI/小程序/08-处理失败.png` -> `/pages/failure/index`
- `C05 初判预览/1元半屏支付` -> `docs/UI/小程序/v1.4.3-C05-初判预览-1元半屏支付.png` -> `/pages/preview/index`
- `C07 完整初判/9.9解锁` -> `docs/UI/小程序/v1.4.3-C07-完整初判-9.9解锁.png` -> `/pages/basic-result/index`
- `C07 9.9支付半屏弹窗` -> `docs/UI/小程序/v1.4.3-C07-确认9.9支付半屏弹窗.png` -> `/pages/basic-result/index` 支付弹窗态
- `C10 完整报告核心五卡` -> `docs/UI/小程序/v1.4.3-C10-完整报告-核心五卡.png` -> `/pages/full-report/index`
- `C10 完整报告修复后回写` -> `docs/UI/小程序/v1.4.3-C10-完整报告-修复后回写.png` -> `/pages/full-report/index?state=aiTutorReady`
- `C11 我的报告合并版` -> `docs/UI/小程序/v1.4.3-C11-我的报告-合并版.png` -> `/pages/my/index`
- `C13 第1步错因诊断` -> `docs/UI/小程序/v1.4.3-C13修复抽屉-第1步错因诊断.png` -> `/pages/wrong-question/index`
- `C13 第2步换法讲解` -> `docs/UI/小程序/v1.4.3-C13修复抽屉-第2步换法讲解.png` -> `/pages/ai-tutor/index`
- `C13 第3步验证练习` -> `docs/UI/小程序/v1.4.3-C13修复抽屉-第3步验证练习.png` -> `/pages/ai-exercise/index`
- `C13 第4步掌握判断` -> `docs/UI/小程序/v1.4.3-C13修复抽屉-第4步掌握判断.png` -> `/pages/ai-exercise-feedback/index`

没有独立参考 PNG 的支持页（报告列表、订单、反馈、脚手架页）只做功能和路由验证；不把它们当作一比一视觉通过项。

## 固定工作流

1. 确认参考图、路由、页面状态。
   - 参考图目录：`docs/UI/小程序`
   - 图标目录：`docs/UI/小程序/icon`
   - 小程序页面：`scoremap-miniapp/pages`
   - 视觉证据目录：`docs/auto-execute/evidence/visual-replica`

2. 捕获实际页面截图。
   - 复刻标注统一输出为 `430x800`。
   - 实际截图来自 `npm run visual:scoremap -- --pixel` 或指定页面截图。
   - 交互态页面必须通过对应页面状态或真实点击路径进入，例如 C07 支付弹窗态不能只靠静态截图冒充。

3. 每页必须生成证据。
   - 参考标注图：`<screen>-reference-annotated-rN.png`
   - 实际标注图：`<screen>-actual-rN-annotated.png`
   - 标注左右对比图：`<screen>-annotated-side-by-side-rN.png`
   - 普通左右对比图：`<screen>-side-by-side-rN.png`
   - 坐标差异表：`<screen>-layout-diff-rN.json`
   - 缺失素材清单：`missing-assets-summary.json`

4. 标注必须覆盖主要视觉对象。
   - 顶部状态栏、返回按钮、页面标题、副标题。
   - 主卡片、插画/头像/吉祥物、摘要行、锁定行、价格区、CTA。
   - BottomNav、Home/My 的位置、宽高、字体、图标大小必须重点检查。
   - 复杂卡片还要标出内部按钮、图标、色块、文字区域。

5. 差异表必须比较 `x/y/w/h`。
   - 以参考图缩放到 `430x800` 后的坐标为准。
   - 实际截图也归一化到 `430x800` 后比较。
   - 优先修按钮、卡片、面板、导航、图标等可交互/容器元素。

6. 视觉差异不能只看坐标。
   - 必须比较字体大小、字重、行高、按钮背景色、面板底色、文字颜色。
   - 必须核对 icon 是否来自 `docs/UI/小程序/icon` 或其拷贝，不能用临时自画图标替代。
   - 背景图、插画、吉祥物缺失时，记录到 `missing-assets-summary.json`，由用户补资源。

7. 图标处理规则。
   - 先从 `docs/UI/小程序/icon` 找现有素材。
   - 找到后复制或处理到 `scoremap-miniapp/assets/icons` 或 `scoremap-miniapp/assets/clean-icons`，使用稳定英文文件名。
   - 不要依赖中文/空格文件名作为运行时路径。
   - 不要用临时丑图标替代目录里已有的真实图标。
   - 如果目录里确实没有对应图标，记录缺口，再让用户下载提供。

8. 每轮修复后必须重新截图、重新标注、重新生成差异表。
   - 不凭肉眼说“差不多”。
   - 每页保留最终证据图和 JSON。

9. 页面功能也要验证。
   - 视觉自检 OK 后，点击当前页主按钮，确认能进入下一状态或目标路由。
   - 批量自检阶段可以继续下一页；人工确认阶段必须等用户确认。

## 常用命令

```powershell
npm run visual:scoremap -- all --pixel
npm run visual:replica -- --latest
```

