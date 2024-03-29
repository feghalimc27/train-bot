import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { exportCommands } from './commands.mjs';

const token = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(token);

client.commands = await exportCommands();

// Log interactions
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		console.log(`Executing application command ${interaction.commandName} invoked by ${interaction.user.username} at ${new Date()}`);
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

