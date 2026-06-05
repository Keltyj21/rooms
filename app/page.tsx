import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-zinc-400 mt-1">Listen together.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/room/abc123" className="w-full bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-zinc-200 transition text-center">
            Create a room
          </Link>
          <Link href="/room/abc123" className="w-full border border-zinc-700 text-white font-semibold py-3 px-6 rounded-lg hover:bg-zinc-900 transition text-center">
            Join with a link
          </Link>
        </div>
      </div>
    </main>
  )
}