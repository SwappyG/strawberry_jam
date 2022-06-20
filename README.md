# strawberry_jam

## Instructions for Using Bot

_work in progress_

## Setup for hosting your own bot

- git clone the repo
- Make a folder called `keys/` in the root directory
  - add a file inside called `discord_token.json`

- Make a discord bot. 
  - Instruction on how to do that can be found here: https://discordpy.readthedocs.io/en/stable/discord.html
  - Make sure it has all text permission

- Invite your bot to your server
  - In the process of making a bot, you should have been able to generate a URL for adding your bot to a server

- Add your discord token (from the bot you just made) to the `discord_token.json` you make earlier.

```
{
	"discord_token": <token>,
	"client_secret": <secret>,
	"client_id": <id>
}
```

- in `DiscordClient.js`, change `_DISCORD_PREFIX` if needed
  - can also just pass in an arg to `DiscordClient` constructor

- download and install all dependencies with `npm install` in the root directory

- `npm start` will launch your bot

- In a server with your new bot (while it's running), type `?help` to get started