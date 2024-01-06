import { SlashCommandBuilder } from 'discord.js';

export const command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('responds with pong'),	
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
}