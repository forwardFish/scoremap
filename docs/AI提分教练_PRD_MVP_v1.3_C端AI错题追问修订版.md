# AI提分教练 PRD（MVP v1.3｜C 端 + 报告内嵌 AI 错题追问版）

> 文档版本：v1.3
> 修改日期：2026-05-25
> 产品定位：AI提分教练
> 本版修改重点：在 v1.2「初判预览 → 1 元完整初判 → 9.9 元完整提分报告」主流程基础上，新增 **报告内嵌 AI 错题追问能力**。
> 当前阶段明确不做：机构创建活动、机构后台线索管理、多机构 SaaS、复杂 CRM、活动二维码、多渠道统计、老师解读版、长期学习档案、多学科深度系统、真实订阅会员体系、独立 AI 陪讲页、开放式聊天、语音陪讲、视频讲解。

---

## 0. 本次修改重点

### 0.1 为什么要改

v1.2 已经明确 MVP 主流程：

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

但如果产品只停留在“看报告”，用户路径会过短：

```text
上传资料
↓
看报告
↓
结束
```

这样容易被用户理解成“AI 报告生成器”，不利于形成 **AI提分教练** 的长期价值。

因此本版增加一个轻量能力：

> **报告内嵌 AI 错题追问。**

它不是独立 AI 陪讲页，也不是开放式聊天系统，而是在完整报告的错题卡片下方提供受控式互动：

```text
错题卡片
↓
让 AI 老师讲给孩子听
↓
固定快捷按钮
↓
围绕当前错题继续讲解
↓
生成一道小练习
↓
记录互动小结
```

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
用户查看完整报告
↓
用户在错题卡片中点击「让 AI 老师讲给孩子听」
↓
系统打开轻量错题追问区
↓
学生通过固定按钮追问 3～5 轮
↓
AI 生成小练习和互动小结
↓
用户提交反馈
↓
系统沉淀订单、资料、支付、报告、互动和反馈数据
```

### 0.3 三层报告权益定义

| 层级 | 名称 | 是否付费 | 用户看到什么 | 是否开放错题追问 | 核心目的 |
|---|---:|---:|---|---|---|
| L0 | 初判报告预览 | 免费 | 只展示部分报告内容，下半部分模糊 / 锁定 | 不开放 | 让用户先看到价值，提高 1 元转化 |
| L1 | 完整 AI 初判 | 1 元 | 展示完整初判：一句话判断、可信度、主要丢分点、优先补弱点、初步建议 | 不开放正式追问，可展示 1 个讲解样例入口 | 验证家长是否愿意为 AI 判断付费 |
| L2 | 完整 AI 提分报告 | 9.9 元 | 展示详细丢分地图、补弱顺序、7 天建议、下一步建议、PDF 式报告、错题卡片 | 开放轻量错题追问 | 验证完整提分决策价值，并提升报告互动价值 |

### 0.4 本版关键改动

1. 保留 v1.2 的 C 端主流程，不新增机构端。
2. 保留 1 元和 9.9 元两个真实付费档位。
3. 9.9 元完整报告新增“错题卡片”结构。
4. 完整报告页新增“让 AI 老师讲给孩子听”入口。
5. 新增 C13「AI 错题追问区」页面/组件。
6. 新增错题追问相关数据库表：`diagnosis_questions`、`question_interactions`。
7. 新增错题追问 API：题目列表、追问、互动记录、练习检查。
8. 新增错题追问权限与次数限制。
9. 新增 AI 错题追问提示词规则。
10. 新增错题追问验收标准与开发拆解。

---

## 1. 产品定位

### 1.1 产品名称

```text
AI提分教练
```

### 1.2 一句话定位

> AI提分教练是一款面向家长的学习资料诊断与提分路径决策工具。家长上传孩子真实试卷、错题或成绩单后，系统基于资料生成 AI 初判和完整提分报告，帮助家长看清主要丢分点、优先补弱点、7 天行动建议和下一步学习决策；在完整报告中，学生还可以针对具体错题继续追问，获得换一种讲法、小练习和掌握检查。

### 1.3 产品核心价值

家长真正关心的不是“这道题怎么做”，而是：

```text
孩子到底卡在哪里？
为什么一直丢分？
先补什么最有效？
哪些分有机会先追回？
要不要找老师讲？
接下来 7 天怎么安排？
孩子看完报告后能不能继续学？
```

所以产品核心不是“错题解析”，也不是“报告生成”，而是：

> **提分决策 + 针对关键错题的轻量学习闭环。**

### 1.4 本产品不是什么

AI提分教练不是：

1. 不是普通拍照搜题；
2. 不是简单错题解析工具；
3. 不是纯 AI 报告生成器；
4. 不是在线教学平台；
5. 不是保证提分工具；
6. 不是机构线索管理后台；
7. 不是 CRM；
8. 不是老师替代品；
9. 不是完整学习档案系统；
10. 不是订阅制会员产品；
11. 不是独立 AI 陪讲教室；
12. 不是开放式聊天机器人。

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

### 2.4 第四目标：验证轻量 AI 错题追问是否提升价值感

需要验证：

```text
用户是否愿意点击“让 AI 老师讲给孩子听”？
学生是否会使用“我不懂这一步 / 换一种方式讲 / 给我同类题”等按钮？
错题追问后，家长是否更认为 9.9 元完整报告有价值？
错题追问是否能让用户反馈“孩子能继续学”？
错题追问是否能沉淀更真实的卡点数据？
```

### 2.5 第五目标：沉淀后续 B 端合作数据

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
错题追问点击率
错题追问次数
学生常见追问类型
小练习正确率
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

### 3.2 学生使用位置

学生不是购买者，但会在两个位置参与：

```text
1. 家长看完整报告后，让孩子查看某道错题讲解；
2. 孩子在错题卡片中点击固定按钮进行追问和小练习。
```

第一版不做学生独立账号，不做学生学习空间。

### 3.3 第一阶段主打学科

MVP 第一阶段默认主打：

```text
数学
```

原因：

1. 家长对数学提分敏感；
2. 数学错题、试卷、成绩单更容易结构化分析；
3. 数学更容易输出“主要丢分点 + 优先补弱点 + 7 天建议”；
4. 初一、初二数学分化明显，更容易形成付费动机；
5. 数学错题更适合做“固定按钮式追问”和“小练习”。

### 3.4 第一阶段主力场景

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
报告内嵌 AI 错题追问
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
| 错题卡片 | 必做 | 完整报告中展示关键错题、知识点、错因、讲解摘要 |
| AI 错题追问入口 | 建议首版上线 | 每道错题下方提供“让 AI 老师讲给孩子听” |
| 固定按钮式追问 | 建议首版上线 | 5 个按钮，不做开放式聊天 |
| 小练习生成 | 建议首版上线 | 每次互动可生成一道小练习 |
| 互动小结记录 | 建议首版上线 | 记录学生卡点，供后续分析 |
| 处理失败页 | 必做 | 重新分析、重新上传、返回首页 |
| 我的页面 | 必做 | 至少可进入我的报告和继续新建分析 |
| 我的报告列表 | 必做 | 支持查看历史报告和分析中报告 |
| 用户反馈 | 必做 | 有帮助 / 不准确 / 看不懂等 |
| 数据入库 | 必做 | 用户、订单、上传、支付、报告、反馈、互动 |
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
独立 AI 陪讲页
开放式聊天
长期聊天历史
语音陪讲
视频讲解
学生学习空间
复杂掌握度曲线
```

