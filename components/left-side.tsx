"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/providers/chat-store-provider";

export default function LeftSide() {

  const router = useRouter();

  const deleteMessage = useChatStore((state) => state.deleteMessage);

  function handleNewChat() {
    router.push(`/`);
  }

  const chats = useChatStore((state) => state.chats);

  return (
    <div className="flex flex-col w-80 h-dvh border-r border-gray-100 p-4 overflow-hidden shrink-0">
      <div className="pb-4 text-2xl">AIAgent</div>
      <div className="flex p-2 rounded hover:bg-gray-100 cursor-pointer" onClick={handleNewChat}>
        <Image
          src="/new-chat.svg"
          width={20}
          height={20}
          alt="New Chat"
          className="mr-1 w-5 h-5"
        />
        New Chat
      </div>
      <div className="cursor-pointer p-2 flex bg-gray-100">
        Recents
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain list-none mt-1">
        {
          chats.map(item => (
            <li
              key={item.id}
              onClick={() => router.push(`/chat/${item.id}`)}
              className="group p-2 rounded hover:bg-gray-100 cursor-pointer flex justify-between items-center">
              <span>{item.title}</span>
              <button className="mr-4 shrink-0
                  opacity-0
                  group-hover:opacity-100
                  focus-visible:opacity-100
                  transition-opacity duration-200
                  cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMessage(item.id)
                }}
              >
                <Image
                  src='/delet.svg'
                  width={18}
                  height={18}
                  alt="delete"
                />
              </button>
            </li>
          ))
        }
      </ul>

    </div>
  )

}