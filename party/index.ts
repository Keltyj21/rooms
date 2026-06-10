import type * as Party from "partykit/server"

export default class RoomServer implements Party.Server {
  hostId: string | null = null
  playing = false
  position = 0
  lastUpdated = Date.now()

  constructor(readonly room: Party.Room) {}

  onMessage(message: string, sender: Party.Connection) {
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