# AI 提分决策 PRD（MVP v1.2｜C 端页面流程修订版）

> 文档版本：v1.2
> 修改日期：2026-05-22
> 产品定位：AI 提分决策
> 本版修改依据：结合当前小程序 UI 页面稿，修正 v1.1 中“先支付 1 元再分析”的流程，改为更适合转化的“先生成初判预览，再 1 元解锁完整初判，再 9.9 元解锁完整提分报告”。
> 当前阶段明确不做：机构创建活动、机构后台线索管理、多机构 SaaS、复杂 CRM、活动二维码、多渠道统计、老师解读版、长期学习档案、多学科深度系统、真实订阅会员体系。

---

## 0. 本次修改重点

### 0.1 为什么要改

原 v1.1 的核心流程是：

```text
填写孩子基础信息
↓
上传资料
↓
支付 1 元
↓
AI 分析
↓
查看 AI 提分初判
↓
支付 9.9 元
↓
查看完整 AI 提分决策
```

但当前 UI 页面已经变成：

```text
首页上传资料
↓
AI 正在分析
↓
生成初判报告预览
↓
用户看到部分初判内容
↓
支付 1 元解锁完整初判
↓
查看 AI 初判结果
↓
支付 9.9 元解锁完整分析
↓
查看完整提分报告 / PDF 式报告
```

因此，PRD 必须跟页面一致，否则开发时会出现以下问题：

1. 页面有“初判报告预览”，但需求文档没有定义；
2. 页面有“确认 1 元初判”，但原流程是“先付 1 元再分析”；
3. 页面有“稍后查看”和“刷新进度”，但原文档没有完整定义异步任务和报告列表；
4. 页面有“处理失败”专页，但原文档只有简单异常流程；
5. 页面有“我的 / 我的报告 / 订单记录 / 购买记录”，但原文档没有明确页面范围；
6. 页面有“PDF 式完整报告 / 下载 PDF”，但原文档把 PDF 下载列为不做，存在冲突；
7. 页面出现 Pro 会员卡，但原文档明确不做会员，必须调整成“权益占位”或删除。

### 0.2 本版最终确定的 MVP 主流程

```text
用户进入首页
↓
上传孩子资料
↓
系统创建诊断订单
↓
AI 进行轻量初判分析
↓
用户看到初判报告预览
↓
用户支付 1 元
↓
解锁完整 AI 初判结果
↓
用户支付 9.9 元
↓
解锁完整 AI 提分报告
↓
用户查看报告内容 / 保存报告 / 可选下载 PDF
↓
用户提交反馈
↓
系统沉淀订单、资料、支付、报告和反馈数据
```

### 0.3 三层报告权益定义

本版本将报告拆成三层，避免“1 元版”和“9.9 元版”表达混乱。

| 层级 | 名称 | 是否付费 | 用户看到什么 | 核心目的 |
|---|---:|---:|---|---|
| L0 | 初判报告预览 | 免费 | 只展示部分报告内容，下半部分模糊 / 锁定 | 让用户先看到价值，提高 1 元转化 |
| L1 | 完整 AI 初判 | 1 元 | 展示完整初判：一句话判断、可信度、主要丢分点、优先补弱点、初步建议 | 验证家长是否愿意为 AI 判断付费 |
| L2 | 完整 AI 提分报告 | 9.9 元 | 展示详细丢分地图、补弱顺序、7 天建议、下一步建议、PDF 式报告 | 验证完整提分决策价值 |

### 0.4 和 v1.1 相比的关键改动

1. **首页不再是长落地页**，改为小程序首页：上传入口 + 样例 + 我的报告 + 最近报告。
2. **基础信息填写不再强制前置**，优先由 AI 从资料中识别年级、学科、考试类型；识别失败时再让用户补充。
3. **新增“AI 分析中”页面**，支持进度环、步骤状态、稍后查看、刷新进度。
4. **新增“初判报告预览”页面**，支持报告半遮罩、锁定区域、1 元解锁按钮。
5. **新增“确认 1 元初判”页面**，作为支付确认页。
6. **新增“AI 初判结果”页面**，展示 1 元解锁后的完整初判结果，并引导 9.9 元升级。
7. **新增“9.9 元解锁完整分析”页面**，展示完整权益和支付按钮。
8. **新增“完整提分报告”入口页与 PDF 式完整报告页**。
9. **新增“处理失败”页面**，包括重新开始分析、重新上传资料、返回首页。
10. **新增“我的”页面**，用于报告入口、订单记录、购买记录、帮助反馈。
11. **调整“PDF 下载”范围**：MVP 必须支持“PDF 式报告展示”；真实 PDF 下载如按钮展示则必须实现，否则按钮应隐藏。
12. **调整“会员”范围**：MVP 不做真实订阅会员。页面中的 Pro 卡只能作为“内测权益 / 历史权益 / 未来占位”，不参与主流程。

---

## 1. 产品定位

### 1.1 产品名称

```text
AI 提分决策
```

### 1.2 一句话定位

> AI 提分决策是一款面向家长的学习资料诊断与提分路径决策工具。家长上传孩子真实试卷、错题或成绩单后，系统基于资料生成 AI 初判和完整提分报告，帮助家长看清主要丢分点、优先补弱点、7 天行动建议和下一步学习决策。

### 1.3 产品核心价值

家长真正关心的不是“这道题怎么做”，而是：

```text
孩子到底卡在哪里？
为什么一直丢分？
先补什么最有效？
哪些分有机会先追回？
要不要找老师讲？
接下来 7 天怎么安排？
```

所以产品核心不是“错题解析”，而是“提分决策”。

### 1.4 本产品不是什么

AI 提分决策不是：

1. 不是普通拍照搜题；
2. 不是简单错题解析工具；
3. 不是纯 AI 报告生成器；
4. 不是在线教学平台；
5. 不是保证提分工具；
6. 不是机构线索管理后台；
7. 不是 CRM；
8. 不是老师替代品；
9. 不是完整学习档案系统；
10. 不是订阅制会员产品。

---

## 2. MVP 阶段目标

### 2.1 第一目标：验证家长是否愿意上传真实资料

需要验证：

```text
家长是否愿意上传孩子真实试卷 / 错题 / 成绩单？
家长是否接受 AI 基于资料做学习判断？
家长是否愿意等待 10-30 秒生成初判？
```

### 2.2 第二目标：验证 1 元初判转化

需要验证：

```text
家长看到初判预览后，是否愿意支付 1 元解锁完整初判？
1 元付费是否能过滤纯白嫖用户？
1 元初判是否让家长觉得“至少值”？
```

### 2.3 第三目标：验证 9.9 元完整报告转化

需要验证：

```text
家长看完 1 元完整初判后，是否愿意继续支付 9.9 元？
家长是否觉得完整报告能帮自己做下一步学习决策？
家长是否愿意保存 / 转发 / 再次上传资料？
```

### 2.4 第四目标：沉淀后续 B 端合作数据

需要沉淀：

