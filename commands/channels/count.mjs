import { SlashCommandBuilder } from 'discord.js';
import { getAllMessages, getPinnedMessages, getLastLeaderboardAndMessage, writeLastLeaderboardAndMessage, buildLeaderboardEmbed, sortMessagesIntoLeaderboard } from '../../utils.mjs';
import * as fs from 'fs/promises';

const leaderboardFileLocation = './count-leaderboard.json';
const countingChannelId = process.env.COUNTING_CHANNEL_ID

export const command = {
    data: new SlashCommandBuilder()
        .setName('count')
        .setDescription('counting channel commands')
        .addSubcommand(subcommand => subcommand
            .setName('leaderboard')
            .setDescription('view counting leaders and counts'))
        .addSubcommand(subcommand => subcommand
            .setName('pins')
            .setDescription('view pin leaders and counts'))
        .addSubcommand(subcommand => subcommand
            .setName('clean')
            .setDescription('clean the counting channel and shame the offenders')
            .addBooleanOption(option => 
                option
                    .setName('commit')
                    .setRequired(false)
                    .setDescription('Prints messages to remove when false. Deletes those messages when true.'))),
    async execute(interaction) {
        // Defer reply, need client so will be getting results from main function
        await interaction.deferReply();
        let embed = '';
        switch(interaction.options.getSubcommand()) {
            case 'leaderboard':
                embed = await getLeaderboard(interaction.client);
                break;
            case 'pins':
                embed = await getPinsLeaderboard(interaction.client);
                break;
            case 'clean':
                let commit = interaction.options.getBoolean('commit') ?? false;
                embed = await cleanMessages(interaction.client, commit);
                break;
        }
        await interaction.editReply({ embeds: [embed] });
    },
}

const getLeaderboard = async function(client) {
    let existingData = await getLastLeaderboardAndMessage(leaderboardFileLocation);
    let leaderboard = [];
    let messages = [];

    // Get existing data if possible
    if (existingData) {
        leaderboard = existingData.leaderboard;
        messages = await getAllMessages(client, countingChannelId, existingData.lastMessage);
    } else {
        messages = await getAllMessages(client, countingChannelId);
    }

    leaderboard = await sortMessagesIntoLeaderboard(messages, leaderboard);

    let lastMessageId = 0;

    if (messages.length > 0) {
        messages.sort((a, b) => (parseInt(a.content ) <= parseInt(b.content)) ? 1 : -1);
        lastMessageId = messages[0].id;
    } else if (existingData) {
        lastMessageId = existingData.lastMessage;
    }

    await writeLastLeaderboardAndMessage(leaderboard, lastMessageId, leaderboardFileLocation);

    return await getLeaderboardEmbed(leaderboard, 'leaderboard');
}

const getPinsLeaderboard = async function(client) {
    let messages = await getPinnedMessages(client, countingChannelId);
    let leaderboard = await sortMessagesIntoLeaderboard(messages, []);

    return await getLeaderboardEmbed(leaderboard, 'pins')
}

const cleanMessages = async function(client, commit) {
    let messages = await getAllMessages(client, countingChannelId);
    if (messages.length <= 1) { return 'too few messages to clean'; }
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Find first valid integer message.
    let j = 0;
    while(parseInt(messages[j].content) === null && j < messages.length) {
        console.log(`Warning: Skipping message ${messages[j].id} that isn't an integer.`)
        j += 1;
    }

    let mistakes = [];
    let lastValidVal = parseInt(messages[j].content);
    for (let i = j + 1; i < messages.length; i++) {
        let val = parseInt(messages[i].content);
        if (val === null) {
            console.log(`Warning: Skipping message ${messages[i].id} that isn't an integer.`)
            continue;
        }
        if (val != lastValidVal+1) {
            mistakes.push(messages[i]);
        } else {
            lastValidVal = val;
        }
    }

    let shameBoard = await sortMessagesIntoLeaderboard(mistakes, []);
    if (commit) {
        fs.unlink(leaderboardFileLocation)
            .then(() => console.log("Deleted leaderboard file..."))
            .catch(err => console.log(err));
        for (let i = 0; i < mistakes.length; i++) {
            mistakes[i].delete()
                .then(message => console.log(`Deleted message ${message.id}...`))
                .catch(err => console.log(err));
        }
    } else {
        for (let i = 0; i < mistakes.length; i++) {
            console.log(`Mistake found in message ${mistakes[i].id}...`);
        }
    }

    return getLeaderboardEmbed(shameBoard, 'clean', 
        [
            { name: 'Mistakes Deleted', value: commit.toString() },
        ]
    );
}

const getLeaderboardEmbed = async function(leaderboard, type, additionalFields=[]) {    
    let title = '';

    switch (type) {
        case 'leaderboard':
            title = 'Counting Leaders';
            break;
        case 'pins':
            title = 'Pin Leaders';
            break;
        case 'clean':
            title = 'Mistake Leaders';
            break;
        default:
            title = 'Leaderboard';
    }

    return await buildLeaderboardEmbed(leaderboard, title, additionalFields);
}