### 4.4 AI 错题追问的边界

第一版只做：

```text
完整报告内嵌
围绕当前错题
固定快捷按钮
最多 3～5 轮
每次可生成 1 道小练习
记录互动小结
```

第一版不做：

```text
学生任意提问
跨题自由聊天
长期对话记忆
语音互动
视频讲解
自动生成完整学生档案
家长端复杂学习复盘
```

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

错题追问规则：

```text
不开放错题追问。
```

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
正式错题追问
```

可选展示：

```text
展示 1 个“AI 老师讲题示例”静态样例，用于引导 9.9 元升级。
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
10. 关键错题卡片
11. 报告内嵌 AI 错题追问
12. 每份报告一定次数的错题追问权益
```

### 5.5 错题追问权益限制

第一版建议：

```text
9.9 元完整报告：每份报告最多 10 次 AI 错题追问。
每道错题最多 3 次追问。
每次追问最多生成 1 道小练习。
```

如果用户超过次数，提示：

```text
本次报告的 AI 错题追问次数已用完。你仍可以查看完整报告和 7 天建议。
```

第一版不做额外加购追问次数。

### 5.6 价格文案规范

1 元按钮建议：

```text
立即支付 1 元解锁
立即支付 1 元查看完整初判
```

避免使用：

```text
立即支付 1 元查看完整报告
```

9.9 元按钮建议：

```text
9.9 元解锁完整分析
立即支付 9.9 元
查看完整提分报告
```

错题追问权益文案建议：

```text
完整报告包含关键错题讲解和 AI 追问，让孩子不懂的地方可以继续问。
```

避免使用：

```text
AI 一对一名师陪讲
包教包会
不限次数讲到会
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
查看完整报告 / 错题卡片 / 保存报告 / 返回首页
```

### 6.2 AI 错题追问流程

```text
完整提分报告页
↓
用户找到某道错题卡片
↓
点击「让 AI 老师讲给孩子听」
↓
打开错题追问抽屉 / 展开区
↓
展示当前题目、知识点、错因、讲解目标
↓
用户点击固定按钮：
- 我不懂这一步
- 换一种方式讲
- 给我更简单例子
- 出一道类似题
- 检查我会不会了
↓
AI 围绕当前错题生成讲解 / 小练习
↓
系统记录 question_interaction
↓
如果有小练习，用户可提交答案
↓
AI 判断答案并生成互动小结
↓
用户关闭追问区，回到完整报告
```

### 6.3 用户稍后查看流程

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

### 6.4 失败流程

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

#### 错题追问失败

```text
用户点击追问按钮
↓
AI 追问生成失败
↓
页面提示：这次讲解生成失败，可以重新试一次
↓
用户可重试或关闭追问区
```

错误原因：

```text
question_context_missing：题目上下文缺失
interaction_quota_exceeded：追问次数已用完
ai_tutor_timeout：AI 讲解超时
ai_tutor_failed：AI 讲解失败
unsafe_input：输入内容不适合继续讲解
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
- 产品名：AI提分教练
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
我确认上传的资料用于生成本次 AI提分教练。系统将基于图片中的题目、作答痕迹和分数信息进行分析。若资料不清晰或缺少作答过程，AI 可能只能给出初步判断或疑似错因。
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
- 标题：AI提分教练

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

