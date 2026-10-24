
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useStore } from "zustand";
import {
  createChatStore,
  type ChatState,
} from "@/store/chat-store";

type ChatStoreApi = ReturnType<typeof createChatStore>;

const ChatStoreContext = createContext<ChatStoreApi | null>(null);

export function ChatStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  // 每个 Provider 创建独立 Store
  const [store] = useState(createChatStore);
  const [ready, setReady] = useState(false);

  useEffect(() => {
  let active = true;

  const hydrate = async () => {
    try {
      await store.persist.rehydrate();
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      if (active) {
        setReady(true);
      }
    }
  };

  void hydrate();

  return () => {
    active = false;
  };
}, [store]);

  return (
    <ChatStoreContext.Provider value={store}>
      {ready ? children : <div className="p-4">加载聊天记录...</div>}
    </ChatStoreContext.Provider>
  );
}

// 自定义 Hook：读取 Zustand 数据
export function useChatStore<T>(
  selector: (state: ChatState) => T
): T {
  const store = useContext(ChatStoreContext);

  if (!store) {
    throw new Error("Missing ChatStoreProvider");
  }

  return useStore(store, selector);
}
