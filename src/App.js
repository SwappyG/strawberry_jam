import { StrawberryJam } from "./strawberry_jam/StrawberryJam.js"
import { DiscordClient } from "./discord_client/DiscordClient.js"

import express from "express"


const App = () => {
  const args = {
    'discord_token_file_path': 'keys/discord_token.json',
  }

  const app = express()
  const port = process.env.PORT || 5000

  app.get('/', (req, res) => res.send(`SwappyJam Discord Bot`))
  app.listen(port, () => console.log(`Listening on ${port}`))

  const letter_jam = new DiscordClient({
    discord_token_file_path: 'keys/discord_token.json',
    game_type: StrawberryJam
  })
}

export {
  App
}