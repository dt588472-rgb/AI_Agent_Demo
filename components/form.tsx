"use client";
import Image from "next/image";
import Form from 'next/form';
import { useRouter, usePathname, useParams } from "next/navigation";
import { useState, type FormEvent, useEffect } from "react";
import { useChatStore } from "@/providers/chat-store-provider";

export default function FormPage() {

  const router = useRouter();
  const param = useParams();
  const [message, setMessage] = useState("");
  const {slug} = param

  const fileList = [{
    id: 1,
    name: 'add photos & files',
    icon: '/add-files.svg'
  }]

  const [showFileList, setShowFileList] = useState(false);

  // 从 Zustand 获取两个操作方法
  const createChat = useChatStore((state) => state.createChat);
  const addMessage = useChatStore((state) => state.addMessage);

  function handlesetShowFileList() {
    setShowFileList((previous) => !previous);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!message.trim()) return;

    async function createConversation() {
      await fetch('/api/chat/stream', {
        method: 'post',
        headers: {
          'Content-type': 'application/json',
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no"
        },
        body: JSON.stringify({
          "conversationId": slug || '',
          "rawQuery": message
        })
      }).then(res => {
        return res.json()
      }).then(({event, data}) => {
        // console.log('data', data)
        if (slug) {
          addMessage(slug, message);
        } else {
          data.conversationId && router.push(`/chat/${data.conversationId}`);
          data.conversationId && createChat(message, data.conversationI)
        }
        
      }).catch(err => {
        
        // test
        if (slug) {
          addMessage(slug, message);
        } else {
          const slug = crypto.randomUUID()
          router.push(`/chat/${slug}`);
          createChat(message, slug)
        }
      })
    }

    createConversation()

    setMessage("");
  }

  return (
    <Form onSubmit={handleSubmit}>
      <div className="inset-x-4 bottom-4 rounded border-1 border-gray-100 shadow-xl absolute">
        {
          showFileList
          &&
          <ul className="list-none mb-2 shadow-xl rounded border-1 border-gray-100">
            {
              fileList.map((file) => {
                return (
                  <li className="p-2 rounded hover:bg-gray-100 cursor-pointer flex">
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
                handleSubmit(e);
              }
            }
          }>

        </textarea>
        <div className="flex p-2 justify-between">
          <button className="cursor-pointer rounded-full hover:bg-gray-100 p-2" onClick={handlesetShowFileList} aria-expanded={showFileList}>
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

    </Form>
  )

}