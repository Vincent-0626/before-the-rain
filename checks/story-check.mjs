import test from "node:test";
import assert from "node:assert/strict";
import "../dist/lore.js";
import "../dist/story.js";
import "../dist/model.js";

const { reset, restore, reply, view } = globalThis.RainStory;
const play = (...messages) => messages.reduce(reply, reset());
const recent = state => state.turns.at(-1).reply;

test("开场的三条建议均有对应回复", () => {
  const suggestions = view(reset()).choices;
  assert.match(recent(play(suggestions[0])), /坐吧/);
  assert.match(recent(play(suggestions[1])), /旅行散文/);
  assert.match(recent(play(suggestions[2])), /林知秋/);
});

test("基本寒暄不会进入兜底，同时保留复合问题的主要意图", () => {
  for (const hello of ["hi", "Hi！", "ＨＥＬＬＯ", "你好", "你好呀！", "哈喽", "晚上好，林知秋", "👋"]) {
    assert.match(recent(play(hello)), /嗨.*你好/, hello);
  }
  assert.match(recent(play("hi", "你好")), /你好/, "重复问候");
  assert.match(recent(play("在干嘛啊？")), /等雨停/);
  assert.match(recent(play("你在吗？")), /在呢/);
  assert.match(recent(play("谢谢你")), /不客气/);
  assert.match(recent(play("你好吗")), /今天还不错/);
  assert.match(recent(play("你好，你为什么搬来南汀？")), /毕业.*杂志社/s);
  assert.equal(play("bye").ended, true);
});

test("提取称呼及喜好，经过存档后仍可回忆", () => {
  const state = restore(JSON.parse(JSON.stringify(play("我叫小余，我喜欢摄影"))));
  assert.deepEqual(state.memory, { name: "小余", hobby: "摄影" });
  assert.match(recent(reply(state, "你还记得我喜欢什么吗？")), /小余.*摄影/);
  assert.deepEqual(reply(state, "不要记住我").memory, {});
});

test("能将省略的喜好关联到前文话题", () => {
  assert.equal(play("你爱好拍照吗？", "我也喜欢").memory.hobby, "拍照");
});

test("保留待确认的地点，理解回复里的日期", () => {
  const early = play("明天一起去咖啡馆吗？");
  assert.equal(early.plan, "");
  const pending = play("你叫啥？", "我叫小余，我喜欢摄影", "一起去看摄影展吗？");
  assert.equal(pending.pending, "摄影展");
  const agreed = reply(pending, "下周六晚上");
  assert.equal(view(agreed).stage, 2);
  assert.equal(agreed.plan, "下周六晚上 · 摄影展");
  assert.match(recent(reply(agreed, "在哪见？")), /摄影展/);
});

test("拒绝优先于邀约，并且可以主动继续", () => {
  const state = play("你叫什么？", "我喜欢悬疑小说", "一起去看展吧？", "我不想约会");
  assert.equal(state.paused, true);
  assert.equal(state.pending, "");
  const alsoPaused = reply(state, "周末一起去咖啡馆");
  assert.equal(alsoPaused.plan, "");
  assert.equal(reply(alsoPaused, "继续聊吧").paused, false);
});

test("空输入不新增记录，离开后完成当前故事", () => {
  const initial = reset();
  assert.equal(reply(initial, " \n "), initial);
  const done = reply(initial, "我先走了");
  assert.equal(done.ended, true);
  assert.deepEqual(view(done).choices, []);
  assert.equal(reply(done, "继续聊吧"), done);
});

test("截图中的三句话在剧本模式也能接住，并且与档案一致", () => {
  const compliment = play("你咋这么帅");
  assert.match(recent(compliment), /不好意思/);
  const look = reply(compliment, "看看你");
  assert.match(recent(look), /刚才.*帅.*细框眼镜/);
  assert.match(recent(reply(look, "你住在哪？")), /南汀河西的老城区/);
  assert.match(recent(reply(look, "你做什么工作？")), /杂志做版式设计/);
});