| 后端状态 | 前端进度建议 | 展示文案 |
|---|---:|---|
| uploaded | 10% | 正在读取资料 |
| preview_analyzing | 30%-80% | 正在定位主要丢分点 |
| preview_done | 100% | 初判预览已生成 |
| preview_failed | - | 处理失败 |
| low_quality | - | 资料不清晰 |
| full_analyzing | 30%-90% | 正在生成完整提分报告 |
| full_done | 100% | 完整报告已生成 |

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
question_context_missing：错题上下文缺失
interaction_quota_exceeded：追问次数已用完
ai_tutor_failed：AI 错题追问失败
unknown：未知错误
```

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
4. 不展示错题追问；
5. 锁定区域必须明显；
6. 不要让用户误以为已经看到完整报告。

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
- 完整报告包含关键错题讲解和 AI 追问

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
  "upgradeReason": "完整分析将进一步给出丢分地图、优先补弱顺序、7 天行动建议和错题追问。"
}
```

---

### C08 解锁完整分析页

#### 页面目标

让用户理解 9.9 元买到的不是“更多文字”，而是完整提分路径和错题学习入口。

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
- 关键错题可继续追问

五宫格权益：
- 详细丢分点
- 优先补弱顺序
- 7 天行动建议
- 完整学习建议
- AI 错题追问

价格区：
- 9.9 元
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
AI 名师包教会
```

可以写：

```text
帮助你看清优先补什么
生成可执行的 7 天建议
关键错题可继续追问
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
- 关键错题
- 7 天建议
- 下一步建议

提示卡：
- 关键错题支持 AI 继续讲解

底部按钮：
- 查看完整报告
- 保存报告
- 回到首页
```

---

### C10 PDF 式完整报告页

#### 页面目标

让用户感觉这是“一份完整、正式、可保存的提分报告”，同时提供关键错题继续学习入口。

#### 页面结构

```text
顶部：
- 返回按钮
- 标题：完整报告

Tab：
- 报告预览
- 完整报告

报告纸张卡：
- 品牌：AI提分教练
- 报告类型：初一数学 · 月考分析
- 标题：初一数学提分分析报告
- 班级 / 姓名 / 日期 可留空或隐藏

报告模块：
1. 核心判断
2. 主要丢分点
3. 优先补弱点
4. 关键错题卡片
5. 7 天建议
6. 下一步建议

关键错题卡片：
- 原题
- 学生作答
- 正确答案
- 知识点
- 错因诊断
- 讲解摘要
- 按钮：让 AI 老师讲给孩子听

