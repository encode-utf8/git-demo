# 分支验收清单：feature/chat-assistant

- 关联文档：`docs/parallel-dev-plan.md`、`docs/design.md` 第 8 节
- 负责里程碑：M3 对话助手

## 角色与目标

实现类 ChatGPT 聊天界面、多轮上下文记忆、SSE 流式输出与工具调用，对话记录持久化。

## 可修改范围

- `lib/agent/chat/`
- chat 相关路由/页面/组件
- `conversations`/`messages` 的 store 使用

## 禁止修改

- `data-service/`、`lib/search/`、`lib/scheduler/`、`lib/cache/`
- 共享已冻结类型

## 验收清单

- [x] 聊天界面可用
- [x] `POST /api/chat`（SSE）流式输出正常
- [x] 多轮上下文正确
- [x] 工具调用可用：get_quote/get_kline/get_indicators/search_news/get_report/save_report
- [x] 对话记录写入 store 接口
- [x] 回答可追溯引用数据
- [x] 禁止“必涨/必跌”护栏生效
- [x] 回答附风险提示
- [x] 连续 3 轮以上追问上下文正确
- [x] `pnpm typecheck` 通过
- [x] 代码注释为中文，密钥未提交

## 验证命令

```bash
pnpm typecheck
pnpm dev
# 在聊天界面连续追问 3 轮以上，核对上下文与引用来源
```

## 完成记录

- 完成日期：2026-09-01
- 自测轮数：3 轮以上
- 结果：全部通过；真实 DeepSeek 流式对话由 `feature/llm-chat` 落地。
- 备注：流式开始即回传 `meta` 会话 ID，修复多轮追问上下文丢失问题。
