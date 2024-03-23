import { SlashCommandBuilder } from 'discord.js';
import { buildLeaderboardEmbed, getAllMessages, getLastLeaderboardAndMessage, sortMessagesIntoLeaderboard, writeLastLeaderboardAndMessage } from '../../utils.mjs';

const bLeaderboardFileLocation = './b-leaderboard.json';
const hLeaderbaordFileLocation = './h-leaderboard.json';
const owoLeaderboardFileLocation = './owo-leaderboard.json';
const bChannelId = process.env.B_CHANNEL_ID;
const hChannelId = process.env.H_CHANNEL_ID;
const owoChannelId = process.env.OWO_CHANNEL_ID;

export const command = {
    data: new SlashCommandBuilder()
        .setName('letters')
        .setDescription('commands for evaluating the letter channels')
        .addStringOption(option => option
            .setName('letter')
            .setDescription('build a leaderboard for the selected letter')
            .addChoices(
                    { name: 'h', value: 'h' },
                    { name: 'b', value: 'b' },
                    { name: 'owoAttac2', value: 'owo'}
                )),
    async execute(interaction) {
        await interaction.deferReply();
        let embed = '';
        let leaderboard = []
        switch(interaction.options.getString('letter')) {
            case 'h':
                leaderboard = await getLeaderboard(interaction.client, hLeaderbaordFileLocation, hChannelId);
                embed = await getLeaderboardEmbed(leaderboard, 'h');
                break;
            case 'b':
                leaderboard = await getLeaderboard(interaction.client, bLeaderboardFileLocation, bChannelId);
                embed = await getLeaderboardEmbed(leaderboard, 'b');
                break;
            case 'owo':
                leaderboard = await getLeaderboard(interaction.client, owoLeaderboardFileLocation, owoChannelId);
                embed = await getLeaderboardEmbed(leaderboard, 'owo');
                break;
        }
        await interaction.editReply({ embeds: [embed] });
    }
}

const getLeaderboard = async function(client, fileLocation, channelId) {
    let existingData = await getLastLeaderboardAndMessage(fileLocation);
    let leaderboard = [];
    let messages = [];

    // get existing data if present
    if (existingData) {
        leaderboard = existingData.leaderboard;
        messages = await getAllMessages(client, channelId, existingData.lastMessage);
    } else {
        messages = await getAllMessages(client, channelId);
    }

    leaderboard = await sortMessagesIntoLeaderboard(messages, leaderboard);

    let lastMessageId = 0;
    if (messages.length > 0) {
        messages.sort((a, b) => (a.createdAt <= b.createdAt))
        lastMessageId = messages[0].id;
    } else if (existingData) {
        lastMessageId = existingData.lastMessage;
    }

    await writeLastLeaderboardAndMessage(leaderboard, lastMessageId, fileLocation);

    return leaderboard;
}

const getLeaderboardEmbed = async function(leaderboard, letter) {
    let title = '';
    
    switch (letter) {
        case 'h':
            title = 'h leaders';
            break;
        case 'b':
            title = 'b leaders';
            break;
        case 'owo':
            title = 'owoAttac2 leaders';
            break;
    }

    return await buildLeaderboardEmbed(leaderboard, title);
}