```text
真实上传资料
年级 / 学科 / 考试类型
资料质量
初判预览转化率
1 元支付转化率
9.9 元支付转化率
AI 失败率
用户反馈
报告满意度
干预等级分布
```

这些数据将来用于和教培机构合作，而不是 MVP 第一阶段直接做机构端。

---

## 3. 目标用户与场景

### 3.1 目标用户

MVP 主用户是家长，不是学生，也不是机构。

优先级：

1. 初一学生家长；
2. 初二学生家长；
3. 小升初衔接阶段家长；
4. 初三数学薄弱学生家长；
5. 高一数学衔接困难学生家长。

### 3.2 第一阶段主打学科

MVP 第一阶段默认主打：

```text
数学
```

原因：

1. 家长对数学提分敏感；
2. 数学错题、试卷、成绩单更容易结构化分析；
3. 数学更容易输出“主要丢分点 + 优先补弱点 + 7 天建议”；
4. 初一、初二数学分化明显，更容易形成付费动机。

### 3.3 第一阶段主力场景

```text
初一数学月考后诊断
初二数学分化诊断
小升初数学衔接诊断
错题专项分析
成绩单初步分析
```

---

## 4. MVP 产品范围

### 4.1 必做闭环

```text
首页
↓
上传资料
↓
AI 分析中
↓
初判报告预览
↓
1 元解锁完整初判
↓
AI 初判结果
↓
9.9 元解锁完整分析
↓
完整提分报告
↓
保存报告 / 反馈
↓
我的报告中可再次查看
```

### 4.2 MVP 必做功能

| 模块 | 是否必做 | 说明 |
|---|---|---|
| 首页 | 必做 | 上传入口、样例、我的报告、最近报告 |
| 上传资料 | 必做 | 支持图片，PDF 可作为 P0.5 |
| 隐私授权 | 必做 | 上传前必须确认 |
| 订单创建 | 必做 | 上传后创建诊断订单 |
| AI 轻量初判分析 | 必做 | 用于生成初判预览 |
| AI 分析进度页 | 必做 | 展示进度、步骤、稍后查看、刷新进度 |
| 初判报告预览页 | 必做 | 展示部分报告，下半部分锁定 |
| 1 元支付 | 必做 | 解锁完整 AI 初判 |
| AI 初判结果页 | 必做 | 展示完整初判，承接 9.9 元升级 |
| 9.9 元支付 | 必做 | 解锁完整提分报告 |
| 完整提分报告页 | 必做 | 展示完整报告内容 |
| PDF 式报告展示 | 必做 | 页面视觉要像完整报告 / 纸质报告 |
| 处理失败页 | 必做 | 重新分析、重新上传、返回首页 |
| 我的页面 | 必做 | 至少可进入我的报告和继续新建分析 |
| 我的报告列表 | 必做 | 支持查看历史报告和分析中报告 |
| 用户反馈 | 必做 | 有帮助 / 不准确 / 看不懂等 |
| 数据入库 | 必做 | 用户、订单、上传、支付、报告、反馈 |
| 数据导出 | 必做 | 可以数据库或脚本导出，不做复杂后台 |

### 4.3 MVP 不做

以下内容不进入 MVP：

```text
机构创建活动
机构注册登录
机构后台线索管理
活动二维码
多渠道来源统计
复杂 CRM
线索跟进状态
多机构权限体系
老师解读版报告
学生长期学习档案
课程管理
排课系统
作业布置系统
真实订阅会员体系
抵扣券系统
多学科深度教研
自动群发
自动社群运营
复杂报告编辑器
```

### 4.4 有冲突的页面元素处理

当前 UI 中有些元素会扩大 MVP 范围，必须明确处理：

| UI 元素 | 是否保留 | MVP 处理方式 |
|---|---|---|
| Pro 会员卡 | 建议改名或弱化 | 不做真实会员，改成“权益中心 / 已购权益 / 内测权益” |
| 下载 PDF | 可保留 | 如果显示按钮，必须能下载；否则隐藏按钮，先做“保存报告” |
| 消息 / 客服入口 | 可保留 | P1，可先跳转帮助与反馈 |
| 订单记录 | 可保留 | P1，但支付后最好能查订单 |
| 购买记录 | 可保留 | P1，可先展示支付记录列表 |
| 查看样例 | 建议保留 | 对转化有帮助，可用静态样例 |
| 我的报告 | 必须保留 | 因为支持“稍后查看” |

---

## 5. 商业模式与付费规则

### 5.1 付费档位

MVP 保留两个真实付费档位：

```text
1 元：解锁完整 AI 初判
9.9 元：解锁完整 AI 提分报告
```

不做：

```text
订阅
会员
19.9 元
机构套餐
优惠券
抵扣券
多档复杂权益
```

### 5.2 免费层：初判报告预览

名称：

```text
初判报告预览
```

用户看到：

```text
主要丢分点
优先补弱点
初步建议
部分内容锁定
更多内容需 1 元解锁
```

页面表现：

```text
上半部分清晰展示
下半部分模糊 / 半透明遮罩
中间显示锁头和提示文案
底部固定按钮：立即支付 1 元解锁
```

目的：

1. 让用户先看到 AI 真的分析了；
2. 降低“盲付费”的心理阻力；
3. 提高 1 元转化率；
4. 让用户形成“这个结果可能有用”的感知。

### 5.3 1 元层：完整 AI 初判

名称：

```text
AI 初判结果
```

包含：

```text
1. 学习状态一句话判断
2. 资料可信度
3. 分析对象
4. 主要丢分点
5. 优先补弱点
6. 初步建议
7. 9.9 元完整分析解锁入口
```

不包含：

```text
完整丢分地图
可追回分数分层
详细错因拆解
完整 7 天计划
详细下一步方案
PDF 完整报告
```

### 5.4 9.9 元层：完整 AI 提分报告

名称：

```text
完整 AI 提分报告
```

包含：

```text
1. 核心判断
2. 主要丢分点
3. 优先补弱点
4. 错因判断
5. 优先补弱顺序
6. 7 天行动建议
7. 完整学习建议
8. 下一步建议
9. PDF 式报告展示
```

### 5.5 价格文案规范

1 元按钮建议：

```text
立即支付 1 元解锁
立即支付 1 元查看完整初判
```

避免使用：

```text
立即支付 1 元查看完整报告
```

原因：容易和 9.9 元“完整提分报告”混淆。

9.9 元按钮建议：

```text
9.9 元解锁完整分析
立即支付 9.9 元
查看完整提分报告
```

---

## 6. 核心业务流程

### 6.1 新用户主流程

```text
首页
↓
点击上传资料
↓
选择图片 / PDF
↓
勾选上传授权
↓
提交资料
↓
创建 diagnosis_order
↓
进入 AI 分析中页面
↓
系统生成初判预览
↓
进入初判报告预览页
↓
点击立即支付 1 元解锁
↓
进入确认 1 元初判页
↓
支付成功
↓
进入 AI 初判结果页
↓
点击 9.9 元解锁完整分析
↓
进入完整分析解锁页
↓
支付成功
↓
生成 / 展示完整提分报告
↓
查看完整报告 / 保存报告 / 返回首页
```

