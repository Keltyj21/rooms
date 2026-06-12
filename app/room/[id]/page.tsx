"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import usePartySocket from "partysocket/react"

type Message = {
  name: string
  color: string
  text: string
}

type Song = {
  id: string
  url: string
  addedBy: string
  addedAt: number
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

function toEmbedUrl(scUrl: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(scUrl)}&color=%23000000&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const searchParams = useSearchParams()
  const initialSong = searchParams.get("song")

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [name, setName] = useState("")
  const [color] = useState(() => randomColor())
  const [copied, setCopied] = useState(false)
  const [needsInteraction, setNeedsInteraction] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [hostId, setHostId] = useState<string | null>(null)
  const [queue, setQueue] = useState<Song[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [addSongInput, setAddSongInput] = useState("")

  const bottomRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isRemoteUpdate = useRef(false)
  const listenerStarting = useRef(false)
  const isHostRef = useRef(false)
  const initialSongSent = useRef(false)

  const currentSong = queue[currentIndex] ?? null

  const socket = usePartySocket({
    host: "rooms.keltyj21.partykit.dev",
    room: id,
    onMessage(event) {
      const msg = JSON.parse(event.data)

      if (msg.type === "chat") {
        setMessages((prev) => [...prev, { name: msg.name, color: msg.color, text: msg.text }])
        return
      }

      if (msg.type === "host-changed") {
        setHostId(msg.hostId)
        const amHost = msg.hostId === socket.id
        setIsHost(amHost)
        isHostRef.current = amHost
        return
      }

      if (msg.type === "state") {
        setHostId(msg.hostId)
        const amHost = msg.hostId === socket.id
        setIsHost(amHost)
        isHostRef.current = amHost
        const serverQueue: Song[] = msg.queue ?? []
        setQueue(serverQueue)
        setCurrentIndex(msg.currentIndex ?? 0)

        if (!amHost && widgetRef.current) {
          widgetRef.current.seekTo(msg.position * 1000)
        }

        if (serverQueue.length === 0 && initialSong && !initialSongSent.current) {
          initialSongSent.current = true
          socket.send(JSON.stringify({ type: "add-song", url: initialSong, addedBy: "host" }))
        }
        return
      }

      if (msg.type === "queue-update") {
        setQueue(msg.queue)
        setCurrentIndex(msg.currentIndex)
        return
      }

      if (!widgetRef.current) return

      if (msg.type === "heartbeat" && !isHostRef.current) {
        if (listenerStarting.current) return

        isRemoteUpdate.current = true

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

        setTimeout(() => {
          isRemoteUpdate.current = false
        }, 1000)
      }
    },
  })

  useEffect(() => {
    isHostRef.current = isHost
  }, [isHost])

  function claimHost() {
    socket.send(JSON.stringify({ type: "claim-host" }))
  }

  // Re-initialize the SC widget whenever the current song changes
  useEffect(() => {
    if (!currentSong) return

    function initWidget() {
      const SC = (window as any).SC
      const iframe = iframeRef.current
      if (!iframe) return
      widgetRef.current = SC.Widget(iframe)
    }

    if ((window as any).SC) {
      initWidget()
      return
    }

    const script = document.createElement("script")
    script.src = "https://w.soundcloud.com/player/api.js"
    script.onload = () => initWidget()
    document.head.appendChild(script)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.url])

  useEffect(() => {
    if (!isHost) return

    const interval = setInterval(() => {
      if (!widgetRef.current) return
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

  function addSong() {
    const url = addSongInput.trim()
    if (!url) return
    socket.send(JSON.stringify({ type: "add-song", url, addedBy: name || "guest" }))
    setAddSongInput("")
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
          {isHost ? (
            <span className="text-xs px-3 py-1 rounded-full border border-violet-500 text-violet-400">
              Host
            </span>
          ) : (
            <button
              onClick={claimHost}
              className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition"
            >
              {hostId ? "Take control" : "Claim host"}
            </button>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="px-6 py-6 border-b border-zinc-800">
        {needsInteraction && !isHost && (
          <div
            className="mb-4 bg-violet-900/40 border border-violet-700 text-violet-300 text-sm px-4 py-3 rounded-lg cursor-pointer hover:bg-violet-900/60 transition"
            onClick={() => {
              listenerStarting.current = true
              isRemoteUpdate.current = true
              widgetRef.current?.play()
              setNeedsInteraction(false)
              setTimeout(() => {
                listenerStarting.current = false
                isRemoteUpdate.current = false
              }, 3000)
            }}
          >
            ▶ Click here to join the room audio
          </div>
        )}

        {currentSong ? (
          <iframe
            key={currentSong.url}
            ref={iframeRef}
            id="sc-player"
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay; encrypted-media"
            src={toEmbedUrl(currentSong.url)}
          />
        ) : (
          <div className="h-[166px] flex items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-600 text-sm">
            No song — paste a SoundCloud link below to get started
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={addSongInput}
            onChange={(e) => setAddSongInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addSong() }}
            placeholder="Paste a SoundCloud link..."
            className="flex-1 bg-zinc-900 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-600"
          />
          <button
            onClick={addSong}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
          >
            Add
          </button>
        </div>
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
