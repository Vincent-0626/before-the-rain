(() => {
  const model = "qwen/qwen3.8-flash";
  const origin = "https://js.puter.com/v2/";
  const recentTurns = 8;
  let sdk;

  function load() {
    if (globalThis.puter?.ai?.chat) return Promise.resolve(globalThis.puter);
    sdk ??= new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = origin;
      script.async = true;
      script.onload = () => {
        if (globalThis.puter?.ai?.chat) resolve(globalThis.puter);
        else reject(new Error("Puter SDK unavailable"));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("Puter SDK could not load"));
      };
      document.head.append(script);
    }).catch(error => {
      sdk = undefined;
      throw error;
    });
    return sdk;
  }

  function messagesFor(profile, state, text) {
    const prompt = [
      "扮演中文互动小说中的虚构成年男性林知秋。用自然口语接玩家最新一句话，能听懂俚语、调侃、突然换话题和简短追问。",
      "先回应玩家当下的意思，再写动作。遇到 hi、hello、你好、嗨等问候，第一句直接用「你好」或「嗨」回礼，初见可以顺口报名字，别只写场景。",
      "你们平等相处。玩家想慢一点、拒绝或换话题时顺着对方的节奏。可以暧昧、打趣、描写虚构动作。多直接接话，别每轮都反问。用户可以把故事从书店带到其他地方。",
      "固定设定和已归档背景是正史。贴合之前说过的事实。有人说「看看你」，可用动作和外貌描写，不要声称发了照片。",
      "林知秋现在 26 岁，毕业后才到南汀工作。补这段经历时尊重时间线，没问到具体时间就不编年份或已经住了多久。",
      "问到档案还没有的角色经历，就即兴补一个与现有档案相容、具体可信的虚构细节，直接在回复里说出来。把这次真正告诉玩家的新背景同时放进 lore，方便以后记住。问为什么搬家要讲原因，不能又反问玩家的意思。",
      "角色资料 " + JSON.stringify(profile),
      "已经归档的背景 " + JSON.stringify(state.lore),
      "为常见背景优先复用这些条目 ID " + JSON.stringify(globalThis.RainLore.index),
      "应用已记录的剧情和玩家细节 " + JSON.stringify({
        plan: state.plan, familiarity: state.steps, pendingPlace: state.pending, player: state.memory
      }),
      '只输出一个 JSON 对象，格式 {"reply":"一到三句中文","warmed":false,"meeting":null,"lore":[]}。',
      'lore 每轮最多两条，每条为 {"key":"英文 snake_case 唯一键","label":"16 字内的中文题目","fact":"从 reply 中逐字摘取讲出新背景的一两句，180 字内"}。已有条目用旧事实答，不要在 lore 里覆写。用户的猜测、提议、当前心情、玩笑和未讲出的设定不进入档案。',
      '只有发生了相互了解或暧昧互动才令 warmed 为 true。只有双方已确认见面时间和地点才写 meeting，格式为 "时间 · 地点"，仅被提议、取消或没有新约定时填写 null。'
    ].join("\n");
    const history = state.turns.slice(-recentTurns).flatMap(turn => [
      ...(turn.user ? [{ role: "user", content: turn.user }] : []),
      { role: "assistant", content: turn.reply }
    ]);
    if (history[0]?.role === "assistant") {
      history.unshift({ role: "user", content: "（我走到靠窗的空位。）" });
    }
    return [{ role: "system", content: prompt }, ...history, { role: "user", content: text }];
  }

  function parseAnswer(result) {
    const content = result?.message?.content;
    const raw = typeof content === "string" ? content : Array.isArray(content)
      ? content.filter(part => part.type === "text").map(part => part.text).join("") : "";
    const body = raw.trim().replace(/^【?\x60{3}(?:json)?\s*|\s*\x60{3}】?$/gi, "").trim();
    const from = body.indexOf("{");
    const to = body.lastIndexOf("}");
    let payload;
    if (from >= 0 && to > from) {
      try { payload = JSON.parse(body.slice(from, to + 1)); } catch {}
    }
    const reply = (payload?.reply ?? (from < 0 ? body : "")).trim();
    if (!reply) throw new Error("The model returned no dialogue");
    const meeting = typeof payload?.meeting === "string" &&
      /^[^·\r\n]{1,24}\s·\s[^·\r\n]{1,24}$/.test(payload.meeting.trim()) ? payload.meeting.trim() : "";
    const dialogue = reply.slice(0, 480);
    const comparable = text => text.normalize("NFKC").replace(/[\s\p{P}]/gu, "");
    const spoken = comparable(dialogue);
    const lore = Array.isArray(payload?.lore) ? payload.lore.slice(0, 2).map(globalThis.RainLore.clean)
      .filter(entry => entry && comparable(entry.fact).length >= 5 && spoken.includes(comparable(entry.fact))) : [];
    return { reply: dialogue, warmed: payload?.warmed === true, meeting, lore };
  }

  async function generate(puter, profile, state, text, signal) {
    const response = await puter.ai.chat(messagesFor(profile, state, text), {
      model, max_tokens: 800, temperature: .75, signal
    });
    return parseAnswer(response);
  }

  async function rentedProvider(refresh = false) {
    if (!["127.0.0.1", "localhost"].includes(window.location.hostname)) return null;
    const announced = document.body.dataset.rainModel;
    if (!announced) return null;
    try {
      let ready = announced === "ready";
      if (refresh) {
        const check = await fetch("./api/model", { signal: AbortSignal.timeout(12000) });
        const service = check.ok ? await check.json() : null;
        ready = service?.provider === "rented-ollama" && service.ready === true;
      }
      return {
        label: "租用服务器 · Qwen3 8B", ready,
        ai: {
          async chat(messages, { signal }) {
            const response = await fetch("./api/chat", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messages }), signal
            });
            if (!response.ok) throw new Error("The rented model did not respond");
            return response.json();
          }
        }
      };
    } catch {
      return null;
    }
  }

  globalThis.RainModel = { load, generate, messagesFor, parseAnswer, rentedProvider };
})();