底部：
- 返回
- 下载 PDF / 保存报告
```

#### 关键错题卡片结构

```text
错题 1：单项式乘单项式
- 原题：3a² · (-4a³)
- 学生作答：-12a⁶
- 正确答案：-12a⁵
- 知识点：单项式乘单项式 / 同底数幂相乘
- 错因：指数相加规则不清楚
- 讲解摘要：先分数字部分和字母部分处理
- 互动入口：让 AI 老师讲给孩子听
```

#### PDF 下载规则

##### 方案 A：保留按钮，必须实现下载

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
- 我的权益 / 已购权益 / 内测权益
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
错题追问剩余次数
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

| 状态 | 跳转页面 |
|---|---|
| 分析中 | AI 分析中页 |
| 初判预览已生成 | 初判报告预览页 |
| 1 元初判已解锁 | AI 初判结果页 |
| 完整报告已解锁 | 完整提分报告入口页 |
| 待补资料 | 上传资料页 |
| 处理失败 | 处理失败页 |

---

### C13 AI 错题追问区

#### 页面形态

第一版不做独立页面，推荐三种实现方式：

```text
方案 A：错题卡片内展开区
方案 B：底部抽屉
方案 C：半屏弹窗
```

优先推荐：

```text
底部抽屉 / 半屏弹窗
```

原因：

1. 不破坏完整报告结构；
2. 用户能清楚知道自己仍在当前错题上下文内；
3. 关闭后回到原错题卡片；
4. 开发比完整聊天页轻。

#### 页面目标

让学生围绕当前错题继续追问，而不是进入开放聊天。

#### 页面结构

```text
顶部：
- 标题：AI 老师讲这道题
- 关闭按钮
- 剩余追问次数：如 8/10

题目上下文卡：
- 当前题目
- 知识点
- 学生错因
- 当前讲解目标

AI 讲解区：
- 默认讲解 / 本轮回复
- 可支持简易结构图 / 步骤卡片 / 字母卡片

快捷按钮：
- 我不懂这一步
- 换一种方式讲
- 给我更简单例子
- 出一道类似题
- 检查我会不会了

小练习区：
- 题目
- 输入答案
- 提交检查
- AI 反馈

