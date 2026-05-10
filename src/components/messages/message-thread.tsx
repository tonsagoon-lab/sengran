"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction } from "@/lib/actions/messages";
import type { Conversation, Message } from "@/lib/db/messages";

interface Props {
  conversation: Conversation;
  initialMessages: Message[];
  currentUserId: string;
}

export function MessageThread({ conversation, initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const other =
    currentUserId === conversation.buyer_id ? conversation.seller : conversation.buyer;

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5s
  useEffect(() => {
    const supabase = createClient();
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, is_read, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    }, 5000);
    return () => clearInterval(timer);
  }, [conversation.id]);

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || isPending) return;
    setError(null);

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      body: trimmed,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");

    startTransition(async () => {
      const result = await sendMessageAction(conversation.id, trimmed);
      if (result.error) {
        setError(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setBody(trimmed);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Group messages by date
  let lastDate = "";

  return (
    <div className="mx-auto max-w-2xl flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3 shrink-0">
        <Link href="/messages" className="text-neutral-500 hover:text-neutral-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-neutral-900 truncate">
            {other?.display_name ?? "ผู้ใช้"}
          </p>
          {conversation.listings && (
            <Link
              href={`/property/${conversation.listings.slug}`}
              className="text-xs text-orange-500 hover:underline truncate block"
            >
              {conversation.listings.title}
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-neutral-50">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          const msgDate = formatDate(msg.created_at);
          const showDate = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="text-xs text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full">
                    {msgDate}
                  </span>
                </div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? "bg-orange-500 text-white rounded-br-sm"
                      : "bg-white border text-neutral-800 rounded-bl-sm"
                  } ${msg.id.startsWith("temp-") ? "opacity-60" : ""}`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={`text-[10px] mt-1 text-right ${
                      isMine ? "text-orange-100" : "text-neutral-400"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3 shrink-0">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์ข้อความ..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 max-h-32 overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || isPending}
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 transition-colors"
            aria-label="ส่ง"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-neutral-400 mt-1.5">Enter เพื่อส่ง / Shift+Enter ขึ้นบรรทัดใหม่</p>
      </div>
    </div>
  );
}
