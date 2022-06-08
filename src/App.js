import { StrawberryJam } from "./StrawberryJam.js"
import { DiscordClient } from "./DiscordClient.js"

const App = () => {
  const args = {
    'discord_token_file_path': 'keys/discord_token.json',
  }

  const letter_jam = new StrawberryJam(new DiscordClient(args))
}

export {
  App
}