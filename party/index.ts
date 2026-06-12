import type * as Party from "partykit/server"

type Song = {
  id: string
  url: string
  addedBy: string
  addedAt: number
}

export default class RoomServer implements Party.Server {
  hostId: string | null = null
  playing = false
  position = 0
  lastUpdated = Date.now()
  queue: Song[] = []
  currentIndex = 0

  constructor(readonly room: Party.Room) {}

  async onStart() {
    this.queue = (await this.room.storage.get<Song[]>("queue")) ?? []
    this.currentIndex = (await this.room.storage.get<number>("currentIndex")) ?? 0
  }

  async onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message)

    if (msg.type === "chat") {
      this.room.broadcast(message, [sender.id])
    }

    if (msg.type === "claim-host") {
      this.hostId = sender.id
      this.room.broadcast(JSON.stringify({
        type: "host-changed",
        hostId: sender.id,
      }))
    }

    if (msg.type === "heartbeat" && sender.id === this.hostId) {
      this.playing = msg.playing
      this.position = msg.position
      this.lastUpdated = Date.now()
      this.room.broadcast(message, [sender.id])
    }

    if (msg.type === "add-song") {
      const song: Song = {
        id: Math.random().toString(36).substring(2, 10),
        url: msg.url,
        addedBy: msg.addedBy ?? "unknown",
        addedAt: Date.now(),
      }
      this.queue.push(song)
      await this.room.storage.put("queue", this.queue)
      this.room.broadcast(JSON.stringify({
        type: "queue-update",
        queue: this.queue,
        currentIndex: this.currentIndex,
      }))
    }
  }

  onConnect(conn: Party.Connection) {
    const currentPosition = this.playing
      ? this.position + (Date.now() - this.lastUpdated) / 1000
      : this.position

    conn.send(JSON.stringify({
      type: "state",
      playing: this.playing,
      position: currentPosition,
      hostId: this.hostId,
      queue: this.queue,
      currentIndex: this.currentIndex,
    }))
  }

  onClose(conn: Party.Connection) {
    if (conn.id === this.hostId) {
      this.hostId = null
      this.room.broadcast(JSON.stringify({
        type: "host-changed",
        hostId: null,
      }))
    }
  }
}