### 6.2 用户稍后查看流程

```text
AI 分析中
↓
点击稍后查看
↓
返回首页 / 我的报告
↓
最近报告显示“分析中”
↓
用户点击报告
↓
如果已完成，进入初判报告预览页
↓
如果未完成，回到 AI 分析中页面
↓
如果失败，进入处理失败页
```

### 6.3 失败流程

#### AI 分析失败

```text
AI 分析中
↓
任务失败
↓
处理失败页
↓
用户选择：
1. 重新开始分析
2. 重新上传资料
3. 返回首页
```

#### 图片不清晰

```text
上传资料
↓
AI 判断资料质量低
↓
处理失败页 / 待补资料状态
↓
提示：资料不清晰，建议重新上传
↓
用户重新上传
```

#### 年级 / 学科无法识别

```text
上传资料
↓
AI 无法判断年级或学科
↓
进入信息补充弹窗 / 页面
↓
用户选择年级、学科、考试类型
↓
继续分析
```

#### 支付失败 / 用户取消

```text
发起支付
↓
用户取消 / 支付失败
↓
订单保留
↓
返回对应解锁页
↓
用户可重新支付
```

---

## 7. 页面设计清单与功能要求

> 本节以当前 UI 页面为准，开发必须按页面清单实现。
> 小程序端优先，H5 可复用同一套业务结构。

---

### C01 首页

#### 页面目标

让家长立即理解产品价值，并完成上传。

#### 页面结构

```text
顶部：
- 品牌 Logo
- 产品名：AI 提分决策
- 可选消息 / 帮助入口

主视觉卡：
- 标题：上传孩子资料，AI 帮你看清先补什么
- 副标题：支持试卷 / 错题 / 成绩单，先做 1 元初判
- 右侧学习猫头鹰 / AI 教练插画

上传卡：
- 支持图片 / PDF
- 上传资料按钮
- 上传格式提示

快捷入口：
- 查看样例
- 我的报告

最近报告：
- 报告名称
- 状态标签
- 点击进入对应状态页

底部 Tab：
- 首页
- 我的
```

#### 交互规则

1. 点击“上传资料”后，弹出文件选择；
2. 上传前必须展示隐私授权；
3. 上传成功后创建订单；
4. 创建订单成功后进入 AI 分析中页；
5. 最近报告按创建时间倒序展示最近 2 条；
6. 点击最近报告时，根据订单状态跳转：
   - analyzing：AI 分析中页；
   - preview_done：初判报告预览页；
   - basic_unlocked：AI 初判结果页；
   - full_done：完整提分报告页；
   - failed：处理失败页。

#### 状态标签

```text
AI 初判已完成
待查看结果
分析中
待补资料
已解锁完整报告
处理失败
```

---

### C02 上传资料与授权

#### 支持类型

```text
图片：jpg / jpeg / png
PDF：可选，MVP 可先支持单文件 PDF
```

#### 上传建议文案

```text
请尽量上传清晰图片，最好包含题目、孩子作答过程、老师批改痕迹和分数信息。
如果缺少作答过程，AI 只能给出“疑似错因”，不能确定真实错误原因。
```

#### 授权文案

```text
我确认上传的资料用于生成本次 AI 提分决策。系统将基于图片中的题目、作答痕迹和分数信息进行分析。若资料不清晰或缺少作答过程，AI 可能只能给出初步判断或疑似错因。
```

#### 必须记录

```text
上传文件 URL
文件类型
文件大小
上传时间
订单 ID
用户 ID / openid
用户授权状态
```

---

### C03 AI 分析中页面

#### 页面目标

降低等待焦虑，让用户知道系统正在处理。

#### 页面结构

```text
顶部：
- 返回按钮
- Logo
- 标题：AI 提分决策

主体卡：
- 标题：AI 正在分析中
- 圆环进度：如 68%
- 学习猫头鹰插画
- 分析步骤列表

步骤列表：
- 已识别上传资料
- 已匹配年级与学科
- 正在定位主要丢分点
- 正在生成初步建议

底部：
- 通常需要 10-30 秒
- 稍后查看
- 刷新进度
```

#### 进度规则

进度不是简单假进度，必须绑定任务状态：

| 后端状态 | 前端进度建议 | 展示文案 |
|---|---:|---|
| uploaded | 10% | 正在读取资料 |
| preview_analyzing | 30%-80% | 正在定位主要丢分点 |
| preview_done | 100% | 初判预览已生成 |
| preview_failed | - | 处理失败 |
| low_quality | - | 资料不清晰 |

#### 交互规则

1. 进入页面后每 2 秒轮询一次任务状态；
2. 最长轮询 30 秒；
3. 超过 30 秒未完成，允许用户“稍后查看”；
4. 点击“刷新进度”立即请求一次状态；
5. 如果任务完成，自动跳转初判报告预览页；
6. 如果任务失败，跳转处理失败页。

---

### C04 处理失败页

#### 页面目标

明确告诉用户失败原因，并给出可恢复动作。

#### 页面结构

```text
顶部：
- 返回按钮
- 标题：处理失败

主体：
- 失败插画
- 标题：分析没有成功
- 说明：可能是资料不清晰或网络异常，请稍后重试。

按钮：
- 重新开始分析
- 重新上传资料
- 返回首页
```

#### 失败原因枚举

```text
image_blurry：图片不清晰
no_question_detected：未识别到题目
no_student_answer：缺少作答过程
network_error：网络异常
ai_timeout：AI 处理超时
ai_failed：AI 生成失败
payment_failed：支付失败
unknown：未知错误
```

#### 按钮行为

| 按钮 | 行为 |
|---|---|
| 重新开始分析 | 使用原资料重新触发 preview_analysis |
| 重新上传资料 | 返回上传入口，保留订单或创建新订单 |
| 返回首页 | 回到首页 |

---

### C05 初判报告预览页

#### 页面目标

展示 AI 已产生价值，但保留关键内容引导 1 元解锁。

#### 页面结构

```text
顶部：
- 可选标题：初判报告预览
- 猫头鹰插画

可见内容：
- 主要丢分点
- 优先补弱点
- 初步建议

隐藏内容：
- 更多报告内容已隐藏
- 支付后查看完整初判内容

底部固定 CTA：
- 立即支付 1 元解锁
- 返回上一步
```

#### 展示规则

1. 免费预览最多展示 3 个模块；
2. 不展示完整 7 天建议；
3. 不展示详细下一步建议；
4. 锁定区域必须明显；
5. 不要让用户误以为已经看到完整报告。

#### 解锁按钮文案

```text
立即支付 1 元解锁
```

或：

```text
立即支付 1 元查看完整初判
```

---

### C06 确认 1 元初判页

#### 页面目标

让用户确认支付 1 元，完成初判解锁。

#### 页面结构

