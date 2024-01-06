import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllMessages } from '../../utils.mjs';

export const command = {
    data: new SlashCommandBuilder()
        .setName('count')
        .setDescription('counting channel commands')
        .addStringOption(option =>
            option
                .setName('option')
                .setDescription('option')
                .setRequired(true)
                .addChoices({ name: 'Leaderboard', value: 'leaderboard' })
        ),
    async execute(interaction) {
        // Defer reply, need client so will be getting results from main function
        await interaction.deferReply();
        let embed = await getLeaderboard(interaction.client)
        await interaction.editReply({ embeds: [embed] });
    },
}

const getLeaderboard = async function(client) {
    let messages = await getAllMessages(client);
    let leaderboard = [];

    for (let message of messages) {
        if (!leaderboard.find(element => element.id == message.author.id)) {
            leaderboard.push({ 
                id: message.author.id,
                name: message.author.username, 
                value: 1 
            });
        } else {
            let index = leaderboard.findIndex(element => element.id == message.author.id);
            leaderboard[index].value += 1;
        }
    }

    leaderboard.sort((a, b) => (a.value <= b.value) ? 1 : -1);

    return await buildLeaderboardEmbed(leaderboard);
}

const buildLeaderboardEmbed = async function(leaderboard) {
    // build columns
    let leaders = ``;
    let values = ``;

    for (let index = 1; index <= leaderboard.length; index++) {
        leaders += `${index}: ${leaderboard[index - 1].name}\n`;
        values += `${leaderboard[index - 1].value}\n`;
    }

    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Counting Leaders')
        .addFields(
            { name: 'User', value: leaders, inline: true },
            { name: 'Value', value: values, inline: true },
        )
        .setTimestamp();
}