# 分支验收清单：feature/ai-analysis

- 关联文档：`docs/parallel-dev-plan.md`、`docs/design.md` 第 8 节
- 负责里程碑：M2 AI 资讯与分析

## 角色与目标

封装 Tavily 搜索与 DeepSeek 分析工作流，自动抓取资讯、判定影响周期并生成教学式分析报告。

## 可修改范围

- `lib/search/`
- `lib/agent/analysis/`
- 分析报告相关路由/页面/组件
- 只读使用 `lib/store/` 接口

## 禁止修改

- `data-service/`、`lib/agent/chat/`、`lib/scheduler/`、`lib/cache/`
- 共享已冻结类型

## 验收清单

- [ ] Tavily 搜索封装可用
- [ ] 资讯去重生效（URL 或 标题+来源+发布时间 哈希）
- [ ] 利好/利空/中性分类、置信度、`impact_days` 判定可用
- [ ] DeepSeek 分析工作流走通（规划→取数→分类→分析→教学→风险→落库）
- [ ] `POST /api/stocks/:code/analysis` 可用
- [ ] `GET /api/stocks/:code/news` 可用
- [ ] `GET /api/stocks/:code/reports` 可用
- [ ] 报告落库并展示
- [ ] 报告含来源、影响周期、风险提示
- [ ] 不输出“必然涨/必然跌”等确定性承诺
- [ ] `impact_days` 异常值回退默认（短期 7、长期 30）
- [ ] `pnpm typecheck` 通过
- [ ] 代码注释为中文，密钥未提交

## 验证命令

```bash
pnpm typecheck
pnpm dev
curl -X POST "http://127.0.0.1:3000/api/stocks/600519/analysis"
```

## 完成记录

- 完成日期：
- 自测股票：
- 结果：
- 备注：
