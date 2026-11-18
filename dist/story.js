(() => {
  const lore = globalThis.RainLore;
  const opening = "外面的雨一时半会儿停不了。这里还有个空位，要坐一会儿吗？";
  const character = {
    name: "林知秋",
    bio: "26 岁，男。读书时在外地，毕业后搬到虚构小城南汀，现在是一家城市杂志的版式设计师。说话慢一点，偶尔开自己玩笑。",
    home: "住在南汀河西的老城区，离梧桐书店步行十来分钟。平时会沿着河堤绕路回家，顺便看看路边的小店。",
    appearance: "黑色短发，戴一副细框眼镜。今天穿深灰色外套，肩头有一块刚被雨打湿的痕迹。",
    hobbies: "喜欢用胶片相机拍窗玻璃的倒影，也喜欢实体书、旅行散文和小型摄影展。咖啡通常点热美式。",
    scene: "今天是周五，他下班后到梧桐书店替同事取一本设计年鉴，刚好被骤雨留下。你们刚认识，他看你也在等雨，就把靠窗的空位让了出来。"
  };
  const maxTurns = 36;
  const scenes = {
    first: ["初遇 · 傍晚书店", "傍晚的骤雨把你留在一家旧书店。靠窗的人把包挪到脚边，为你空出一个位置。"],
    familiar: ["熟悉 · 靠窗的位置", "杯子里的热气快散了，雨声也轻了一点。你们聊起平时不会随便对陌生人讲的事。"],
    invited: ["约定 · 下一次见面", "窗上的水珠顺着玻璃往下滑。离开书店之前，你们给故事留了一个下次见面的理由。"],
    ended: ["结尾 · 街灯亮起", "雨停了，玻璃上还留着水痕。你合上书，带着这个傍晚的记忆走回街上。"]
  };

  function reset() {
    return {
      version: 1, turns: [{ user: "", reply: opening }], steps: 0,
      memory: {}, lore: [], lastLore: "", paused: false, ended: false, plan: "", pending: "", topic: "",
      lastIntent: ""
    };
  }

  function restore(candidate) {
    if (candidate?.version !== 1 || !Array.isArray(candidate.turns) ||
        !candidate.turns.length || !candidate.turns.every(item =>
          typeof item?.user === "string" && typeof item?.reply === "string")) return reset();
    const state = { ...reset(), ...candidate, turns: candidate.turns.slice(-maxTurns) };
    state.steps = Number.isInteger(state.steps) ? Math.max(0, Math.min(2, state.steps)) : 0;
    state.memory = Object.fromEntries(
      ["name", "hobby"].filter(key => typeof state.memory?.[key] === "string")
        .map(key => [key, state.memory[key].slice(0, 18)])
    );
    state.lore = lore.merge([], Array.isArray(state.lore) ? state.lore : []);
    if (!state.lore.some(entry => entry.key === state.lastLore)) state.lastLore = "";
    return state;
  }

  function getIntent(text, state, loreKey) {
    if (/^(?:再见|拜拜|再会|晚安|我先走了|我该走了|结束故事|bye(?:-bye)?|goodbye|good night)[。！!~～\s]*$/i.test(text)) return "leave";
    if (/忘记我|忘掉我|清除记忆|不要记住/.test(text)) return "forget";
    if (/还记得|记得我|我说过什么|知道我喜欢|你记住了/.test(text)) return "recall";
    if (/不想(?:聊|约|见|说)|先不(?:聊|约)|我不愿意|别问|拒绝|太快了|不合适|不方便|不去了|不见面|算了吧|取消(?:约会|见面|约定)/.test(text)) return "pause";
    if (/继续聊|接着聊|可以聊了|还是想聊/.test(text)) return "resume";
    if (/你叫(?:什么|啥)|你的名字|怎么称呼你|你怎么称呼|你是谁/.test(text)) return "askName";
    if (loreKey) return "lore";
    if (/住哪|住在(?:哪|什么地方)|你家在哪|你是哪里人|哪个小区|你住什么|离这.*远/.test(text)) return "home";
    if (/你.*(?:做什么工作|干什么的|上班|工作|职业)|做哪一行|你几岁|你多大|你.*年龄/.test(text)) return "bio";
    if (/看看你|想看你|长什么样|长啥样|你的(?:照片|自拍)|给我看看|今天穿/.test(text)) return "appearance";
    if (/你怎么会来|为什么在这|你.*(?:来书店|来这儿|到这里)|怎么来这里/.test(text)) return "backstory";
    if (state.plan && /什么时候|哪一天|几点|哪里见|在哪见/.test(text)) return "plan";
    if (state.pending && /^(?:好[呀啊的么吗]?|可以|没问题)[，。！!！\s]*$/.test(text)) return "accept";
    if (/一起|要不要|有空吗|下次见|约你|约会|见一面|喝一杯/.test(text)
      || (state.pending && /周[一二三四五六日天]|星期[一二三四五六日天]|明天|后天|周末/.test(text))
      || /(?:这样|就这么|说)定了/.test(text)) return "invite";
    if (/累|紧张|难过|开心|压力|烦|委屈|失落|心情/.test(text)) return "mood";
    if (/可爱|心动|好感|喜欢你|有点想你|你很温柔|这么帅|真帅|好帅|很帅|你.{0,6}好看|长得帅|英俊/.test(text)) return "flirt";
    if (/我(?:也)?(?:比较|最近|平时|很|最)?喜欢|我叫|叫我|我的名字是/.test(text)) return "share";
    if (/你.*(?:喜欢|平时|爱好)|胶片|相机|摄影|拍照/.test(text)) return "hobby";
    if (/小说|书名|推荐.*书|什么书|看书|在读|诗集|书签/.test(text)) return "book";
    if (/下雨|雨声|这场雨|淋湿|雨伞|没带伞/.test(text)) return "rain";
    const short = text.replace(/[\p{P}\s~～]/gu, "");
    if (/^(?:(?:hi+|hey+|hello|hithere|哈[喽啰罗]|嗨|嘿|你好|您好|早安|早上好|午安|下午好|晚上好|👋)[呀啊哦]*)+(?:林知秋|知秋|lin)?$/i.test(short)) return "greeting";
    if (/^(?:你)?(?:在吗|在不在|在呢吗|在吗在吗)[呀啊呢]*$/.test(short)) return "present";
    if (/^(?:你)?(?:现在)?(?:在?(?:干嘛|干吗|干啥|忙什么|做什么)|what(?:are)?youdoing|whatsup)[呢啊呀嘛]*$/i.test(short)) return "activity";
    if (/^(?:你好吗|你(?:今天|最近)?怎么样|还好吗|howareyou|howsitgoing)[呀啊呢]*$/i.test(short)) return "wellbeing";
    if (/^(?:你)?(?:吃(?:晚|午|早)?饭了?吗|吃过了吗)$/.test(short)) return "meal";
    if (/^(?:谢谢(?:你|啦|了|呀|啊)?|多谢|thanks|thankyou|thx)(?:林知秋|知秋|lin)?$/i.test(short)) return "thanks";
    if (/^(?:哈哈+|嘿嘿+|笑死(?:我了|了)?|太逗了|lol|😄|😂)$/i.test(short)) return "laugh";
    if (/^(?:嗯+|哦+|好|好的|行|知道了|原来如此|明白了|这样啊|ok|okay)$/i.test(short)) return "acknowledge";
    if (/好呀|坐一下|坐坐|可以|坐这里/.test(text)) return "sit";
    return "other";
  }

  function remember(state, text) {
    const name = text.match(/(?:我叫|叫我|我的名字是)\s*([\p{Script=Han}A-Za-z0-9·]{1,12}?)(?=吧|就好|，|。|、|！|!|,|；|;|。|\s|$)/u)?.[1];
    if (name && !/^(什么|这个|不要|别的|的时候)/.test(name)) state.memory.name = name;
    const hobby = text.match(/我(?:也)?(?:比较|最近|平时|很|最)?喜欢\s*(?:[《"])?([^》，。！？；、!?,;\n"<>]{1,18})(?=[》，。！？；、!?,;\n"]|$)/u)?.[1]?.trim();
    if (hobby && !/^(你|上你|和你|这种|这样|这个|它)/.test(hobby)) state.memory.hobby = hobby;
    else if (/^我也喜欢[。！!]*$/.test(text) && state.topic) state.memory.hobby = state.topic;
  }

  function invitation(state, text, accepting) {
    if (state.steps < 2) {
      return "刚认识就约下次，我有点意外。要不先聊一会儿？我想知道你平时喜欢做什么。";
    }
    const day = text.match(/(?:下|这|本)?(?:星期|礼拜|周)[一二三四五六日天]|(?:这个|下个)?周末|明天|后天/)?.[0];
    const setting = text.match(/摄影展|咖啡馆|旧书店|书店|美术馆|公园|看展|喝咖啡/)?.[0];
    const place = ({ "看展": "摄影展", "喝咖啡": "咖啡馆", "书店": "梧桐书店", "旧书店": "梧桐书店" })[setting] || setting;
    if (!day && !accepting && !/定了|说定了/.test(text)) {
      state.pending = place || state.pending || "梧桐书店";
      return "好啊。周末下午在" + state.pending + "碰面怎么样？你也可以挑个你方便的时间。";
    }
    const time = text.match(/上午|下午|中午|傍晚|晚上/)?.[0] || "下午";
    const when = (day || "周末") + time;
    const where = place || state.pending || "梧桐书店";
    state.plan = when + " · " + where;
    state.pending = "";
    return "那就" + when + "见，在" + where + "。说好了，下次见面的时候，我们接着聊今天没讲完的话。";
  }

  function respond(state, intent, text, loreKey) {
    const { name, hobby } = state.memory;
    const repeated = intent === state.lastIntent;
    switch (intent) {
      case "leave":
        state.ended = true;
        return state.plan ? "路上慢点。下次见面，还是我给你留位置。" : "我帮你把门撑住。今天认识你很开心，路上慢点。";
      case "forget":
        state.memory = {};
        return "好，我把关于你的称呼和喜好从手记里划掉。";
      case "recall": {
        const facts = [name && "你让我叫你" + name, hobby && "你提过喜欢" + hobby].filter(Boolean);
        return facts.length ? "记得。你看，" + facts.join("，") + "。" : "我还没记下你的称呼或喜好。你想从哪一件小事聊起？";
      }
      case "pause":
        state.paused = true;
        state.pending = "";
        state.plan = "";
        return "好，那就先到这里。你可以在这儿安静坐一会儿，等雨小一点再走。";
      case "resume":
        state.paused = false;
        return "好。刚才外面亮了一盏路灯，我才发现我们已经坐了好一会儿。想接着聊点什么？";
      case "askName":
        return repeated ? "是林知秋。秋天的秋。我倒是还想知道，该怎么称呼你？" : "我叫林知秋。听起来像从哪本旧小说里走出来的人吧？你呢，我该怎么叫你？";
      case "lore":
        return lore.reveal(state, loreKey);
      case "home":
        return "我住在南汀河西的老城区，从这家书店走回去大概十分钟。雨小一点的话，我会沿着河堤绕回去，路上有家晚上还亮着灯的面包店。";
      case "bio":
        return /几岁|多大|年龄/.test(text)
          ? "二十六。刚搬来南汀那会儿总走错桥，现在看见哪家店亮着灯，就知道自己走到哪了。"
          : "我在一家城市杂志做版式设计。今天一整天都在挪一张封面照片，下班才发现外面下雨了。";
      case "appearance":
        return (state.lastIntent === "flirt" ? "这么快就要验收刚才那句「帅」啊？" : "他往台灯那边偏了偏，让你看清他的脸。") +
          "我今天戴的是细框眼镜，外套还是湿的。雨把头发压塌了，你就当是限定造型吧。";
      case "backstory":
        return "我下班来给同事取一本设计年鉴，原本以为拿了就走。你看，现在连咖啡都点上了。";
      case "invite":
      case "accept":
        return invitation(state, text, intent === "accept");
      case "plan":
        return "我们刚定的是「" + state.plan + "」。如果时间不巧，可以换一天。";
      case "mood":
        if (/不累|不紧张|开心|高兴/.test(text)) return "那这场雨也不算坏事。真想看看今天让你心情好的那件小事。";
        return "嗯，我听到了。想说的话我可以听，也可以什么都不说，陪你坐一会儿。";
      case "share":
        if (hobby && /喜欢/.test(text)) {
          state.topic = hobby;
          return repeated ? hobby + "听上去是你愿意花时间的事。你第一次接触它是什么时候？" : "原来你喜欢" + hobby + "。我想听听，是哪一刻开始觉得它很有意思的？";
        }
        return name ? "那我就叫你" + name + "。很高兴认识你。你平时也会跑来书店躲雨吗？" : "我也想听你讲讲自己。平时有哪件事，做着做着就忘了时间？";
      case "hobby":
        state.topic = "拍照";
        return repeated ? "我常拍窗户、水洼，还有下雨天顾不上互相看的人。你会把镜头对准什么？" : "我喜欢用胶片相机拍窗玻璃上的倒影。有时候洗出来才发现，路人比街灯还好看。你喜欢拍照吗？";
      case "book":
        state.topic = "旅行散文";
        return repeated ? "如果你喜欢慢一点的故事，可以先翻第二篇，就在书签那一页。" : "我在读一本旅行散文。店主说它在这里放了六年，前几页居然还有上一位读者留下的书签。要一起翻翻吗？";
      case "rain":
        return repeated ? "屋檐还在滴水。等地上的水洼平静下来，我们再看看要不要走吧。" : "我还挺喜欢雨滴打在窗边的声音。等它小一点，街对面的灯会倒映在水里。";
      case "flirt":
        if (/帅|好看|英俊/.test(text)) return "你这么一说，我都不好意思把眼镜摘下来了。刚进门还在跟店主借纸巾擦雨水呢。";
        return state.steps >= 2 ? "你这么一说，我反倒有点不好意思了。今天能遇到你，我也觉得挺好。" : "被你这么一说，我有点意外。给我一点时间，先认识一下你，好吗？";
      case "sit":
        return repeated ? "你坐近一点也可以，这样不用隔着雨声说话。" : "坐吧。我把这本书放到旁边，你也能看见窗外。店里现在就剩我们和店主了。";
      case "greeting":
        return repeated ? "你好呀。这回听清了，我叫林知秋。" : name ? "嗨，" + name + "。靠窗这边还有位置，来坐吧。" : "嗨，你好。我叫林知秋。靠窗这边空着，坐吗？";
      case "present":
        return name ? "在呢，" + name + "。我刚把书翻过一页。" : "在呢，我把书合上了。你说。";
      case "activity":
        return "等雨停，顺手翻了几页书。翻到一半才发现，有人把一张电影票根夹在里面了。";
      case "wellbeing":
        return "今天还不错。刚下班那会儿有点累，坐下来听了一会儿雨，缓过来了。你今天怎么样？";
      case "meal":
        return "还没。原本想取了书就去吃碗面，结果差点被这场雨留到打烊。";
      case "thanks":
        return "不客气。有人陪我说说话，等雨也没那么无聊了。";
      case "laugh":
        return "你笑了？那我就当自己刚才那句话还挺有意思。";
      case "acknowledge":
        return repeated ? "店里安静下来了。我们再坐会儿也行。" : "嗯。知秋把书翻到书签那一页，把它轻轻往你这边推了推。";
      default:
        return repeated ? "你愿意从头跟我讲讲吗？我怕自己没接住你的意思。" : "我想接着听，不过刚才那句我没完全听懂。可以说具体一点吗？";
    }
  }

  const familiarIntents = new Set(["share", "hobby", "book", "rain", "mood", "askName", "home", "bio", "appearance", "backstory", "lore"]);
  function reply(previous, value) {
    const text = value.trim().slice(0, 200).normalize("NFKC");
    if (!text || previous.ended) return previous;
    const state = { ...previous, memory: { ...previous.memory } };
    const loreKey = lore.topicFor(text, state);
    const intent = getIntent(text, state, loreKey);
    const allowedWhilePaused = ["resume", "leave", "forget", "recall", "pause"].includes(intent);
    let answer;
    if (state.paused && !allowedWhilePaused) {
      answer = "我还在靠窗的位置。等你说「继续聊」，我们再接着聊。";
    } else {
      if (intent === "share") remember(state, text);
      if (familiarIntents.has(intent) && intent !== state.lastIntent) state.steps = Math.min(2, state.steps + 1);
      answer = respond(state, intent, text, loreKey);
      state.lastIntent = intent;
      if (intent !== "lore") state.lastLore = "";
    }
    state.turns = [...previous.turns, { user: value.trim().slice(0, 200), reply: answer }].slice(-maxTurns);
    return state;
  }

  function view(state) {
    const stage = state.plan ? 2 : Number(state.steps >= 2);
    const [kicker, description] = scenes[state.ended ? "ended" : ["first", "familiar", "invited"][stage]];
    const choices = state.ended ? []
      : state.paused ? ["我们继续聊吧", "我先走了"]
      : state.pending ? ["周末下午可以", "我今天想慢一点，先不聊见面"]
      : stage === 2 ? ["你还记得我说过什么吗？", "我先走了"]
      : stage === 1 ? ["周六要不要一起去看摄影展？", "你还记得我说过什么吗？", "今天先不约见面"]
      : ["好呀，我可以坐这里吗？", "你在看什么书？", "你怎么称呼？"];
    const summary = state.ended ? "这一段故事已经结束。" : state.paused ? "故事停在了窗边，等你主动继续。" : [
      "骤雨让你们在书店碰面。",
      "你们开始聊自己感兴趣的事。",
      "你们约好了下一次见面。"
    ][stage];
    return { stage, kicker, description, choices, summary };
  }

  function prepareCloudTurn(state, value) {
    const local = reply(state, value);
    const handled = state.paused || local === state ||
      ["leave", "pause", "forget", "recall", "resume"].includes(local.lastIntent);
    return { local, handled };
  }

  function commitCloudTurn(state, local, generated) {
    const last = local.turns.at(-1);
    const meeting = !state.plan && generated.meeting;
    const proposals = [...(generated.lore || [])];
    const askedAbout = local.lastIntent === "lore" &&
      local.lore.find(entry => entry.key === local.lastLore);
    if (askedAbout && !state.lore.some(entry => entry.key === askedAbout.key) &&
        !proposals.some(entry => entry.key === askedAbout.key)) {
      const spoken = generated.reply.match(/[^。！？\n]+(?:[。！？]|$)/g) || [];
      const fact = spoken.filter(sentence => !/[？?]$|听不懂|没听懂|没接住|不方便说/.test(sentence))
        .slice(0, 2).join("").trim().slice(0, 180);
      if (fact.length >= 8) proposals.push({ key: askedAbout.key, label: askedAbout.label, fact });
    }
    const conflictingFact = state.lore.find(entry => proposals.some(proposal =>
      (entry.key === proposal.key || entry.label === proposal.label) && entry.fact !== proposal.fact));
    const newFacts = conflictingFact ? state.lore : lore.merge(state.lore, proposals);
    const reply = conflictingFact ? conflictingFact.fact : generated.reply;
    return {
      ...local,
      steps: Math.min(2, Math.max(local.steps, state.steps + Number(generated.warmed))),
      plan: meeting || state.plan,
      pending: meeting ? "" : local.pending,
      lore: newFacts,
      lastLore: conflictingFact?.key || (newFacts.length > state.lore.length ? newFacts.at(-1).key :
        state.lore.some(entry => entry.key === local.lastLore) ? local.lastLore : ""),
      turns: [...local.turns.slice(0, -1), { user: last.user, reply }]
    };
  }

  globalThis.RainStory = { character, reset, restore, reply, view, prepareCloudTurn, commitCloudTurn };
})();
