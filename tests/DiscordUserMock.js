export class DiscordUserMock {
  constructor() {
    this.id = Math.floor(Math.random() * 1e10)
    this.username = `John Doe ${Math.floor(Math.random() * 1000)}`
    this.last_msg = ``
    this.send = (text) => { this.last_msg = text }
  }
}