"use client";

import { useChatStore } from "@/providers/chat-store-provider";
import { useParams } from "next/navigation";

export default function ChatRoom() {

  const { slug } = useParams();
  const chat = useChatStore((state) =>{
    return state.chats.find((item) => item.id === slug)
  });

  const messages = chat?.messages ?? [];

  return (
    <div className="p-4">
      <ul className="list-none">
        {
          messages.map(m => (
            <li className="flex flex-row-reverse mt-4" key={m.id}><div className="w-auto bg-blue-100 rounded p-2">{m.content}</div></li>
          ))
        }
      </ul>
    </div>
  )
}