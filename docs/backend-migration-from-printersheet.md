# printersheet 后台能力迁移候选清单

日期：2026-06-22

本文件记录 `C:\LYH\Code\scoremap` 与 `C:\LYH\Code\printersheet` 的只读对比结论。用户确认迁移范围前，不执行代码迁移。

## 当前状态

`scoremap` 已有后端主链路：

- `server/src/app.js`：Express API，包含微信登录、用户资料、上传、诊断订单、支付、报告、错题交互等路由。
- `server/src/services/auth-service.js`：微信 code2Session、Bearer token、用户 upsert。
- `server/src/services/payments-service.js`：`basic` / `full` 两档权益解锁、幂等支付、回调、刷新、补偿修复。
- `server/src/adapters/wechat-pay-provider.js`：微信 JSAPI 支付、查询、通知解密/签名校验雏形。
- `server/src/db/local-json-db.js`：本地 JSON DB，当前业务表包括 `diagnosis_orders`、`payments`、`users`、`diagnosis_questions` 等。

`printersheet` 后台更成熟的能力集中在：

- `ai-exam-miniapp/server/src/adapters/cloudbaseDb.js`
- `ai-exam-miniapp/server/src/adapters/cloudbaseFile.js`
- `ai-exam-miniapp/server/src/adapters/payment.js`
- `ai-exam-miniapp/server/src/services/authService.js`
- `ai-exam-miniapp/server/src/services/orderService.js`
- `ai-exam-miniapp/server/src/services/entitlementService.js`
- `ai-exam-miniapp/server/src/lib/plans.js`

两个项目后端模块格式不同：`scoremap` 是 CommonJS + Express 5，`printersheet` 是 ESM + Express 4。因此不能直接复制覆盖，需要按能力移植。

## 推荐迁移范围

### 1. 后台数据库/CloudBase 适配：推荐首批迁移

目标：在不破坏 `scoremap` 现有 API 和表名的前提下，增加 `DB_PROVIDER=local|cloudbase` 和可选 `FILE_PROVIDER=local|cloudbase`。

迁移内容：

- 参考 `printersheet` 的 CloudBase adapter 结构，为 `scoremap` 实现 CloudBase DB adapter。
- 保留 `scoremap` 当前 `LocalJsonDbAdapter` 的方法契约：`insert`、`upsert`、`update`、`read`、`find`、`all`、`assertReadback`。
- 映射 `scoremap` 当前表：`users`、`diagnosis_orders`、`upload_files`、`ai_analysis_tasks`、`diagnosis_decisions`、`diagnosis_questions`、`question_interactions`、`ai_model_traces`、`payments`、`report_exports`、`feedbacks`。
- 只在配置开启时使用 CloudBase；本地测试继续默认走 local。

风险：

- CloudBase SDK 是新增依赖，需确认是否允许添加 `@cloudbase/node-sdk`。
- 现有测试大量依赖本地 DB 同步读写；CloudBase adapter 可能需要异步化边界或包装策略。

建议：优先做 DB adapter 设计与本地测试兼容层，避免一次性改全链路。

### 2. 微信支付增强：推荐首批迁移

目标：保持 `scoremap` 当前 `basic` / `full` 支付解锁模型，只吸收 `printersheet` 更完整的微信支付安全实现。

迁移内容：

- 商户证书与私钥匹配校验。
- 付款通知签名校验和 AES-256-GCM 解密流程细节。
- 微信支付查询后的金额、appid、mchid、payer openid 校验。
- `PAYMENT_TEST_MODE` / `WECHAT_PAY_TEST_AMOUNT_CENTS` 的测试金额配置能力，但不改变正式价格。

不迁移：

- 不把 `printersheet` 的商品套餐订单模型直接替换 `scoremap` 的 `payments` 模型。

风险：

- 需要确保现有测试 `server/test/wechat-auth-upload-payment.test.js` 和 `server/test/payment-api.test.js` 仍覆盖 `basic/full` 主链路。

### 3. 微信登录增强：推荐首批迁移

目标：保留 `scoremap` 现有登录接口，补充错误提示和网络 fallback。

迁移内容：

- 参考 `printersheet` 的 code2Session fallback：`fetch` 失败时尝试 Node `https` 请求。
- 更友好的微信错误码提示：`40029`、`40125`、`40013`、`resource not found`。
- 保持生产环境禁止 `mockOpenid`。

谨慎项：

- `printersheet` 新用户会创建点数账户并赠送 3 点；这依赖点数体系。若不迁移点数/会员，不应迁移这部分。

## 暂不推荐默认迁移

### 4. 点数/会员/套餐/权益体系：需产品确认后再迁移

`printersheet` 有完整的：

- `point_accounts`
- `point_ledger`
- `orders`
- `memberships`
- `PRICING_PLANS`
- `POINT_PACKS`
- `EntitlementService`

但 `scoremap` 当前 PRD 多处明确：MVP 不做真实订阅会员体系、复杂后台或机构线索后台。因此这部分不应作为默认后台迁移项。

只有当产品方向确认从“单次报告付费”升级为“点数/会员/套餐制”时，才建议迁移。

## 建议确认口径

推荐执行：

```text
OK，迁移 1+2+3
```

可选执行：

```text
OK，迁移 1
OK，迁移 2+3
OK，迁移 1+2+3+4
```

若选择 `4`，需要同步调整小程序页面、订单记录、我的页面、商品展示和权益文案，范围明显扩大。

## 验证建议

迁移后至少执行：

- `npm test`
- `npm run e2e:api-db`
- `npm --prefix server test`
- 针对新增 CloudBase/支付配置分支的单元测试

真实微信支付和 CloudBase 联调需要在显式配置真实环境变量后单独做，不应作为默认测试路径。
