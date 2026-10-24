
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
  addMessage: (chatId: string, content: string) => void;
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
        addMessage: (chatId, content) => {
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id == chatId
                ? {
                    ...chat,
                    messages: [
                      ...chat.messages,
                      {
                        id: crypto.randomUUID(),
                        role: "user",
                        content,
                      },
                    ],
                  }
                : chat
            ),
          }));
        },
        deleteMessage: (chatId) => {
          set((state) => ({
            chats: state.chats.filter(chat => chat.id !== chatId)
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
