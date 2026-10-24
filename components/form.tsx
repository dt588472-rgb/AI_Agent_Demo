"use client";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useChatStore } from "@/providers/chat-store-provider";

// true: 使用前端写死的假数据；false: 请求真实后端
const USE_MOCK = false;
const API_URL = "http://127.0.0.1:7070/api/chat/stream";
const CHAR_INTERVAL_MS = 60; // 每个字符最小间隔

// 前端模拟后端的 SSE 流式返回
function mockStreamResponse(text: string): Response {
  const tokens = `你说的是：${text}。这是一条前端 mock 的流式回复。`.split("");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const t of tokens) {
        controller.enqueue(
          encoder.encode(`event: delta\ndata: ${JSON.stringify({ content: t })}\n\n`)
        );
      }
      controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

export default function FormPage() {

  const router = useRouter();
  const param = useParams();
  const [message, setMessage] = useState("");
  const { slug } = param

  const fileList = [{
    id: 1,
    name: 'add photos & files',
    icon: '/add-files.svg'
  }]

  const [showFileList, setShowFileList] = useState(false);

  // 从 Zustand 获取操作方法
  const createChat = useChatStore((state) => state.createChat);
  const addMessage = useChatStore((state) => state.addMessage);
  const appendToMessage = useChatStore((state) => state.appendToMessage);

  function handlesetShowFileList() {
    setShowFileList((previous) => !previous);
  }

  async function handleSend(text: string) {
    let chatId = Array.isArray(slug) ? slug[0] : slug;
    if (chatId) {
      addMessage(chatId, text);
    } else {
      chatId = crypto.randomUUID();
      createChat(text, chatId);
      router.push(`/chat/${chatId}`);
    }

    const assistantId = addMessage(chatId, "", "assistant");

    // 限速输出：内容先进队列，再按固定节奏逐字写入 store
    const pending: string[] = [];
    let finished = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const drain = (async () => {
      while (!finished || pending.length > 0) {
        const ch = pending.shift();
        if (ch === undefined) {
          await sleep(16);
          continue;
        }
        appendToMessage(chatId, assistantId, ch);
        await sleep(pending.length > 200 ? 15 : CHAR_INTERVAL_MS);
      }
    })();

    try {
      const res = USE_MOCK
        ? mockStreamResponse(text)
        : await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: chatId, rawQuery: text })
        });
      if (!res.ok || !res.body) throw new Error('request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const block of events) {
          let event = "message";
          let dataStr = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (event === "delta") {
            const { content } = JSON.parse(dataStr);
            pending.push(...Array.from<string>(content));
          } else if (event === "done") {
            break outer;
          }
        }
      }
    } catch (err) {
      console.error("[stream error]", err);
      pending.push(...Array.from("请求失败，请重试"));
    } finally {
      finished = true;
      await drain;
    }
  }

  function handleSubmit(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!message.trim()) return;
    handleSend(message);
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="inset-x-4 bottom-4 rounded border border-gray-100 shadow-xl absolute">
        {
          showFileList
          &&
          <ul className="list-none mb-2 shadow-xl rounded border border-gray-100">
            {
              fileList.map((file) => {
                return (
                  <li key={file.id} className="p-2 rounded hover:bg-gray-100 cursor-pointer flex">
                    <Image
                      src={file.icon}
                      width={20}
                      height={20}
                      alt="New Chat"
                      className="mr-1"
                    />
                    {file.name}
                  </li>
                )

              })
            }

          </ul>
        }

        <textarea
          className="focus:outline-none focus:ring-0 p-4 resize-none w-full"
          placeholder="输入消息..."
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={
            (e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSubmit();
              }
            }
          }>

        </textarea>
        <div className="flex p-2 justify-between">
          <button type="button" className="cursor-pointer rounded-full hover:bg-gray-100 p-2" onClick={handlesetShowFileList} aria-expanded={showFileList}>
            <Image
              src='/file.svg'
              width={20}
              height={20}
              alt="New Chat"
            />
          </button>
          <button className="cursor-pointer rounded-full p-2 bg-blue-500" type="submit">
            <Image
              src='/arrow-up.svg'
              width={20}
              height={20}
              alt="New Chat"
            />
          </button>
        </div>
      </div>

    </form>
  )

}