```text
顶部：
- 返回按钮
- Logo
- 标题：确认 1 元初判

说明：
- 仅需 1 元，AI 帮你初步分析孩子学习情况

步骤条：
1 上传资料
2 AI 分析
3 确认支付

报告摘要卡：
- 报告标题，如：初一数学月考分析
- 一句话总结
- 初步分析已生成

报告内容预览：
- 主要丢分点
- 优先补弱点
- 7 天建议（锁定）
- 下一步建议（锁定）

底部：
- 立即支付 1 元查看完整初判
- 返回上一步
```

#### 注意

按钮不要写成“1 元查看完整报告”，应该写成“完整初判”，否则与 9.9 元完整报告冲突。

---

### C07 AI 初判结果页

#### 页面目标

展示 1 元完整初判结果，并引导用户升级 9.9 元。

#### 页面结构

```text
顶部：
- 返回按钮
- Logo
- 标题：AI 初判结果

初判摘要卡：
- 一句话判断
- 资料可信度：星级或高 / 中 / 低
- 分析对象：如 初一 数学月考

结果卡：
- 主要丢分点
- 优先补弱点
- 初步建议

升级提示：
- 建议解锁完整分析，查看完整提分路径

主按钮：
- 9.9 元解锁完整分析

状态提示：
- 1 元初判已完成
```

#### 1 元初判内容字段

```json
{
  "summary": "孩子的数学学习存在基础知识薄弱与计算失误问题，需优先巩固基础并提升计算准确率。",
  "evidenceQuality": "medium",
  "analysisObject": "初一 数学月考",
  "mainLossPoints": ["计算失误", "基础概念混淆"],
  "priorityWeaknesses": ["有理数运算", "方程应用题"],
  "initialAdvice": ["加强基础训练", "建立错题本"],
  "interventionLevel": "L2",
  "upgradeReason": "完整分析将进一步给出丢分地图、优先补弱顺序和 7 天行动建议。"
}
```

---

### C08 解锁完整分析页

#### 页面目标

让用户理解 9.9 元买到的不是“更多文字”，而是完整提分路径。

#### 页面结构

```text
顶部：
- 返回按钮
- 标题：解锁完整分析

权益卡：
- 完整提分报告
- 看清问题，也看清下一步
- 精准定位丢分点
- 明确优先补弱顺序
- 生成专属提分方案

四宫格权益：
- 详细丢分点
- 优先补弱顺序
- 7 天行动建议
- 完整学习建议

价格区：
- 9.9 元
- 原价 39.9 元（可选，谨慎使用）
- 已完成初判，可立即生成完整报告

按钮：
- 立即支付 9.9 元
- 暂不解锁
```

#### 合规提示

不要写：

```text
保证提分
7 天涨 20 分
一定提高
```

可以写：

```text
帮助你看清优先补什么
生成可执行的 7 天建议
基于本次资料判断
```

---

### C09 完整提分报告入口页

#### 页面目标

支付 9.9 元后，展示完整报告已生成，并提供报告目录入口。

#### 页面结构

```text
顶部：
- 返回按钮
- 标题：完整提分报告

报告头图：
- 初一数学月考分析
- 一句话总结
- 完整分析已生成

报告内容列表：
- 主要丢分点
- 优先补弱点
- 7 天建议
- 下一步建议

底部按钮：
- 查看完整报告
- 保存报告
- 回到首页
```

#### 按钮行为

| 按钮 | 行为 |
|---|---|
| 查看完整报告 | 进入 PDF 式完整报告页 |
| 保存报告 | 将报告保存到“我的报告”，并提示保存成功 |
| 回到首页 | 返回首页 |

---

### C10 PDF 式完整报告页

#### 页面目标

让用户感觉这是“一份完整、正式、可保存的提分报告”。

#### 页面结构

```text
顶部：
- 返回按钮
- 标题：完整报告

Tab：
- 报告预览
- 完整报告

报告纸张卡：
- 品牌：AI 提分决策
- 报告类型：初一数学 · 月考分析
- 标题：初一数学提分分析报告
- 班级 / 姓名 / 日期 可留空或隐藏

报告模块：
1. 核心判断
2. 主要丢分点
3. 优先补弱点
4. 7 天建议
5. 下一步建议

底部：
- 返回
- 下载 PDF
```

#### PDF 下载规则

MVP 有两种选择：

##### 方案 A：保留按钮，必须实现下载

要求：

```text
点击下载 PDF 后，生成当前完整报告 PDF；
PDF 内容至少包括页面中展示的所有报告模块；
PDF 文件名格式：AI提分报告_年级_学科_日期.pdf。
```

##### 方案 B：暂不做下载，必须隐藏按钮

如果开发阶段暂不实现 PDF 下载，则不能展示“下载 PDF”按钮，只保留：

```text
保存报告
返回
```

不允许出现不可用按钮。

---

### C11 我的页面

#### 页面目标

给用户找回报告、继续分析、查看支付记录。

#### 页面结构

```text
顶部：
- 标题：我的
- 用户头像
- 微信昵称 / 匿名用户 ID
- 复制 ID

权益卡：
- 建议改为：我的权益 / 已购权益 / 内测权益
- 不建议直接写 Pro 会员，避免引入订阅体系

数据卡：
- 已生成报告
- 分析中
- 待补资料

快捷入口：
- 我的报告
- 订单记录
- 购买记录
- 帮助与反馈

底部主按钮：
- 继续新建分析

底部 Tab：
- 首页
- 我的
```

#### 会员卡处理建议

当前页面中有“Pro 会员”卡，但 PRD 明确不做会员。建议改为：

```text
我的权益
已购报告权益
内测体验权益
```

如果保留 Pro 字样，则必须注明：

```text
MVP 阶段仅展示，不开放真实订阅、续费、会员购买。
```

---

### C12 我的报告列表页

#### 页面目标

支撑“稍后查看”和历史报告复看。

#### 列表字段

```text
报告标题
年级
学科
考试类型
创建时间
状态
支付状态
入口按钮
```

#### 报告状态

```text
分析中
初判预览已生成
1 元初判已解锁
完整报告已解锁
待补资料
处理失败
```

#### 点击规则

根据状态跳转：

| 状态 | 跳转页面 |
|---|---|
| 分析中 | AI 分析中页 |
| 初判预览已生成 | 初判报告预览页 |
| 1 元初判已解锁 | AI 初判结果页 |
| 完整报告已解锁 | 完整提分报告入口页 |
| 待补资料 | 上传资料页 |
| 处理失败 | 处理失败页 |

---

## 8. 报告内容结构

### 8.1 L0 初判报告预览结构

```json
{
  "reportTitle": "初一数学月考分析",
  "visibleSections": [
    {
      "title": "主要丢分点",
      "summary": "快速定位孩子的主要失分原因"
    },
    {
      "title": "优先补弱点",
      "summary": "明确优先提升的薄弱知识点"
    },
    {
      "title": "初步建议",
      "summary": "7 天学习建议，助力稳步提升"
    }
  ],
  "lockedSections": [
    "详细错因判断",
    "7 天行动建议",
    "下一步建议"
  ],
  "unlockPrice": 1.00
}
```

