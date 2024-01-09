import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllMessages } from '../../utils.mjs';
import * as fs from 'fs/promises';

const leaderboardFileLocation = './leaderboard.json';

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
    let existingData = await getLastLeaderboardAndMessage();
    let leaderboard = [];
    let messages = [];

    // Get existing data if possible
    if (existingData) {
        leaderboard = existingData.leaderboard;
        messages = await getAllMessages(client, existingData.lastMessage);
    } else {
        messages = await getAllMessages(client);
    }

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

    let lastMessageId = 0;

    if (messages.length > 0) {
        messages.sort((a, b) => (parseInt(a.content ) <= parseInt(b.content)) ? 1 : -1);
        lastMessageId = messages[0].id;
    } else if (existingData) {
        lastMessageId = existingData.lastMessage;
    }

    await writeLastLeaderboardAndMessage(leaderboard, lastMessageId);

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

const getLastLeaderboardAndMessage = async function() {
    let data = {};

    try {
        console.log('Reading leaderboard data from file...');
        data = await fs.readFile(leaderboardFileLocation);
    } catch (err) {
        console.log('Error retreiving existing data or it doesn\'t exist');
        console.log(err);
        return null;
    }

    return JSON.parse(data);
}

const writeLastLeaderboardAndMessage = async function(leaderboard, messageId) {
    const data = { leaderboard: leaderboard, lastMessage: messageId };

    try {
        console.log('Writing leaderboard info to file...');
        await fs.writeFile(leaderboardFileLocation, JSON.stringify(data));
    } catch (err) {
        console.log('Error writing leaderboard and messages to output file');
        console.log(err);
    }
}