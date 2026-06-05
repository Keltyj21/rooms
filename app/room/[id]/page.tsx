"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import usePartySocket from "partysocket/react"

type Message = {
  name: string
  color: string
  text: string
}

const COLORS = [
  "text-violet-400",
  "text-emerald-400",
  "text-amber-400",
  "text-pink-400",
  "text-sky-400",
  "text-rose-400",
]

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

const SOUNDCLOUD_SRC =
  "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2285518262&color=%23000000&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [name, setName] = useState("")
  const [color] = useState(() => randomColor())
  const [isHost, setIsHost] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isRemoteUpdate = useRef(false)
  const [needsInteraction, setNeedsInteraction] = useState(false)
  const [copied, setCopied] = useState(false)
  const socketRef = useRef<any>(null)
  const listenerStarting = useRef(false)

  const socket = usePartySocket({
    host: "rooms.keltyj21.partykit.dev",
    room: id,
    onMessage(event) {
      const msg = JSON.parse(event.data)

      if (msg.type === "chat") {
        setMessages((prev) => [...prev, { name: msg.name, color: msg.color, text: msg.text }])
        return
      }

      if (!widgetRef.current) return

      if (msg.type === "heartbeat" && !isHost) {
        if (listenerStarting.current) return

        widgetRef.current.getPosition((currentPos: number) => {
          const drift = Math.abs((currentPos / 1000) - msg.position)

          if (msg.playing) {
            widgetRef.current.isPaused((paused: boolean) => {
              if (paused) {
                widgetRef.current.seekTo(msg.position * 1000)
                setNeedsInteraction(true)
              } else if (drift > 2) {
                widgetRef.current.seekTo(msg.position * 1000)
              }
            })
          } else {
            widgetRef.current.isPaused((paused: boolean) => {
              if (!paused) {
                widgetRef.current.pause()
              }
            })
          }
        })
      }

      if (msg.type === "state" && !isHost) {
        widgetRef.current.seekTo(msg.position * 1000)
      }
    },
  })

  React.useEffect(() => {
    socketRef.current = socket
    ;(window as any).__socket = socket
    console.log("socket ready", socket.readyState)
  }, [socket])

  useEffect(() => {
    if ((window as any).SC) {
      initWidget()
      return
    }

    const script = document.createElement("script")
    script.src = "https://w.soundcloud.com/player/api.js"
    script.onload = () => initWidget()
    document.head.appendChild(script)

    function initWidget() {
      const SC = (window as any).SC
      const iframe = iframeRef.current
      if (!iframe) return

      const widget = SC.Widget(iframe)
widgetRef.current = widget
;(window as any).__widget = widget
console.log("widget initialized")
    }
  }, [])

  useEffect(() => {
    if (!isHost || !widgetRef.current) return

    const interval = setInterval(() => {
      widgetRef.current.isPaused((paused: boolean) => {
        widgetRef.current.getPosition((pos: number) => {
          socket.send(JSON.stringify({
            type: "heartbeat",
            position: pos / 1000,
            playing: !paused,
          }))
        })
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isHost, socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function sendMessage() {
    if (!inputText.trim() || !name.trim()) return
    const msg = { type: "chat", name, color, text: inputText.trim() }
    socket.send(JSON.stringify(msg))
    setMessages((prev) => [...prev, { name, color, text: inputText.trim() }])
    setInputText("")
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-white transition text-sm">
            ← Back
          </Link>
          <div>
            <h1 className="font-semibold text-lg">Friday Afternoon Vibes</h1>
            <p className="text-zinc-500 text-sm">
              Code: <span className="text-zinc-300 font-mono tracking-widest uppercase">{id}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() => setIsHost((h) => !h)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              isHost
                ? "border-violet-500 text-violet-400"
                : "border-zinc-700 text-zinc-500"
            }`}
          >
            {isHost ? "Host" : "Listener"}
          </button>
        </div>
      </div>

      {/* Player */}
      <div className="px-6 py-6 border-b border-zinc-800">
        {needsInteraction && (
  <div className="mb-4 bg-violet-900/40 border border-violet-700 text-violet-300 text-sm px-4 py-3 rounded-lg">
    ▶ The room is playing — press play on the player below to join
  </div>
)}
        <iframe
          ref={iframeRef}
          id="sc-player"
          width="100%"
          height="166"
          scrolling="no"
          frameBorder="no"
          allow="autoplay; encrypted-media"
          src={SOUNDCLOUD_SRC}
        />
      </div>

      {/* Name input */}
      {!name && (
        <div className="px-4 py-3 border-b border-zinc-800 flex gap-2">
          <input
            type="text"
            placeholder="Enter a name to chat..."
            className="flex-1 bg-zinc-900 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-600"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setName((e.target as HTMLInputElement).value.trim())
              }
            }}
          />
          <button
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
            onClick={(e) => {
              const input = (e.target as HTMLElement)
                .previousElementSibling as HTMLInputElement
              setName(input.value.trim())
            }}
          >
            Join
          </button>
        </div>
      )}

      {/* Chat */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
          {messages.map((msg, i) => (
            <ChatMessage key={i} name={msg.name} color={msg.color} text={msg.text} />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-zinc-800 px-4 pt-3 pb-4 flex flex-col gap-2">
          <div className="flex gap-1">
            {["🔥", "❤️", "🙌", "😮", "💀"].map((emoji) => (
              <button
                key={emoji}
                className="text-base px-2 py-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
                onClick={() => {
                  if (!name) return
                  const msg = { type: "chat", name, color, text: emoji }
                  socket.send(JSON.stringify(msg))
                  setMessages((prev) => [...prev, { name, color, text: emoji }])
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage() }}
              placeholder={name ? "Send a message" : "Enter a name first..."}
              disabled={!name}
              className="flex-1 bg-zinc-900 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-600 disabled:opacity-40"
            />
            <button
              onClick={sendMessage}
              disabled={!name}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-md transition"
            >
              Chat
            </button>
          </div>
        </div>
      </div>

    </main>
  )
}

function ChatMessage({ name, color, text }: Message) {
  return (
    <div className="text-sm leading-snug px-1 py-0.5 rounded hover:bg-zinc-900 transition-colors">
      <span className={`font-semibold ${color}`}>{name}</span>
      <span className="text-zinc-500 mx-1">:</span>
      <span className="text-zinc-200">{text}</span>
    </div>
  )
}