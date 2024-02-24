# train-bot
A discord bot for the train discord server. This bot is current capable of performing operations on the counting channel data, creating pins, and interfacing with Google's Gemini AI. 

## Local Development
For local development, first a .env file must be set up with the relevant environment variables. These variables are:

* APP_ID: The app id for the bot
* DISCORD_TOKEN: The token for the bot
* PUBLIC_KEY: The public key for the bot
* COUNTING_CHANNEL_ID: The ID for the channel the bot should check for counting messages
* PIN_CHANNEL_ID: The ID for the channel to place pinned messages
* GUILD_ID: The server to intialize the bot commands in. For local development this should be the server ID of the test server.
* GCP_PROJECT_ID: The GCP project ID for the project hosting the Gemini API
* GCP_REGION: The GCP region for the project hosting the Gemini API
* GEMINI_MODEL_DEFAULT: The model being used for the Gemini API
* GEMINI_MAX_PROMPT_LENTH: Max input length for the Gemini command prompts
* GEMINI_MAX_OUTPUT_TOKENS: Max output length for the Gemini command prompts

Once this .env file is configured, the project can then be initialized and started up using the following commands.

> npm install

This command initializes the environment with the required dependencies.

> npm run register

This command will set up the slash commands and app commands in the server determined by the GUILD_ID environment variable.

> npm run start

This command will start the bot instance and it will listen for messages. As messages come in they will be handled by the running bot instances. 

When testing existing commands the server the bot is running on may need to be shut down prior to testing. To prevent having to shut down the server, a separate bot can be created for testing. The test bots values for the APP_ID, DISCORD_TOKEN, and PUBLIC_KEY would be used in this situation.