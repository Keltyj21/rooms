"use client"

import { useRouter } from "next/navigation"

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8)
}

export default function Home() {
  const router = useRouter()

  function createRoom() {
    const id = generateRoomId()
    router.push(`/room/${id}`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-zinc-400 mt-1">Listen together.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={createRoom}
            className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition"
          >
            Create a room
          </button>
        </div>
      </div>
    </main>
  )
}