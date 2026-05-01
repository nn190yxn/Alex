# 支付回调接口文档

## 基本信息
- **接口地址**: `POST /api/payment/callback`
- **认证方式**: 签名校验（必选）
- **内容类型**: `application/json`

## 签名算法

```
sign = HMAC-SHA256(orderId:status, PAYMENT_CALLBACK_SECRET)
```

其中 `PAYMENT_CALLBACK_SECRET` 为通信双方共享的密钥。

## 请求参数

| 参数名   | 类型   | 必填 | 说明                              |
|---------|--------|------|----------------------------------|
| orderId | number | 是   | 订单 ID                          |
| status  | string | 是   | 状态：`paid` / `failed` / `pending` |
| sign    | string | 是   | HMAC-SHA256 签名（64位十六进制）   |

## 签名示例

假设：
- `orderId = 123`
- `status = paid`
- `PAYMENT_CALLBACK_SECRET = secret123`

则签名字符串为：`123:paid`
签名结果为：`HMAC-SHA256("123:paid", "secret123")` 的十六进制输出。

## 状态说明

| 状态     | 说明           |
|---------|----------------|
| paid    | 支付成功        |
| failed  | 支付失败        |
| pending | 支付中/待确认    |

## 幂等性

- 同一订单多次回调 `paid` 状态不会重复更新会员
- 订单状态已为 `paid` 时，再次收到 `paid` 回调返回成功但不重复执行

## 响应

| HTTP 状态码 | 响应内容               | 说明                 |
|------------|----------------------|----------------------|
| 200        | `{ message: "支付成功" }` | 处理成功              |
| 400        | `{ message: "参数不完整" }` | 参数校验失败          |
| 400        | `{ message: "状态无效" }` | 状态值不在白名单内     |
| 401        | `{ message: "签名校验失败" }` | 签名不匹配            |
| 404        | `{ message: "订单不存在" }` | 订单 ID 不存在        |
| 500        | `{ message: "支付回调配置缺失" }` | 服务端未配置密钥      |