### 8.2 L1 完整 AI 初判结构

```json
{
  "summary": "",
  "evidenceQuality": "high|medium|low",
  "analysisObject": "",
  "mainLossPoints": [
    {
      "name": "计算失误",
      "description": "基础运算中出现符号或步骤错误",
      "confidence": "medium"
    }
  ],
  "priorityWeaknesses": [
    {
      "name": "有理数运算",
      "reason": "影响后续整式、方程和函数学习",
      "priority": 1
    }
  ],
  "initialAdvice": [
    "加强基础训练",
    "建立错题本"
  ],
  "interventionLevel": "L1|L2|L3|L4",
  "upgradeReason": ""
}
```

### 8.3 L2 完整 AI 提分报告结构

```json
{
  "reportTitle": "初一数学提分分析报告",
  "summary": "",
  "evidenceQuality": "high|medium|low",
  "analysisObject": "初一数学月考",
  "coreJudgement": "",
  "lossMap": [
    {
      "module": "计算题",
      "lossPoint": "符号处理错误",
      "evidence": "第 3 题出现负号处理错误",
      "impact": "high",
      "diagnosisStatus": "确定错因|疑似错因"
    }
  ],
  "priorityWeaknesses": [
    {
      "priority": 1,
      "knowledgePoint": "去括号与符号处理",
      "whyFirst": "影响整式、方程、函数等后续内容",
      "action": "先做基础规则训练"
    }
  ],
  "recoverableScoreAssessment": {
    "shortTerm": "计算规则和基础步骤规范有机会优先改善",
    "midTerm": "应用题数量关系需要持续训练",
    "longTerm": "几何推理能力需要长期积累"
  },
  "errorCauseAnalysis": [
    {
      "type": "规则不熟",
      "evidence": "同类符号错误多次出现",
      "diagnosisStatus": "疑似错因",
      "confidence": "medium"
    }
  ],
  "interventionLevel": "L2",
  "sevenDayPlan": [
    {
      "day": 1,
      "goal": "复习去括号规则",
      "task": "完成 6 道基础题和 2 道变式题",
      "parentCheckPoint": "能否说出括号前是负号时每一项都要变号",
      "masteryStandard": "正确率达到 80% 以上"
    }
  ],
  "nextStepRecommendation": "",
  "riskNotes": []
}
```

---

## 9. AI 分析规则

### 9.1 AI 判断原则

必须遵守：

```text
基于资料证据判断
不承诺提分
不制造焦虑
不评价孩子人格、智力和态度
没有作答过程只能输出疑似错因
资料不清晰必须提示
所有关键结论要有证据来源
```

### 9.2 资料质量判断

AI 必须判断：

```text
是否有题目
是否有学生作答
是否有老师批改痕迹
是否有分数
是否能识别年级
是否能识别学科
是否能判断考试类型
```

### 9.3 可信度规则

| 资料情况 | 可信度 |
|---|---|
| 有完整题目、作答、批改、分数 | 高 |
| 有题目和部分作答，但缺少完整得分 | 中 |
| 只有成绩单或只有题目，没有作答过程 | 低 |
| 图片模糊、题目不完整 | 低 / 待补资料 |

### 9.4 错因判断规则

1. 有作答过程：可以输出“确定错因”或“较高可信判断”；
2. 无作答过程：只能输出“疑似错因”；
3. 只有成绩单：只能做整体趋势判断，不能做具体错因；
4. 不能说“孩子不努力”“态度不好”“智力不行”；
5. 不能直接建议“必须报班”；
6. 可以建议“如果同类题正确率仍低于 70%，建议老师讲解关键方法”。

---

## 10. 状态机设计

### 10.1 订单主状态

```text
created
uploaded
preview_analyzing
preview_done
preview_failed
basic_payment_pending
basic_unlocked
full_payment_pending
full_paid
full_analyzing
full_done
failed
need_more_material
cancelled
```

### 10.2 权益状态

```text
none：无权益
preview：可看初判预览
basic：可看完整 AI 初判
full：可看完整 AI 提分报告
```

### 10.3 状态流转

```text
created
↓
uploaded
↓
preview_analyzing
↓
preview_done
↓
basic_payment_pending
↓
basic_unlocked
↓
full_payment_pending
↓
full_paid
↓
full_analyzing
↓
full_done
```

失败分支：

```text
preview_analyzing → preview_failed
preview_analyzing → need_more_material
full_analyzing → failed
```

### 10.4 页面路由规则

| 订单状态 | 页面 |
|---|---|
| uploaded / preview_analyzing | AI 分析中页 |
| preview_done | 初判报告预览页 |
| preview_failed / failed | 处理失败页 |
| need_more_material | 上传资料页 / 待补资料页 |
| basic_payment_pending | 确认 1 元初判页 |
| basic_unlocked | AI 初判结果页 |
| full_payment_pending | 解锁完整分析页 |
| full_paid / full_analyzing | AI 分析中页或完整报告生成中 |
| full_done | 完整提分报告页 |

---

## 11. 数据库设计（MVP）

### 11.1 users 用户表

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(32),
  wechat_openid VARCHAR(128),
  nickname VARCHAR(128),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

说明：

1. phone 可选；
2. 小程序优先用 wechat_openid；
3. 未登录也可先匿名创建用户，但支付和报告访问必须能绑定。

---

### 11.2 diagnosis_orders 诊断订单表