底部提示：
- AI 只围绕当前错题讲解
- 如果资料不完整，部分判断可能是疑似错因
```

#### 固定按钮定义

| 按钮 | actionType | AI 输出目标 |
|---|---|---|
| 我不懂这一步 | explain_step | 针对当前步骤重新拆解 |
| 换一种方式讲 | explain_differently | 用另一种表征方式讲，如字母卡片、数轴、天平模型 |
| 给我更简单例子 | simpler_example | 用更小数字或更简单题先讲 |
| 出一道类似题 | similar_question | 生成一题同类小练习 |
| 检查我会不会了 | check_mastery | 生成检测题或检查用户答案 |

#### 交互限制

```text
每道错题最多 3 次追问
每份报告最多 10 次追问
一次追问最多生成 1 道小练习
不开放无限自由聊天
自由输入最多 50 字，可选
```

#### 自由输入处理

第一版可以不做自由输入。如果保留自由输入，必须限制：

```text
只能追问当前错题相关内容；
超过当前题目范围时，AI 需要引导回当前题；
不回答与学习无关内容；
不回答娱乐、情感、危险行为等无关问题。
```

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
    "下一步建议",
    "关键错题讲解"
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
  "wrongQuestionCards": [
    {
      "questionId": "q_001",
      "questionNo": "3",
      "questionText": "3a² · (-4a³)",
      "studentAnswer": "-12a⁶",
      "correctAnswer": "-12a⁵",
      "knowledgePoint": "单项式乘单项式 / 同底数幂相乘",
      "chapter": "初一数学｜整式的乘法｜单项式乘单项式",
      "errorCause": "同底数幂相乘时指数相加规则不清楚",
      "diagnosisStatus": "确定错因",
      "explanationSummary": "先分数字部分和字母部分处理：3×(-4)=-12，a²·a³=a⁵。",
      "interactionEnabled": true,
      "actionButtons": [
        "explain_step",
        "explain_differently",
        "simpler_example",
        "similar_question",
        "check_mastery"
      ]
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

### 8.4 AI 错题追问响应结构

```json
{
  "interactionId": "int_001",
  "questionId": "q_001",
  "actionType": "explain_differently",
  "replyType": "multi_representation_explanation",
  "representationType": "letter_cards",
  "contentMarkdown": "我们换成字母卡片来理解：a² 表示两个 a 相乘，也就是 [a][a]；a³ 表示三个 a 相乘，也就是 [a][a][a]。合起来一共有 5 个 a，所以 a²·a³=a⁵。",
  "microPractice": {
    "question": "2a² · 5a³ = ?",
    "answer": "10a⁵",
    "explanation": "数字部分 2×5=10；字母部分 a²·a³=a⁵，所以答案是 10a⁵。"
  },
  "interactionSummary": "学生疑似卡在同底数幂相乘时指数相加规则，可继续用字母卡片法训练。",
  "remainingQuota": {
    "orderRemaining": 8,
    "questionRemaining": 2
  }
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

### 9.5 AI 错题追问规则

AI 错题追问必须遵守：

```text
只能围绕当前错题、当前知识点、当前错因讲解。
不要扩展到无关内容。
不要和学生闲聊。
不要评价学生智力、态度、性格。
如果学生说不懂，不能重复原讲解，必须换一种方式。
每次讲解后，尽量给一个小练习或确认问题。
语言要适合初一 / 初二学生理解。
```

### 9.6 二次讲解 / 多表征讲解机制

当学生点击：

```text
我不懂这一步
换一种方式讲
再讲简单一点
```

AI 必须启动二次讲解机制：

```text
1. 先判断可能卡点：概念、规则、步骤、符号、前置知识；
2. 换一种表征方式；
3. 用更小例子先讲；
4. 回到原题；
5. 给一道即时小练习；
6. 输出互动小结。
```

不同题型优先表征：

| 题型 | 优先讲解方式 |
|---|---|
| 有理数 | 数轴 |
| 一元一次方程 | 天平模型 |
| 单项式 / 整式 / 指数运算 | 结构拆解图、字母卡片 |
| 几何题 | 图形标注、角关系图、线段关系图 |
| 应用题 | 数量关系表、流程图、等量关系图 |

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
full：可看完整 AI 提分报告与错题追问
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

### 10.5 错题追问状态

错题追问不改变订单主状态，只记录互动状态：

```text
created
processing
done
failed
quota_exceeded
```

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
  interaction_quota_total INTEGER DEFAULT 0,
  interaction_quota_used INTEGER DEFAULT 0,
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

说明：

1. 9.9 元支付成功后，`interaction_quota_total` 可设置为 10；
2. 每次成功追问后，`interaction_quota_used + 1`；
3. 若暂不上线追问功能，两个字段可先保留。

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
question_interaction
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
3. `full` 用于 9.9 元完整提分报告；
4. 完整报告中的 `wrongQuestionCards` 可以先存入 `analysis_json`，也可以拆入 `diagnosis_questions`。

---

### 11.6 diagnosis_questions 错题卡片表

```sql
CREATE TABLE diagnosis_questions (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_order_id BIGINT REFERENCES diagnosis_orders(id),
  decision_id BIGINT REFERENCES diagnosis_decisions(id),
  question_no VARCHAR(32),
  question_text TEXT,
  student_answer TEXT,
  correct_answer TEXT,
  knowledge_point VARCHAR(256),
  chapter VARCHAR(256),
  error_cause TEXT,
  diagnosis_status VARCHAR(64),
  explanation_summary TEXT,
  interaction_enabled BOOLEAN DEFAULT TRUE,
  source_payload_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

`diagnosis_status`：

```text
确定错因
疑似错因
资料不足
```

说明：

1. 只有 9.9 元完整报告生成后，才需要生成错题卡片；
2. 如果无法识别具体错题，可以不生成 `diagnosis_questions`，只展示整体报告；
3. 错题追问必须基于本表题目上下文，不允许脱离上下文。

---

### 11.7 question_interactions 错题追问记录表

```sql
CREATE TABLE question_interactions (
  id BIGSERIAL PRIMARY KEY,
  diagnosis_order_id BIGINT REFERENCES diagnosis_orders(id),
  question_id BIGINT REFERENCES diagnosis_questions(id),
  user_id BIGINT REFERENCES users(id),
  action_type VARCHAR(64) NOT NULL,
  user_input TEXT,
  status VARCHAR(64) DEFAULT 'created',
  ai_response_json JSONB,
  micro_practice_json JSONB,
  practice_user_answer TEXT,
  practice_result_json JSONB,
  interaction_summary TEXT,
  error_code VARCHAR(128),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

`action_type`：

```text
explain_step
explain_differently
simpler_example
similar_question
check_mastery
free_input
```

`status`：

```text
created
processing
done
failed
quota_exceeded
```

说明：

1. 第一版可不做 `free_input`；
2. 每次成功互动记录一次；
3. 若互动失败，也应记录失败原因；
4. `interaction_summary` 用于后续分析学生真实卡点。

---

### 11.8 payments 支付表

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

支付成功规则：

```text
1 元支付成功：
- access_level = basic
- status = basic_unlocked

9.9 元支付成功：
- access_level = full
- status = full_paid / full_analyzing / full_done
- interaction_quota_total = 10
- interaction_quota_used = 0
```

---

### 11.9 report_exports 报告导出表

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

### 11.10 feedbacks 用户反馈表

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
设置 interaction_quota_total = 10
设置 interaction_quota_used = 0
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
  "decision": {},
  "wrongQuestionCards": [],
  "interactionQuota": {
    "total": 10,
    "used": 2,
    "remaining": 8
  }
}
```

---

### 12.11 获取报告错题卡片列表

```http
GET /api/diagnosis-orders/{orderId}/questions
```

权限：

```text
只有 access_level = full 时可访问。
```

响应：

```json
{
  "items": [
    {
      "questionId": "q_001",
      "questionNo": "3",
      "questionText": "3a² · (-4a³)",
      "studentAnswer": "-12a⁶",
      "correctAnswer": "-12a⁵",
      "knowledgePoint": "单项式乘单项式 / 同底数幂相乘",
      "chapter": "初一数学｜整式的乘法｜单项式乘单项式",
      "errorCause": "同底数幂相乘时指数相加规则不清楚",
      "diagnosisStatus": "确定错因",
      "explanationSummary": "先分数字部分和字母部分处理。",
      "interactionEnabled": true,
      "questionRemaining": 3
    }
  ]
}
```

---

### 12.12 发起 AI 错题追问

```http
POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interact
```

权限：

```text
只有 access_level = full 时可调用。
用户必须属于该订单。
订单追问次数未用完。
该题追问次数未超过限制。
```

请求：

```json
{
  "actionType": "explain_differently",
  "userInput": ""
}
```

响应：

```json
{
  "interactionId": "int_001",
  "status": "done",
  "replyType": "multi_representation_explanation",
  "representationType": "letter_cards",
  "contentMarkdown": "我们换成字母卡片来理解...",
  "microPractice": {
    "question": "2a² · 5a³ = ?",
    "answerInputType": "text"
  },
  "interactionSummary": "学生疑似卡在同底数幂相乘时指数相加规则。",
  "remainingQuota": {
    "orderRemaining": 8,
    "questionRemaining": 2
  }
}
```

错误响应：

```json
{
  "status": "failed",
  "errorCode": "interaction_quota_exceeded",
  "message": "本次报告的 AI 错题追问次数已用完。"
}
```

---

### 12.13 提交小练习答案

```http
POST /api/question-interactions/{interactionId}/practice-answer
```

请求：

```json
{
  "answer": "10a^5"
}
```

响应：

```json
{
  "isCorrect": true,
  "feedback": "答对了。数字部分 2×5=10，字母部分 a²·a³=a⁵，所以答案是 10a⁵。",
  "masterySignal": "likely_understood"
}
```

---

### 12.14 获取某道题互动记录

```http
GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions
```

权限：

```text
只有订单所属用户可访问。
```

响应：

```json
{
  "items": [
    {
      "interactionId": "int_001",
      "actionType": "explain_differently",
      "contentMarkdown": "",
      "microPractice": {},
      "interactionSummary": "",
      "createdAt": ""
    }
  ]
}
```

---

### 12.15 保存报告

```http
POST /api/diagnosis-orders/{orderId}/save-report
```

说明：

将报告标记为已保存，确保“我的报告”可见。

---

### 12.16 获取我的报告列表

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
      "interactionQuotaRemaining": 0,
      "createdAt": "2026-05-22T10:00:00Z"
    }
  ]
}
```

---

### 12.17 提交反馈

```http
POST /api/diagnosis-orders/{orderId}/feedback
```

请求：

```json
{
  "decisionLevel": "full",
  "rating": "very_helpful",
  "feedbackTags": ["判断清楚", "知道下一步怎么做", "孩子可以继续问"],
  "feedbackText": "感觉比单纯讲题更有用"
}
```

---

### 12.18 PDF 导出

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
| full | 初判预览 + 完整初判 + 完整报告 + 错题追问 |

### 13.2 错题追问访问规则

| 条件 | 是否允许 |
|---|---|
| access_level = full | 允许 |
| access_level = basic | 不允许正式追问，可展示样例 |
| access_level = preview | 不允许 |
| 非订单所属用户 | 不允许 |
| 追问次数已用完 | 不允许 |
| 题目上下文缺失 | 不允许 |

### 13.3 防止越权

必须校验：

```text
当前用户是否属于该订单
当前用户是否拥有对应 access_level
报告是否已经生成
支付状态是否真实 paid
错题卡片是否属于该订单
追问次数是否充足
```

### 13.4 支付后恢复

如果用户支付成功但页面关闭：

```text
下次进入首页
↓
最近报告显示对应状态
↓
用户点击后继续进入对应报告页
↓
如果已解锁 9.9 元完整报告，仍可继续查看错题追问剩余次数
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
10. 完整报告页要像纸质报告，不要像普通列表；
11. 错题追问区必须明显属于当前错题上下文；
12. 错题追问按钮不能像普通闲聊入口；
13. 剩余追问次数要可见；
14. 小练习反馈要清晰区分“答对 / 答错 / 需要再看”。

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
是否生成错题卡片
错题卡片数量
错题追问总次数
每类 actionType 次数
小练习提交次数
小练习正确率
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
10. AI 输出不得对孩子人格、智力、态度做负面标签；
11. 错题追问记录也属于学习数据，必须按同样权限保护；
12. 不允许把一个孩子的错题追问内容展示给其他用户。

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
AI 名师包教会
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
这一步可能卡在规则理解上
我们换一种方式讲
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
14. 完整报告页可以展示关键错题卡片；
15. 错题卡片下方可以打开 AI 错题追问区；
16. AI 错题追问区可以使用固定按钮；
17. AI 错题追问可以返回讲解、小练习和互动小结；
18. 追问次数限制生效；
19. 未支付 9.9 元用户不能正式使用错题追问；
20. 如果显示下载 PDF 按钮，必须能下载 PDF；
21. 处理失败页可以重新分析、重新上传、返回首页；
22. 我的页面可以进入我的报告；
23. 我的报告可以恢复分析中 / 已完成 / 失败报告；
24. 用户可以提交反馈；
25. 所有核心数据可以入库；
26. 运营可以导出核心数据。

### 17.2 业务验收

第一轮小流量测试目标：

```text
访问人数：≥ 300
上传资料人数：≥ 30
初判预览完成人数：≥ 25
1 元支付人数：≥ 8
9.9 元支付人数：≥ 2
完整报告反馈人数：≥ 2
错题追问点击人数：≥ 1
错题追问总次数：≥ 3
```

理想转化目标：

```text
访问 → 上传：≥ 10%
上传 → 初判预览完成：≥ 80%
初判预览 → 1 元支付：≥ 25%
1 元支付 → 9.9 元支付：≥ 20%
完整报告 → 错题追问点击：≥ 30%
错题追问用户 → 提交小练习：≥ 30%
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
错题追问生成成功率 ≥ 85%
报告访问权限正确
错题追问权限正确
用户只能查看自己的报告和互动记录
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
| 错题追问准确性 | 围绕当前错题，不跑偏 |
| 二次讲解质量 | 不重复原讲解，能换一种方式 |
| 小练习质量 | 与当前知识点一致，不超纲 |

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

### P0.5：强烈建议首版完成

```text
查看样例
PDF 下载
订单记录
购买记录
报告保存
再次上传资料重新分析
完整报告错题卡片
报告内嵌 AI 错题追问入口
固定按钮式追问
每次追问生成小练习
互动小结记录
追问次数限制
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
自由输入式追问
错题追问历史展示优化
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
独立 AI 陪讲页
开放式聊天系统
语音陪讲
视频讲解
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
错题卡片生成
保存报告
反馈
```

验收：

```text
支付 9.9 元后，用户可查看完整报告，未支付用户不能访问。
完整报告中至少能展示关键错题卡片。
```

---

### 阶段四：跑通 AI 错题追问

目标：

```text
用户可以在完整报告的错题卡片中进行轻量 AI 追问。
```

任务：

```text
diagnosis_questions 表
question_interactions 表
错题卡片 UI
AI 错题追问抽屉
固定按钮 actionType
追问 API
小练习生成
小练习答案检查
追问次数限制
互动小结入库
```

验收：

```text
用户点击某道错题的“让 AI 老师讲给孩子听”后，可以获得围绕当前错题的讲解、小练习和互动小结。
未支付 9.9 元用户不能调用追问 API。
追问次数用完后不能继续调用。
```

---

### 阶段五：稳定性与数据导出

目标：

```text
系统可运营，可复盘转化数据。
```

任务：

```text
AI 重试
失败原因记录
支付状态补偿
错题追问失败记录
数据导出脚本
报告抽检
互动抽检
埋点统计
```

验收：

```text
可以导出上传、支付、报告、反馈、错题追问和失败数据。
```

---

## 20. AI 提示词要求

### 20.1 提分决策系统角色

```text
你是一个面向初高中家长的 AI提分教练分析师。

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
不要输出错题追问内容。
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
六、关键错题卡片
七、7 天行动建议
八、完整学习建议
九、下一步建议
```

### 20.5 AI 错题追问系统角色

```text
你是一个面向初一 / 初二学生的 AI 错题讲解老师。

你只能围绕当前错题、当前知识点、当前错因进行讲解。
你不能回答与当前错题无关的问题。
你不能和学生闲聊。
你不能评价学生智力、人格、态度。
你不能承诺提分。
你不能说“包教会”“一定会”。

你的讲解目标是：
1. 找到学生可能卡住的地方；
2. 换一种更容易理解的方式讲；
3. 用更小例子过渡；
4. 回到原题；
5. 给一道小练习检查理解。
```

### 20.6 AI 错题追问输出格式

```json
{
  "replyType": "",
  "representationType": "",
  "contentMarkdown": "",
  "microPractice": {
    "question": "",
    "answer": "",
    "explanation": ""
  },
  "interactionSummary": "",
  "masterySignal": "unknown|likely_understood|still_confused"
}
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
建议解锁完整分析，查看完整提分路径和关键错题讲解
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
关键错题可继续追问
```

按钮：

```text
立即支付 9.9 元
```

### 21.8 错题追问入口文案

```text
让 AI 老师讲给孩子听
```

或：

```text
继续问这道题
```

按钮：

```text
我不懂这一步
换一种方式讲
给我更简单例子
出一道类似题
检查我会不会了
```

提示：

```text
AI 会围绕当前错题讲解，不会跳到其他内容。
```

### 21.9 失败页文案

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
用户愿意再次上传或推荐给其他家长；
用户愿意点击关键错题进行 AI 追问；
错题追问后，用户反馈“孩子更容易听懂”。
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
错题追问经常跑偏；
错题追问讲解不如报告本身；
AI 成本明显高于收入。
```

---

## 23. 后续迭代方向

### V1.4：提升转化

```text
优化初判预览内容
增加样例报告
增加报告保存图片
增加重新上传
增加报告分享
增加人工复核入口
优化 9.9 元权益页中的“错题追问”展示
```

### V1.5：提升交付价值

```text
增加 7 天训练题
增加同类题推荐
增加复测题
增加二次诊断
增加报告 PDF 美化模板
优化 AI 错题追问的多表征讲解能力
```

### V1.6：轻后台

```text
订单管理
支付状态查看
报告状态查看
AI 失败重跑
Excel 导出
用户反馈查看
错题追问记录查看
```

### V2.0：机构合作

前提：

```text
已有真实家长上传数据；
已有 1 元和 9.9 元付费数据；
已有完整报告案例；
证明家长认为有帮助；
证明错题追问能提升报告价值；
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

### V2.1：独立 AI 陪讲页

前提：

```text
完整报告用户中，错题追问点击率较高；
学生愿意连续互动 10 分钟以上；
家长愿意为 7 天陪跑付费；
错题追问能沉淀明显复盘价值。
```

再做：

```text
学生学习空间
独立 AI 陪讲页
长期互动记录
阶段复盘
掌握度曲线
7 天陪跑
```

---

## 24. 结论

本版本的 MVP 不再只是：

```text
上传资料
↓
初判预览
↓
1 元初判
↓
9.9 元完整报告
```

而是进一步升级为：

```text
上传资料
↓
初判预览
↓
1 元初判
↓
9.9 元完整报告
↓
报告内嵌 AI 错题追问
↓
小练习与互动小结
↓
我的报告留存
↓
用户反馈
```

当前阶段仍然不做机构端，也不做独立 AI 陪讲页。

最重要的产品边界是：

> **AI 错题追问是完整报告的增强能力，不是独立聊天产品。**

这样既能提升 9.9 元完整报告的价值感，又不会把 MVP 做重。

第一版要先把以下三件事跑通：

```text
1. 家长愿意上传真实资料；
2. 家长愿意为 AI提分教练支付 1 元和 9.9 元；
3. 家长 / 学生愿意在关键错题上继续追问。
```

只要这三点成立，后续才有基础继续扩展：

```text
7 天训练
同类题推荐
复测题
学生轻档案
机构合作
独立 AI 陪讲页
```
