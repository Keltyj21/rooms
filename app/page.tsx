"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8)
}

export default function Home() {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState("")
  const [songUrl, setSongUrl] = useState("")
  const [error, setError] = useState("")

  function createRoom() {
    const id = generateRoomId()
    const url = songUrl.trim()
    router.push(url ? `/room/${id}?song=${encodeURIComponent(url)}` : `/room/${id}`)
  }

  function joinRoom() {
    const trimmed = code.trim().toLowerCase()
    if (!trimmed) {
      setError("Please enter a room code.")
      return
    }
    router.push(`/room/${trimmed}`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-zinc-400 mt-1">Listen together.</p>
        </div>

        {!joining && !creating ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setCreating(true)}
              className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition"
            >
              Create a room
            </button>
            <button
              onClick={() => setJoining(true)}
              className="w-full border border-zinc-700 text-white font-semibold py-3 px-6 rounded-lg hover:bg-zinc-900 transition"
            >
              Join a room
            </button>
          </div>
        ) : creating ? (
          <div className="flex flex-col gap-3">
            <input
              type="url"
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createRoom() }}
              placeholder="Paste a SoundCloud link (optional)..."
              autoFocus
              className="w-full bg-zinc-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600"
            />
            <button
              onClick={createRoom}
              className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition"
            >
              Create
            </button>
            <button
              onClick={() => {
                setCreating(false)
                setSongUrl("")
              }}
              className="w-full border border-zinc-700 text-zinc-400 font-semibold py-3 px-6 rounded-lg hover:bg-zinc-900 transition"
            >
              Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError("")
              }}
              onKeyDown={(e) => { if (e.key === "Enter") joinRoom() }}
              placeholder="Enter room code..."
              maxLength={6}
              autoFocus
              className="w-full bg-zinc-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600 tracking-widest uppercase"
            />
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
              onClick={joinRoom}
              className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition"
            >
              Join
            </button>
            <button
              onClick={() => {
                setJoining(false)
                setCode("")
                setError("")
              }}
              className="w-full border border-zinc-700 text-zinc-400 font-semibold py-3 px-6 rounded-lg hover:bg-zinc-900 transition"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