```sql
CREATE TABLE diagnosis_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  student_grade VARCHAR(32),
  subject VARCHAR(32) DEFAULT '数学',
  current_score NUMERIC(6,2),
  full_score NUMERIC(6,2),
  target_score NUMERIC(6,2),
  exam_type VARCHAR(64),
  material_type VARCHAR(64),
  title VARCHAR(128),
  status VARCHAR(64) NOT NULL DEFAULT 'created',
  access_level VARCHAR(32) NOT NULL DEFAULT 'none',
  preview_done_at TIMESTAMP,
  basic_unlocked_at TIMESTAMP,
  full_unlocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

`status` 枚举：

```text
created
uploaded
preview_analyzing
preview_done
preview_failed
basic_payment_pending
basic_unlocked
full_payment_pending
full_paid
full_analyzing
full_done
failed
need_more_material
cancelled
```

`access_level` 枚举：

```text
none
preview
basic
full
```

---

### 11.3 upload_files 上传资料表

```sql
CREATE TABLE upload_files (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_order_id BIGINT REFERENCES diagnosis_orders(id),
  file_url TEXT NOT NULL,
  file_type VARCHAR(32),
  upload_type VARCHAR(64),
  file_size BIGINT,
  image_quality VARCHAR(32),
  recognition_status VARCHAR(64) DEFAULT 'pending',
  recognition_result_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

`file_type`：

```text
image
pdf
```

`upload_type`：

```text
paper
wrong_question
score_sheet
mixed
unknown
```

`recognition_status`：

```text
pending
processing
done
failed
low_quality
```

---

### 11.4 ai_analysis_tasks AI 分析任务表

```sql
CREATE TABLE ai_analysis_tasks (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_order_id BIGINT REFERENCES diagnosis_orders(id),
  task_type VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_step VARCHAR(128),
  model_name VARCHAR(128),
  input_snapshot_json JSONB,
  output_json JSONB,
  error_code VARCHAR(128),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

`task_type`：

```text
preview_decision
basic_unlock
full_decision
pdf_export
```

`status`：

```text
pending
processing
done
failed
timeout
cancelled
```

---

### 11.5 diagnosis_decisions 提分决策表

```sql
CREATE TABLE diagnosis_decisions (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_order_id BIGINT REFERENCES diagnosis_orders(id),
  decision_level VARCHAR(32) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'done',
  analysis_json JSONB,
  decision_markdown TEXT,
  evidence_quality VARCHAR(32),
  intervention_level VARCHAR(32),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

`decision_level`：

```text
preview
basic
full
```

说明：

1. `preview` 用于初判预览；
2. `basic` 用于 1 元完整初判；
3. `full` 用于 9.9 元完整提分报告。

---

### 11.6 payments 支付表

```sql
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_order_id BIGINT REFERENCES diagnosis_orders(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_type VARCHAR(64) NOT NULL,
  payment_status VARCHAR(64) NOT NULL DEFAULT 'pending',
  payment_channel VARCHAR(64),
  transaction_id VARCHAR(128),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

`payment_type`：

```text
basic_unlock_1_yuan
full_unlock_9_9_yuan
```

`payment_status`：

```text
pending
paid
failed
cancelled
refunded
```

---

### 11.7 report_exports 报告导出表

如果要做 PDF 下载，新增：

```sql
CREATE TABLE report_exports (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_order_id BIGINT REFERENCES diagnosis_orders(id),
  export_type VARCHAR(32) NOT NULL,
  export_status VARCHAR(64) NOT NULL DEFAULT 'pending',
  file_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

`export_type`：

```text
pdf
image
```

MVP 如果不做下载 PDF，可暂不建此表。

---

### 11.8 feedbacks 用户反馈表

```sql
CREATE TABLE feedbacks (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_order_id BIGINT REFERENCES diagnosis_orders(id),
  user_id BIGINT REFERENCES users(id),
  decision_level VARCHAR(32),
  rating VARCHAR(64),
  feedback_tags JSONB,
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

`rating`：

```text
very_helpful
somewhat_helpful
not_accurate
hard_to_understand
need_more_analysis
```

---

## 12. API 设计（MVP）

### 12.1 创建诊断订单

```http
POST /api/diagnosis-orders
```

请求：

```json
{
  "source": "miniapp",
  "studentGrade": "",
  "subject": "数学",
  "examType": "",
  "materialType": "paper"
}
```

响应：

```json
{
  "orderId": "xxx",
  "status": "created"
}
```

---

### 12.2 上传资料

```http
POST /api/diagnosis-orders/{orderId}/uploads
```

请求：

```json
{
  "files": [
    {
      "fileUrl": "",
      "fileType": "image",
      "uploadType": "paper"
    }
  ],
  "authorizationAccepted": true
}
```

响应：

```json
{
  "orderId": "xxx",
  "status": "uploaded",
  "uploadedCount": 3
}
```

---

### 12.3 启动初判预览分析

```http
POST /api/diagnosis-orders/{orderId}/start-preview-analysis
```

说明：

上传完成后自动调用，也可以手动重试。

响应：

```json
{
  "taskId": "xxx",
  "orderId": "xxx",
  "status": "preview_analyzing"
}
```

---

### 12.4 获取分析进度

```http
GET /api/diagnosis-orders/{orderId}/analysis-progress
```

响应：

```json
{
  "orderId": "xxx",
  "status": "preview_analyzing",
  "progress": 68,
  "currentStep": "正在定位主要丢分点",
  "steps": [
    {
      "key": "material_recognized",
      "label": "已识别上传资料",
      "status": "done"
    },
    {
      "key": "grade_matched",
      "label": "已匹配年级与学科",
      "status": "done"
    },
    {
      "key": "loss_point_locating",
      "label": "正在定位主要丢分点",
      "status": "processing"
    },
    {
      "key": "advice_generating",
      "label": "正在生成初步建议",
      "status": "pending"
    }
  ]
}
```

---

### 12.5 获取初判报告预览

```http
GET /api/diagnosis-orders/{orderId}/preview-decision
```

响应：

```json
{
  "status": "done",
  "accessLevel": "preview",
  "decision": {}
}
```

---

### 12.6 创建支付订单

```http
POST /api/payments/create
```

请求 1 元：

```json
{
  "orderId": "xxx",
  "paymentType": "basic_unlock_1_yuan"
}
```

请求 9.9 元：

```json
{
  "orderId": "xxx",
  "paymentType": "full_unlock_9_9_yuan"
}
```

响应：

```json
{
  "paymentId": "xxx",
  "amount": 1.00,
  "paymentParams": {}
}
```

---

### 12.7 支付回调

```http
POST /api/payments/wechat/callback
```

处理规则：

#### 1 元支付成功

```text
更新 payments.payment_status = paid
更新 diagnosis_orders.access_level = basic
更新 diagnosis_orders.status = basic_unlocked
写入 basic_unlocked_at
允许用户访问 basic decision
```

#### 9.9 元支付成功

```text
更新 payments.payment_status = paid
更新 diagnosis_orders.access_level = full
更新 diagnosis_orders.status = full_paid
触发 full_decision 任务
```

---

### 12.8 获取完整 AI 初判

```http
GET /api/diagnosis-orders/{orderId}/basic-decision
```

权限：

```text
只有 access_level = basic 或 full 时可访问。
```

响应：

```json
{
  "status": "done",
  "decision": {}
}
```

---

### 12.9 启动完整报告生成

```http
POST /api/diagnosis-orders/{orderId}/generate-full
```

权限：

```text
只有 9.9 元支付成功后可调用。
```

响应：

```json
{
  "taskId": "xxx",
  "status": "full_analyzing"
}
```

---

### 12.10 获取完整报告

```http
GET /api/diagnosis-orders/{orderId}/full-report
```

权限：

```text
只有 access_level = full 时可访问。
```

响应：

```json
{
  "status": "done",
  "decision": {}
}
```

---

### 12.11 保存报告

```http
POST /api/diagnosis-orders/{orderId}/save-report
```

说明：

将报告标记为已保存，确保“我的报告”可见。

---

### 12.12 获取我的报告列表

```http
GET /api/my/reports
```

响应：

```json
{
  "items": [
    {
      "orderId": "xxx",
      "title": "初一数学月考分析",
      "status": "basic_unlocked",
      "accessLevel": "basic",
      "createdAt": "2026-05-22T10:00:00Z"
    }
  ]
}
```

---

### 12.13 提交反馈

```http
POST /api/diagnosis-orders/{orderId}/feedback
```

请求：

```json
{
  "decisionLevel": "full",
  "rating": "very_helpful",
  "feedbackTags": ["判断清楚", "知道下一步怎么做"],
  "feedbackText": "感觉比单纯讲题更有用"
}
```

---

### 12.14 PDF 导出

如果保留“下载 PDF”按钮：

```http
POST /api/diagnosis-orders/{orderId}/export-pdf
```

响应：

```json
{
  "exportId": "xxx",
  "status": "processing"
}
```

获取导出状态：

```http
GET /api/report-exports/{exportId}
```

---

## 13. 权限与访问控制

### 13.1 报告访问规则

| access_level | 可访问内容 |
|---|---|
| none | 不可访问报告 |
| preview | 初判预览 |
| basic | 初判预览 + 完整初判 |
| full | 初判预览 + 完整初判 + 完整报告 |

### 13.2 防止越权

必须校验：

```text
当前用户是否属于该订单
当前用户是否拥有对应 access_level
报告是否已经生成
支付状态是否真实 paid
```

### 13.3 支付后恢复

如果用户支付成功但页面关闭：

```text
下次进入首页
↓
最近报告显示对应状态
↓
用户点击后继续进入对应报告页
```

---

## 14. UI 视觉验收标准

### 14.1 整体风格

```text
浅紫色背景
白色大圆角卡片
紫色渐变主按钮
柔和阴影
3D 学习猫头鹰 / AI 机器人插画
大字号标题
信息分层清晰
```

### 14.2 页面一致性要求

1. 所有页面标题区统一；
2. 返回按钮位置统一；
3. 主按钮使用紫色渐变；
4. 次按钮使用白底紫边；
5. 报告卡片使用白色大圆角；
6. 状态标签颜色统一；
7. 我的页面底部 Tab 与首页一致；
8. 锁定区域必须有半透明遮罩和锁头；
9. 失败页必须有明确恢复动作；
10. 完整报告页要像纸质报告，不要像普通列表。

### 14.3 必须适配

```text
iPhone 375 宽
iPhone 390 宽
iPhone 414 宽
主流安卓 360-430 宽
微信小程序安全区
底部 Home Indicator 安全区
```

---

## 15. 后台与数据导出

### 15.1 MVP 不做复杂后台

不做：

```text
机构后台
线索管理
CRM
复杂筛选
销售跟进
多机构权限
```

### 15.2 最简后台方式

优先采用：

```text
数据库直接导出
+
简单脚本导出 Excel
```

### 15.3 必须可导出字段

```text
订单 ID
用户 ID / openid
创建时间
年级
学科
考试类型
上传数量
订单状态
权益状态
初判预览完成时间
1 元支付状态
9.9 元支付状态
资料可信度
干预等级
AI 失败原因
用户反馈
```

---

## 16. 合规与隐私

### 16.1 未成年人信息保护

必须做到：

1. 上传前明确告知资料用途；
2. 家长主动勾选授权；
3. 不强制收集孩子姓名；
4. 不强制收集学校名称；
5. 不公开任何孩子资料；
6. 用户只能查看自己的报告；
7. 图片和报告必须有访问权限控制；
8. 支持删除上传资料；
9. 数据导出仅限管理员；
10. AI 输出不得对孩子人格、智力、态度做负面标签。

### 16.2 AI 输出禁止表达

禁止：

```text
保证提分
一定提高
7 天涨 20 分
包过
保上重点
孩子不努力
孩子太粗心
孩子能力不行
必须马上报班
不补就完了
```

推荐：

```text
从本次资料看
暂时判断
疑似错因
有机会优先追回
建议优先处理
需要进一步观察
如果同类题正确率仍低于 70%，建议进一步讲解
```

---

## 17. 验收标准

### 17.1 功能验收

必须完成：

1. 用户可以进入首页；
2. 用户可以上传图片资料；
3. 上传前必须完成授权确认；
4. 上传后创建诊断订单；
5. 用户可以进入 AI 分析中页面；
6. 分析中页面可以显示进度、步骤、稍后查看、刷新进度；
7. AI 成功后生成初判报告预览；
8. 初判预览页有清晰展示和锁定区域；
9. 用户可以支付 1 元；
10. 支付 1 元后可以查看完整 AI 初判；
11. 用户可以支付 9.9 元；
12. 支付 9.9 元后可以查看完整提分报告；
13. 完整报告页可以查看报告内容；
14. 如果显示下载 PDF 按钮，必须能下载 PDF；
15. 处理失败页可以重新分析、重新上传、返回首页；
16. 我的页面可以进入我的报告；
17. 我的报告可以恢复分析中 / 已完成 / 失败报告；
18. 用户可以提交反馈；
19. 所有核心数据可以入库；
20. 运营可以导出核心数据。

### 17.2 业务验收

第一轮小流量测试目标：

```text
访问人数：≥ 300
上传资料人数：≥ 30
初判预览完成人数：≥ 25
1 元支付人数：≥ 8
9.9 元支付人数：≥ 2
完整报告反馈人数：≥ 2
```

理想转化目标：

```text
访问 → 上传：≥ 10%
上传 → 初判预览完成：≥ 80%
初判预览 → 1 元支付：≥ 25%
1 元支付 → 9.9 元支付：≥ 20%
完整报告有帮助反馈：≥ 60%
明显差评率：≤ 10%
```

### 17.3 技术验收

```text
图片上传成功率 ≥ 95%
AI 初判预览生成成功率 ≥ 90%
1 元支付状态更新准确率 ≥ 99%
9.9 元支付状态更新准确率 ≥ 99%
完整报告生成成功率 ≥ 85%
报告访问权限正确
用户只能查看自己的报告
AI 失败可重试
数据可以导出
移动端页面无明显错位
```

### 17.4 AI 质量验收

人工抽检至少 20 份报告。

维度：

| 维度 | 标准 |
|---|---|
| 资料可信度判断 | 能准确区分高 / 中 / 低 |
| 错因判断 | 必须基于证据 |
| 疑似错因标记 | 缺少作答过程时必须标记 |
| 干预等级 | 判断合理 |
| 7 天建议 | 具体可执行 |
| 家长可读性 | 家长能看懂 |
| 风险表达 | 不承诺提分，不制造焦虑 |

---

## 18. 开发优先级

### P0：必须完成

```text
首页
上传资料
隐私授权
订单创建
AI 分析中
初判报告预览
1 元支付
确认 1 元初判页
AI 初判结果页
9.9 元支付
解锁完整分析页
完整提分报告入口页
完整报告展示页
处理失败页
我的页面
我的报告列表
数据库入库
支付回调
用户反馈
数据导出
```

### P0.5：强烈建议

```text
查看样例
PDF 下载
订单记录
购买记录
报告保存
再次上传资料重新分析
```

### P1：可后置

```text
帮助与反馈中心
客服入口
报告分享
短信通知
微信订阅消息
人工复核标记
简单管理员订单页
```

### P2：暂不做

```text
真实 Pro 会员
订阅
机构端
活动创建
活动二维码
线索管理
复杂后台
CRM
老师解读版
学生长期档案
多学科深度系统
多机构 SaaS
```

---

## 19. 开发拆解建议

### 阶段一：跑通上传到初判预览

目标：

```text
用户可以上传资料，看到 AI 分析中，并最终看到初判报告预览。
```

任务：

```text
首页 UI
上传组件
隐私授权
订单创建
文件存储
AI preview_decision 任务
分析中页面
初判预览页
失败页
我的报告基础列表
```

验收：

```text
上传资料后，系统能生成初判报告预览；失败时可恢复。
```

---

### 阶段二：跑通 1 元初判

目标：

```text
用户可以支付 1 元，查看完整 AI 初判。
```

任务：

```text
确认 1 元初判页
支付创建
支付回调
权益状态更新
AI 初判结果页
报告访问权限
```

验收：

```text
支付 1 元后，用户可查看完整 AI 初判，未支付用户不能访问。
```

---

### 阶段三：跑通 9.9 元完整报告

目标：

```text
用户可以支付 9.9 元，查看完整 AI 提分报告。
```

任务：

```text
解锁完整分析页
9.9 元支付
full_decision 任务
完整报告入口页
完整报告展示页
保存报告
反馈
```

验收：

```text
支付 9.9 元后，用户可查看完整报告，未支付用户不能访问。
```

---

### 阶段四：稳定性与数据导出

目标：

```text
系统可运营，可复盘转化数据。
```

任务：

```text
AI 重试
失败原因记录
支付状态补偿
数据导出脚本
报告抽检
埋点统计
```

验收：

```text
可以导出上传、支付、报告、反馈和失败数据。
```

---

## 20. AI 提示词要求

### 20.1 系统角色

```text
你是一个面向初高中家长的 AI 提分决策分析师。

你的任务不是简单讲题，也不是生成普通学习报告，而是基于学生真实试卷、错题、成绩单，帮助家长判断：

1. 孩子主要丢分点；
2. 最优先补的知识点；
3. 哪些分有机会优先追回；
4. 下一步应该家庭自练、专项训练，还是寻求老师讲解；
5. 未来 7 天应该怎么做。

你必须基于证据判断，不得夸大，不得承诺提分，不得输出保分、包过、一定提高等表述。

如果缺少学生作答过程，只能输出疑似错因。
如果资料不足，必须明确说明无法确定。
```

### 20.2 初判预览输出要求

```text
只输出可用于预览的 3 个模块：
1. 主要丢分点
2. 优先补弱点
3. 初步建议

不要输出完整 7 天计划。
不要输出完整下一步建议。
不要输出过多细节。
```

### 20.3 1 元完整初判输出要求

```text
一、学习状态一句话判断
二、本次资料可信度
三、分析对象
四、主要丢分点
五、优先补弱点
六、初步建议
七、为什么建议查看完整分析
```

### 20.4 9.9 元完整报告输出要求

```text
一、核心判断
二、主要丢分点
三、优先补弱点
四、错因判断
五、优先补弱顺序
六、7 天行动建议
七、完整学习建议
八、下一步建议
```

---

## 21. 页面文案

### 21.1 首页主文案

```text
上传孩子资料，AI 帮你看清先补什么
```

### 21.2 首页副文案

```text
支持试卷 / 错题 / 成绩单，先做 1 元初判
```

### 21.3 AI 分析中文案

```text
AI 正在分析中
通常需要 10-30 秒
```

步骤：

```text
已识别上传资料
已匹配年级与学科
正在定位主要丢分点
正在生成初步建议
```

### 21.4 初判预览文案

```text
初判报告预览
更多报告内容已隐藏
支付后查看完整初判内容
```

按钮：

```text
立即支付 1 元解锁
```

### 21.5 1 元支付确认文案

```text
仅需 1 元，AI 帮你初步分析孩子学习情况
```

按钮：

```text
立即支付 1 元查看完整初判
```

### 21.6 AI 初判结果文案

```text
孩子的数学学习存在基础知识薄弱与计算失误问题，需优先巩固基础并提升计算准确率。
```

升级提示：

```text
建议解锁完整分析，查看完整提分路径
```

按钮：

```text
9.9 元解锁完整分析
```

### 21.7 完整报告解锁文案

```text
完整提分报告
看清问题，也看清下一步
```

权益：

```text
精准定位丢分点
明确优先补弱顺序
生成专属提分方案
```

按钮：

```text
立即支付 9.9 元
```

### 21.8 失败页文案

```text
分析没有成功
可能是资料不清晰或网络异常，请稍后重试。
```

按钮：

```text
重新开始分析
重新上传资料
返回首页
```

---

## 22. 成功标准

### 22.1 MVP 成功信号

如果出现以下结果，说明方向值得继续：

```text
家长愿意上传真实试卷 / 错题；
家长看到初判预览后愿意支付 1 元；
家长看完初判后愿意支付 9.9 元；
家长反馈“知道下一步怎么做”；
完整报告有帮助反馈超过 60%；
用户愿意再次上传或推荐给其他家长。
```

### 22.2 失败信号

如果出现以下情况，需要调整：

```text
家长不愿意上传资料；
AI 分析等待导致大量流失；
初判预览太空泛，没人愿意付 1 元；
1 元初判看完没人愿意升级 9.9 元；
完整报告被认为空泛；
报告被认为不准确；
AI 经常无法识别图片；
家长看完仍不知道下一步怎么做；
AI 成本明显高于收入。
```

---

## 23. 后续迭代方向

### V1.3：提升转化

```text
优化初判预览内容
增加样例报告
增加报告保存图片
增加重新上传
增加报告分享
增加人工复核入口
```

### V1.4：提升交付价值

```text
增加 7 天训练题
增加同类题推荐
增加复测题
增加二次诊断
增加报告 PDF 美化模板
```

### V1.5：轻后台

```text
订单管理
支付状态查看
报告状态查看
AI 失败重跑
Excel 导出
用户反馈查看
```

### V2.0：机构合作

前提：

```text
已有真实家长上传数据；
已有 1 元和 9.9 元付费数据；
已有完整报告案例；
证明家长认为有帮助；
沉淀出 L3 / L4 高干预等级用户。
```

再做：

```text
机构专属链接
机构活动页
机构线索后台
线索分层
机构数据看板
机构合作套餐
```

---

## 24. 结论

本版本的 MVP 不再是“先付 1 元再盲等 AI 分析”，而是：

```text
先上传资料
↓
AI 生成初判预览
↓
用户看到部分价值
↓
1 元解锁完整初判
↓
9.9 元解锁完整提分报告
```

这条路径更符合当前 UI，也更符合低价转化逻辑。

最终 MVP 核心闭环是：

```text
上传资料
↓
初判预览
↓
1 元初判
↓
9.9 元完整报告
↓
我的报告留存
↓
用户反馈
```

当前阶段最重要的是把“初判预览”和“1 元初判”做到足够有价值，让家长愿意继续解锁 9.9 元完整提分报告。
