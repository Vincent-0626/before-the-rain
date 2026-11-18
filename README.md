# 雨停之前

中文互动恋爱短篇。玩家在雨天书店遇见虚构角色林知秋，可以自由输入，也可以点选回复。角色临场讲出的背景可写进档案，后续对话会参考已经说过的设定。

## 体验剧本模式

克隆仓库后，用浏览器打开 `dist/index.html`。本地剧本模式无需运行服务、下载模型或配置密钥。

1. 输入「你好」或「在干嘛」，开启对话。
2. 问「为什么搬来南汀？」。点角色头像，在「聊出来的背景」里查看回答。换个问法或刷新后可以沿用该设定。
3. 在对话中告诉角色称呼和喜好，并在「剧情手记」里查看。选择「重新开始」可清空本次存档。

## 使用 Qwen3 生成对话

安装 [Ollama](https://docs.ollama.com/linux) 和 Python 3。以下命令在运行模型的 Linux 机器上执行。

终端一启动 Ollama：

```bash
OLLAMA_HOST=127.0.0.1:11443 ollama serve
```

终端二下载模型并在仓库根目录启动网页：

```bash
OLLAMA_HOST=127.0.0.1:11443 ollama pull qwen3:8b
python3 server.py
```

同机打开 `http://127.0.0.1:18787/`。若模型部署在远程机器，在浏览器所在的电脑开启 SSH 端口转发，然后访问相同地址：

```bash
ssh -N -L 127.0.0.1:18787:127.0.0.1:18787 <user>@<server>
```

Ollama 版会自动使用 [Qwen3 8B](https://ollama.com/library/qwen3:8b)，并在页面底部显示当前模式。若将 `dist/` 单独托管为网站，可以点击「开启 AI 自由对话」并授权 Puter，使用自己的调用额度。

## 对话和角色记忆

- **生成时提供上下文。** 每次调用携带固定角色设定、已归档背景、手记、最近 8 轮对话和本轮输入。
- **从对话提取背景。** 模型输出回复和结构化背景字段。应用检查背景是否出现在实际回复中，按键名和标题去重。重复提交与已归档内容冲突的条目时，应用保留原记录。
- **保存故事状态。** 档案和聊天记录保存在当前浏览器。模型服务不可用时，页面提示使用剧本回复。

运行对话回归测试（Node.js 20 或更新）：

```bash
node --test checks/story-check.mjs
```

## 许可

源码使用 [MIT License](LICENSE)。场景照片由 [Julián](https://unsplash.com/photos/a-cup-of-coffee-sitting-on-top-of-a-saucer-wlPGn504tuk) 摄影，按 [Unsplash License](https://unsplash.com/license) 使用。模型权重可从 Ollama 按模型的上游许可获取。