test("自由对话将未命中的输入交给模型并附带真实会话历史和档案", async () => {
  const before = play("你住在哪？");
  const input = "那片老城区有没有人气很旺的夜市？";
  const { local, handled } = globalThis.RainStory.prepareCloudTurn(before, input);
  assert.equal(handled, false);
  const client = { ai: { chat(messages, options) {
    assert.match(messages[0].content, /南汀河西.*老城区/);
    assert.equal(messages.at(-1).content, input);
    assert.ok(messages.some(message => message.content === "你住在哪？"));
    assert.match(options.model, /qwen/);
    return { message: { content: JSON.stringify({
      reply: "有，周五晚上会摆摊。我下班有时拐进去买一个烤红薯。", warmed: false, meeting: null
    }) } };
  } } };
  const output = await globalThis.RainModel.generate(client, globalThis.RainStory.character, before, input);
  assert.match(recent(globalThis.RainStory.commitCloudTurn(before, local, output)), /烤红薯/);
});

test("没写过的搬家经历在剧本模式里补一次，换问法和刷新沿用原记录", () => {
  const first = play("为什么搬来南汀？");
  assert.match(recent(first), /毕业.*杂志社/s);
  assert.equal(first.lore[0].label, "搬来南汀的原因");
  assert.equal(first.lore[0].fact, recent(first));
  const restored = restore(JSON.parse(JSON.stringify(first)));
  const repeated = reply(restored, "你当初怎么来南汀的？");
  assert.equal(recent(repeated), recent(first));
  assert.equal(repeated.lore.length, 1);
  const followUp = reply(repeated, "那后来呢？");
  assert.equal(followUp.lore.at(-1).label, "刚来南汀的时候");
  assert.match(recent(followUp), /第一周|刚来的时候/);
  assert.deepEqual(reset().lore, []);
  const oldSave = { ...reset(), lore: undefined, lastLore: undefined };
  assert.deepEqual(restore(oldSave).lore, []);
});

test("模型新编的经历会归档，同一条目不能改口，也不会归档没说出来的事实", () => {
  const first = reset();
  const input = "第一笔稿费你怎么花的？";
  const { local } = globalThis.RainStory.prepareCloudTurn(first, input);
  const fact = "我拿第一笔稿费给自己买了一把黄色的伞。";
  const parsed = globalThis.RainModel.parseAnswer({ message: { content: JSON.stringify({
    reply: fact + "下再大的雨也能一眼认出来。",
    warmed: true,
    lore: [
      { key: "first_payment", label: "第一笔稿费", fact },
      { key: "umbrella_store", label: "买伞的店", fact: "我在邮局后面买的。" }
    ]
  }) } });
  const after = globalThis.RainStory.commitCloudTurn(first, local, parsed);
  assert.deepEqual(after.lore, [{ key: "first_payment", label: "第一笔稿费", fact }]);
  assert.match(globalThis.RainModel.messagesFor(globalThis.RainStory.character, after, "伞还留着吗？")[0].content,
    /已.*归档的背景.*黄色的伞/);

  const wrong = "我拿第一笔稿费买了一只猫。";
  const conflicting = { reply: wrong, lore: [{ key: "first_payment", label: "第一笔稿费", fact: wrong }] };
  const next = globalThis.RainStory.commitCloudTurn(after, reply(after, input), conflicting);
  assert.equal(recent(next), fact);
  assert.deepEqual(next.lore, after.lore);
});

test("模型说出了常见背景但漏填归档字段时，从实际回复提取", () => {
  const state = reset();
  const prompt = "你为什么搬来南汀？";
  const response = "我大学快毕业的时候，拿到了杂志社的工作邀请。那时我正好也想在河边生活一阵子。你来过河西吗？";
  const result = globalThis.RainStory.commitCloudTurn(state, reply(state, prompt), { reply: response, lore: [] });
  assert.equal(result.lore[0].label, "搬来南汀的原因");
  assert.match(result.lore[0].fact, /工作邀请.*河边/);
  assert.doesNotMatch(result.lore[0].fact, /你来过/);
});
