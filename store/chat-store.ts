import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";

// 一条消息
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// 一个聊天会话
export type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

// 全局状态和操作方法
export type ChatState = {
  chats: Chat[];
  createChat: (content: string, chatId: string) => void;
  addMessage: (chatId: string, content: string, role?: "user" | "assistant") => string;
  appendToMessage: (chatId: string, messageId: string, delta: string) => void;
  deleteMessage: (chatId: string) => void;
  setChatTitle: (chatId: string, title: string) => void;
};

export const createChatStore = () =>
  createStore<ChatState>()(
    persist(
      (set) => ({
        chats: [],

        // 创建新聊天
        createChat: (content, chatId) => {

          const newChat: Chat = {
            id:chatId,
            title: content.slice(0, 25),
            messages: [
              {
                id: crypto.randomUUID(),
                role: "user",
                content,
              },
            ],
          };

          set((state) => ({
            chats: [newChat, ...state.chats],
          }));

          return chatId;
        },

        // 向指定聊天添加消息
        addMessage: (chatId, content, role = "user") => {
          const id = crypto.randomUUID();
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? { ...chat, messages: [...chat.messages, { id, role, content }] }
                : chat
            ),
          }));
          return id;
        },

        // 流式追加内容
        appendToMessage: (chatId, messageId, delta) => {
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map((m) =>
                      m.id === messageId ? { ...m, content: m.content + delta } : m
                    ),
                  }
                : chat
            ),
          }));
        },
        deleteMessage: (chatId) => {
          set((state) => ({
            chats: state.chats.filter(chat => chat.id !== chatId)
          }))
        },
        setChatTitle: (chatId, title) => {
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    title,
                  }
                : chat
            ),
          }))
        }
      }),
      {
        name: "ai-agent-chat",
        storage: createJSONStorage(() => localStorage),
        skipHydration: true,
      }
    )
  );
