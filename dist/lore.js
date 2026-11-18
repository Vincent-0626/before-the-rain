(() => {
  const limit = 30;
  const topics = [
    ["move_reason", "搬来南汀的原因", /(?:怎么|为什么|为啥|缘由|原因|当初|契机).{0,12}(?:搬来|搬到|来南汀|留在南汀|选南汀)|(?:搬来|搬到|来|选)南汀.{0,9}(?:原因|为什么|为啥)|为什么.{0,4}(?:搬家|来这里住|选择这里|留在这里)/, [
      "毕业那年，南汀的杂志社给了我一份试稿。我第一次来，就沿着老河堤走到了天黑。后来试稿过了，我干脆搬过来，想看看这座城除了河边还有什么。",
      "毕业前来南汀做过一期实习，编辑带我去河西找一家老印刷厂。我后来收到杂志社的工作邀请，就搬来了。说来也怪，我第一次觉得自己愿意在一个地方慢慢待上几年。"
    ]],
    ["first_week", "刚来南汀的时候", /刚(?:来|到)南汀|搬来之后|搬过来之后|刚搬来|到南汀.{0,5}第一周/, [
      "刚搬来的第一周，我回家老走错桥。后来干脆记哪家面包店亮灯，沿着面包香走，居然就回去了。",
      "我刚来的时候连家里的桌子都没买，就在纸箱上改杂志清样。一个星期以后，才发现楼下那家面馆能坐到很晚。"
    ]],
    ["childhood", "小时候", /童年|小时候|从小|小时的/, [
      "小时候我最喜欢蹲在小卖部旁边看换灯泡。街灯一盏盏亮起来，我就知道该跑回家吃饭了。",
      "我小时候一到下雨就去翻家里那本旧地图。其实哪里也没去过，但每条蓝色的河我都快背下来了。"
    ]],
    ["hometown", "老家", /老家|家乡|哪里长大|在哪长大|哪儿长大|出生|原来住哪|搬来之前|以前住哪/, [
      "我老家叫栖原，也是个虚构的小城，在南汀北边。冬天风很硬，集市上卖热栗子的摊子倒是一直摆到晚上。",
      "我在外地一个叫栖原的小县城长大。那儿的街不宽，熟人碰见了会站在路边聊到天黑。"
    ]],
    ["family", "家人", /(?:你|家里|跟|和|与).{0,7}(?:父母|爸妈|家人|家里人)|爸妈.*(?:做什么|住哪)|兄弟姐妹|独生子|亲人/, [
      "我父母还住在栖原。我妈每次视频都要看我家阳台那盆薄荷，我爸一般在旁边问我什么时候回去吃饭。",
      "父母还在老家栖原。我们不怎么说肉麻的话，想对方的时候就发一张今天吃了什么的照片。"
    ]],
    ["study", "大学时候", /大学|读什么专业|学的什么专业|读书的时候|学校|学生时代|学设计/, [
      "大学读的是视觉传达。毕业作品是一份社区小报，照片和文字全是我自己挨家挨户问来的。",
      "我学视觉传达。大学最后一年给旧社区做过一本小册子，我就是那会儿开始喜欢编辑和排版的。"
    ]],
    ["camera", "第一台胶片相机", /第一台相机|什么相机|相机哪来的|怎么喜欢.*(?:拍照|摄影|相机)|怎么开始.*拍照/, [
      "第一台胶片机是二手市场买的，银色的，取景窗有一道浅划痕。第一卷拍完才知道，原来我一直忘了摘镜头盖。",
      "我从旧货铺收了一台银色胶片机，快门转盘有点松。我第一次拿它拍的是下班路上的一扇亮窗。"
    ]],
    ["pets", "养宠物这件事", /养(?:宠物|猫|狗)|宠物|有猫吗|有狗吗|有小猫/, [
      "我没养宠物，不过杂志社楼下那只橘猫叫阿柚。碰见我，它会跟着走半段路，然后拐进它自己的地盘。",
      "家里暂时没养。书店门口有只叫阿柚的橘猫，比店主更准时，一到下午就来占台阶。"
    ]],
    ["weekend", "平时的周末", /(?:周末|休息日).{0,7}(?:做什么|干嘛|怎么过|去哪|一般|平时)|平时.{0,6}(?:周末|休息日)|周末有什么安排/, [
      "没约人的周末我会去河西菜市场吃早饭，下午看展。有时候什么都不拍，只揣着相机慢慢走。",
      "我一般周六去书店隔壁吃面，吃完沿河走一圈。碰上好天气，会挑一卷胶片把一下午留给同一条街。"
    ]],
    ["music", "常听的音乐", /音乐|爱听什么|喜欢听什么|歌单|什么歌/, [
      "最近在反复听一张爵士三重奏。晚上排版容易走神，钢琴一响我反而能把注意力找回来。",
      "我最近常听钢琴爵士，尤其是录音里还留着椅子挪动声的那种，感觉有人在隔壁屋里练习。"
    ]],
    ["food", "常点的吃食", /爱吃|喜欢吃|最喜欢的食物|喜欢什么菜|最爱.*吃|饮食口味|什么口味/, [
      "我挺喜欢河西市场那家小摊的鲜肉馄饨。老板见到我都先问一句，今天还加那么多胡椒？",
      "我最常吃的是河西市场的鲜肉馄饨，汤里要多一点白胡椒。光闻见那个味道，我就觉得自己下班了。"
    ]],
    ["local_places", "老城区的小店", /河西.{0,7}(?:好玩|推荐|好吃)|老城区.{0,9}(?:夜市|热闹|好玩|好吃|哪儿|哪里)|附近.{0,5}(?:逛|推荐|吃)|夜市|推荐一家/, [
      "河西有个周五夜市，就在旧邮局后面。入口的烤红薯摊会开到很晚，我有时下班过去买一个再回家。",
      "老邮局拐角进去有一条小夜市，卖烤红薯那家亮着一串小灯。我周五有时会去买，顺路摸摸那家的猫。"
    ]],
    ["first_love", "上一段恋爱", /初恋|前任|之前谈过|谈过恋爱|上段感情|上一段(?:恋爱|感情)/, [
      "大学谈过一次，后来毕业去了不同城市。那几年照片拍得很少，现在能想到的，反而是我们一起坐错的那趟公交。",
      "以前谈过一段，毕业后去了两座城。我们现在偶尔还会分享一本书，各自生活得挺好。"
    ]]
  ];
  const fixed = /^(?:name|age|gender|appearance|home|address|bio|job|occupation|hobbies|scene|姓名|名字|年龄|性别|样貌|长相|住处|住址|职业|工作|身份|日常|怎么遇见)$/iu;
  const followUp = /^(?:那|嗯[，, ]*)?(?:后来呢|当时呢|为什么呀|为什么呢|能展开说说吗|具体说说|可以再讲点吗|再讲讲)[?？。！!]*$/;

  function clean(entry) {
    const key = typeof entry?.key === "string" ? entry.key.trim().toLowerCase() : "";
    const label = typeof entry?.label === "string" ? entry.label.trim() : "";
    const fact = typeof entry?.fact === "string" ? entry.fact.trim() : "";
    if (!/^[a-z][a-z0-9_-]{1,32}$/.test(key) || fixed.test(key) || fixed.test(label)) return null;
    if (!label || label.length > 16 || !fact || fact.length > 180) return null;
    const topic = topics.find(entry => entry[0] === key);
    return { key, label: topic?.[1] || label, fact };
  }

  function merge(previous, additions) {
    const result = [...previous];
    for (const item of additions) {
      if (result.length >= limit) break;
      const entry = clean(item);
      if (!entry || result.some(p => p.key === entry.key || p.label === entry.label)) continue;
      result.push(entry);
    }
    return result;
  }

  function topicFor(text, state) {
    const saved = state.lore.find(entry => text.includes(entry.label));
    if (saved) return saved.key;
    for (const [key, , pattern] of topics) {
      if (pattern.test(text) && !/^(?:我|我的)(?:周末|童年|小时候|老家|大学|爸妈|父母|爱听|喜欢听|爱吃|喜欢吃|最喜欢|养了|养过|初恋|前任)/.test(text)) return key;
    }
    if (!followUp.test(text)) return "";
    return state.lastLore === "move_reason" && /后来/.test(text) ? "first_week" : state.lastLore;
  }

  function reveal(state, key) {
    const existing = state.lore.find(entry => entry.key === key);
    if (existing) {
      state.lastLore = existing.key;
      return existing.fact;
    }
    const topic = topics.find(entry => entry[0] === key);
    if (!topic) return "";
    const [id, label, , versions] = topic;
    const fact = versions[Math.floor(Math.random() * versions.length)];
    state.lore = merge(state.lore, [{ key: id, label, fact }]);
    state.lastLore = id;
    return fact;
  }

  const index = topics.map(([key, label]) => ({ key, label }));
  globalThis.RainLore = { clean, merge, topicFor, reveal, index };
})();
