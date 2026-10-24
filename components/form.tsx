"use client";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useChatStore } from "@/providers/chat-store-provider";

// true: 使用前端写死的假数据；false: 请求真实后端
const USE_MOCK = true;
const API_URL = "http://127.0.0.1:7070/api/chat/stream";

// 前端模拟后端的 SSE 流式返回
function mockStreamResponse(text: string): Response {
  const tokens = `你说的是：${text}。这是一条前端 mock 的流式回复。`.split("");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {

      // 1. 先返回 conversationId
      const conversationId = crypto.randomUUID();

      controller.enqueue(
        encoder.encode(
          `event: conversationId\ndata: ${JSON.stringify({
            conversationId,
          })}\n\n`
        )
      );

      await new Promise((r) => setTimeout(r, 200));

      // 2. 模拟 AI 流式回复
      for (const t of tokens) {
        controller.enqueue(
          encoder.encode(
            `event: delta\ndata: ${JSON.stringify({
              content: t,
            })}\n\n`
          )
        );

        await new Promise((r) => setTimeout(r, 60));
      }

      // 3. 返回会话标题
      controller.enqueue(
        encoder.encode(
          `event: conversationTitle\ndata: ${JSON.stringify({
            conversationId,
            title: text.slice(0, 25),
          })}\n\n`
        )
      );

      // 4. 返回 done，表示结束
      controller.enqueue(
        encoder.encode(`event: done\ndata: {}\n\n`)
      );

      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

export default function FormPage() {

  const router = useRouter();
  const param = useParams();
  const [message, setMessage] = useState("");
  const { slug } = param

  // 从 Zustand 获取操作方法
  const createChat = useChatStore((state) => state.createChat);
  const addMessage = useChatStore((state) => state.addMessage);
  const appendToMessage = useChatStore((state) => state.appendToMessage);
  const setChatTitle = useChatStore(
    (state) => state.setChatTitle
  );

  async function handleSend(text: string) {

    let chatId: string = Array.isArray(slug)
      ? slug[0] ?? ""
      : slug ?? "";

    if (chatId) {
      addMessage(chatId, text);
    }

    let assistantId = "";
    if (chatId) {
      assistantId = addMessage(chatId, "", "assistant");
    }

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

      while (true) {
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
          if (event === "conversationId" && !chatId) {

            const { conversationId } = JSON.parse(dataStr);

            chatId = conversationId;

            // 创建会话
            createChat(text, chatId);

            // 关键：会话创建后再添加 AI 消息
            assistantId = addMessage(chatId, "", "assistant");

            router.push(`/chat/${chatId}`);

          } else if (event === "delta") {

            const { content } = JSON.parse(dataStr);
            if (chatId && assistantId) {
              appendToMessage(chatId, assistantId, content);
            }

          } else if (event === "conversationTitle") {
            const { conversationId, title } = JSON.parse(dataStr);
            if (conversationId && title) {
                setChatTitle(conversationId, title);
              }
          } else if (event === "done") {
            return;
          }
        }
      }
    } catch (err) {

      console.error("[stream error]", err);
      appendToMessage(chatId, assistantId, "请求失败，请重试");
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
        <div className="flex p-2 justify-end">
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

