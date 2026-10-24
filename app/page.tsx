"use client";

import LeftSide from "@/components/left-side";
import FormPage from "@/components/form";
import ChatRoom from "@/components/chat-room";

export default function Home() {

  return (
    <div className="flex flex-row">
      <LeftSide/>
      <div className="flex-1 w-64 p-4 relative">
        <ChatRoom/>
        <FormPage/>
      </div>
    </div>
  );
}
