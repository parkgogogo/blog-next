# Requirements

我需要新增一个 daily words 页面

- 页面路径设计为 `words/daily`

- 主要使用 task 接口，内部交互和 memory/event 相关（更新 memory 系统分数）

- 页面设计类似于 story（wordSheet 也是一致），风格可以完全一致，但更简洁（没有标题副标题等），整个页面只有一个 sentence 的展示，淡入进来（有个从下而上的淡入效果）

- 页面还有几个重要的 action button，作用是用来切换上下卡组

- 在最后一张卡有一个确定完成今日任务的 action，主要跟 /memory/event 中的接口相关

- 完成今日任何后，设计一个简单的粒子效果（类似礼花），来恭喜用户完成了今日的 task

- 打开 wordSheet 要正确使用 /memory/event 上报

- /memory/event 中好像有曝光的接口，一个单词的曝光的逻辑如下，切换到下一张卡片时，曝光上一张卡片的单词

- 设计 token 和 风格与 workds 其他页面保持一致

## Clarifications (2026-01-31)

- 数据流：所有请求走 server action，不暴露 API key。

- Task 日期：使用“今天”的任务（当日 task_date）。

- wordSheet：不翻译 task 句子；只展示该词原本上下文内容，避免泄漏其他词义。

- memory/event 语义：
  - open_card 仅对用户点击打开的词上报。
  - open_card 与 mark_unknown 在评分逻辑上等价（fail_count + 1，memory_score - 1）。
  - 卡片切换时，对上一张卡里未 open_card 的词上报 mark_known。
  - 最后一张卡完成时，同样为未 open_card 的词上报 mark_known。
