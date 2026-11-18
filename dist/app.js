(() => {
  const engine = globalThis.RainStory;
  const model = globalThis.RainModel;
  const byId = id => document.getElementById(id);
  const storeKey = "before-the-rain-story-v1";
  const cloudPreferenceKey = "before-the-rain-cloud-enabled";
  const messages = byId("messages");
  const location = messages.firstElementChild;
  const input = byId("message");
  const sendButton = byId("send");
  const choices = byId("choices");
  const journal = byId("journal");
  const profile = byId("profile");
  const cloudDialog = byId("cloud-dialog");
  const modeButton = byId("mode");
  const connectButton = byId("cloud-connect");
  const cloudError = byId("cloud-error");
  const resetDialog = byId("restart-confirm");
  let state = engine.reset();
  let storageAvailable = true;
  let cloudClient;
  let provider;
  let rentedClient;
  let pending = false;
  let restoringCloud = false;
  let notice = "";

  try {
    const saved = localStorage.getItem(storeKey);
    if (saved) state = engine.restore(JSON.parse(saved));
  } catch {
    storageAvailable = false;
  }

  function save() {
    try {
      localStorage.setItem(storeKey, JSON.stringify(state));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
  }

  function saveCloudPreference(enabled) {
    try {
      if (enabled) localStorage.setItem(cloudPreferenceKey, "yes");
      else localStorage.removeItem(cloudPreferenceKey);
    } catch {}
  }

  async function restoreCloudPreference() {
    try {
      if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        restoringCloud = true;
        render();
        rentedClient = await model.rentedProvider();
        if (rentedClient) {
          if (rentedClient.ready) cloudClient = rentedClient;
          else notice = "服务器模型准备中 · 当前为剧本模式";
          return;
        }
      }
      if (window.location.protocol === "file:" || localStorage.getItem(cloudPreferenceKey) !== "yes") return;
      restoringCloud = true;
      render();
      provider = await model.load();
      if (provider.auth.isSignedIn()) cloudClient = provider;
      else {
        notice = "AI 授权需要更新 · 当前为剧本模式";
        saveCloudPreference(false);
      }
    } catch {
      notice = "AI 暂未连接 · 当前为剧本模式";
    } finally {
      restoringCloud = false;
      render();
    }
  }

  function addMessage(text, isUser) {
    const row = document.createElement("div");
    row.className = isUser ? "message user" : "message";
    if (!isUser) {
      const avatar = document.createElement("span");
      avatar.className = "avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "林";
      row.append(avatar);
    }
    const bubble = document.createElement("p");
    bubble.className = "bubble";
    const speaker = document.createElement("span");
    speaker.className = "sr-only";
    speaker.textContent = isUser ? "你：" : "林知秋：";
    bubble.append(speaker, document.createTextNode(text));
    row.append(bubble);
    messages.append(row);
  }

  function renderHistory() {
    messages.replaceChildren(location);
    for (const turn of state.turns) {
      if (turn.user) addMessage(turn.user, true);
      addMessage(turn.reply, false);
    }
    messages.scrollTop = messages.scrollHeight;
  }

  function render() {
    const page = engine.view(state);
    byId("scene-kicker").textContent = page.kicker;
    byId("scene-description").textContent = page.description;
    for (const badge of document.querySelectorAll(".stages li")) {
      if (Number(badge.dataset.stage) === page.stage) badge.setAttribute("aria-current", "step");
      else badge.removeAttribute("aria-current");
    }
    choices.replaceChildren();
    for (const text of page.choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = text;
      button.addEventListener("click", () => submit(text));
      choices.append(button);
    }
    input.disabled = state.ended || pending || (restoringCloud && Boolean(document.body.dataset.rainModel));
    sendButton.disabled = input.disabled;
    byId("restart").disabled = pending;
    modeButton.disabled = pending || restoringCloud;
    modeButton.textContent = cloudClient ? "切回剧本模式" : "开启 AI 自由对话";
    input.placeholder = state.ended ? "故事已结束，可重新开始。" : "说点什么，故事由你接下去…";
    byId("status").textContent = restoringCloud ? "正在连接对话模型…" : notice || (cloudClient ? cloudClient.label || "AI 自由对话 · 通义千问" :
      storageAvailable ? "剧本模式 · 记录保存在本地" : "剧本模式 · 此浏览器暂时无法保存对话");
    byId("journal-summary").textContent = page.summary;
    renderFacts(byId("memory"), [
      ["称呼", state.memory.name], ["喜好", state.memory.hobby], ["见面约定", state.plan]
    ]);
    byId("lore-empty").hidden = state.lore.length > 0;
    renderFacts(byId("profile-lore"), state.lore.map(entry => [entry.label, entry.fact]));
  }

  function renderFacts(container, facts) {
    container.replaceChildren();
    for (const [label, value] of facts) {
      const row = document.createElement("div");
      const title = document.createElement("dt");
      const detail = document.createElement("dd");
      title.textContent = label;
      detail.textContent = value || "还没记下";
      row.append(title, detail);
      container.append(row);
    }
  }

  async function submit(text) {
    if (pending) return;
    const { local, handled } = engine.prepareCloudTurn(state, text);
    if (local === state) return;
    notice = "";
    input.value = "";
    let next = local;
    if (cloudClient && !handled) {
      pending = true;
      const value = local.turns.at(-1).user;
      addMessage(value, true);
      addMessage("正在回复…", false);
      notice = cloudClient === rentedClient ? "服务器模型正在生成回复" : "通义千问正在生成回复";
      render();
      messages.scrollTop = messages.scrollHeight;
      const signal = AbortSignal.timeout(cloudClient === rentedClient ? 45000 : 25000);
      try {
        const expires = new Promise((_, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
        const generated = await Promise.race([
          model.generate(cloudClient, engine.character, state, value, signal),
          expires
        ]);
        next = engine.commitCloudTurn(state, local, generated);
        notice = "";
      } catch {
        notice = "模型回复暂时失败 · 本轮使用剧本";
      } finally {
        pending = false;
        messages.lastElementChild.remove();
        messages.lastElementChild.remove();
      }
    }
    state = next;
    const last = state.turns.at(-1);
    if (messages.childElementCount >= 73) renderHistory();
    else { addMessage(last.user, true); addMessage(last.reply, false); }
    save();
    render();
    messages.scrollTop = messages.scrollHeight;
    if (!state.ended && !matchMedia("(pointer: coarse)").matches) input.focus({ preventScroll: true });
  }

  byId("composer").addEventListener("submit", event => {
    event.preventDefault();
    submit(input.value);
  });
  byId("journal-open").addEventListener("click", () => journal.showModal());
  for (const id of ["profile-open", "profile-label"]) {
    byId(id).addEventListener("click", () => profile.showModal());
  }
  modeButton.addEventListener("click", async () => {
    if (cloudClient) {
      cloudClient = undefined;
      saveCloudPreference(false);
      notice = "";
      render();
      return;
    }
    if (rentedClient) {
      rentedClient = await model.rentedProvider(true);
      if (rentedClient?.ready) {
        cloudClient = rentedClient;
        notice = "";
      } else {
        notice = "服务器模型暂未就绪 · 当前为剧本模式";
      }
      render();
      return;
    }
    cloudDialog.showModal();
    cloudError.textContent = "正在连接 Puter…";
    connectButton.disabled = true;
    if (window.location.protocol === "file:") {
      cloudError.textContent = "请打开线上网址使用 AI 自由对话。";
      return;
    }
    try {
      provider = await model.load();
      cloudError.textContent = "";
      connectButton.disabled = false;
    } catch {
      cloudError.textContent = "暂时连不上 Puter，请关闭窗口后重试。";
    }
  });
  connectButton.addEventListener("click", async () => {
    if (!provider) return;
    connectButton.disabled = true;
    cloudError.textContent = "等待 Puter 授权…";
    try {
      if (!provider.auth.isSignedIn()) {
        await provider.auth.signIn({ attempt_temp_user_creation: true });
      }
      if (!cloudDialog.open) return;
      cloudClient = provider;
      saveCloudPreference(true);
      notice = "";
      cloudDialog.close();
      render();
      input.focus({ preventScroll: true });
    } catch (error) {
      cloudError.textContent = error?.error === "popup_blocked" || error?.error === "unsupported_origin"
        ? "授权窗口打不开。请用系统浏览器打开本站，再点「授权并启用」。"
        : "授权尚未完成。可以再次尝试，或继续剧本模式。";
    } finally {
      connectButton.disabled = false;
    }
  });
  byId("restart").addEventListener("click", () => {
    resetDialog.returnValue = "";
    resetDialog.showModal();
  });
  resetDialog.addEventListener("close", () => {
    if (resetDialog.returnValue !== "restart") return;
    state = engine.reset();
    notice = "";
    input.value = "";
    save();
    renderHistory();
    render();
  });

  const character = engine.character;
  renderFacts(byId("profile-facts"), [
    ["身份", character.bio], ["住处", character.home], ["样貌", character.appearance],
    ["日常", character.hobbies], ["怎么遇见", character.scene]
  ]);
  renderHistory();
  render();
  restoreCloudPreference();
})();
