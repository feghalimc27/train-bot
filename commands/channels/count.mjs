import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllMessages, getPinnedMessages } from '../../utils.mjs';
import * as fs from 'fs/promises';

const leaderboardFileLocation = './leaderboard.json';
const countingChannelId = process.env.COUNTING_CHANNEL_ID

export const command = {
    data: new SlashCommandBuilder()
        .setName('count')
        .setDescription('counting channel commands')
        .addSubcommand(subcommand => subcommand.setName('leaderboard'))
        .addSubcommand(subcommand => subcommand.setName('pins'))
        .addSubcommand(subcommand => subcommand.setName('clean')
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
    let existingData = await getLastLeaderboardAndMessage();
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

    await writeLastLeaderboardAndMessage(leaderboard, lastMessageId);

    return await buildLeaderboardEmbed(leaderboard, 'leaderboard');
}

const getPinsLeaderboard = async function(client) {
    let messages = await getPinnedMessages(client, countingChannelId);
    let leaderboard = await sortMessagesIntoLeaderboard(messages, []);

    return await buildLeaderboardEmbed(leaderboard, 'pins')
}

const cleanMessages = async function(client, commit) {
    messages = await getAllMessages(client, countingChannelId);
    if (messages.length <= 1) { return 'too few messages to clean'; }
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Find first valid integer message.
    j = 0;
    while(parseInt(messages[j].content) === null && j < messages.length) {
        console.log(`Warning: Skipping message ${messages[j].id} that isn't an integer.`)
        j += 1;
    }

    mistakes = [];
    lastValidVal = parseInt(messages[j].content);
    for (let i = j; i < messages.length; i++) {
        val = parseInt(messages[i].content);
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

    shameBoard = sortMessagesIntoLeaderboard(mistakes, []);
    if (commit) {
        try {
            await fs.unlink(leaderboardFileLocation);
            for (let i = 0; i < mistakes.length; i++) {
                    console.log(`Deleting message ${mistakes[i].id}...`);
                    await mistakes[i].delete();
            }
        } catch(err) {
            console.log(err);
        }
    } else {
        for (let i = 0; i < mistakes.length; i++) {
            console.log(`Mistake found in message ${mistakes[i].id}...`);
        }
    }

    return buildLeaderboardEmbed(
        shameBoard, 
        'clean', 
        [
            {name: 'Mistakes Deleted', value: commit},
        ]);
}

const sortMessagesIntoLeaderboard = async function(messages, leaderboard) {
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

    return leaderboard;
}

const buildLeaderboardEmbed = async function(leaderboard, type, additionalFields=[]) {
    let total = 0;
    for (let i = 0; i < leaderboard.length; i++) {
        total += leaderboard[i].value
    }
    
    // build columns
    let leaders = `**Total**: \n`;
    let values = `${total}\n`;
    let title = ``;

    for (let index = 1; index <= leaderboard.length; index++) {
        leaders += `**${index}**: ${leaderboard[index - 1].name}\n`;
        values += `${leaderboard[index - 1].value}\n`;
    }

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

    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(title)
        .addFields(
            { name: 'User', value: leaders, inline: true },
            { name: 'Value', value: values, inline: true },
        )
        .addFields(additionalFields)
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
