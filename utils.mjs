import { EmbedBuilder } from 'discord.js';
import * as fs from 'fs/promises';

const messagePageSize = 100;

export const getAllMessages = async function (client, channelId, lastMessage = null) {
    const channel = client.channels.cache.get(channelId);
    let messages = [];

    // Create message pointer

    if (!lastMessage) {
        let message = await channel.messages
            .fetch({ limit: 1 })
            .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
        messages.push(message);

        while (message) {
            await channel.messages
                .fetch({ limit: messagePageSize, before: message.id })
                .then(messagePage => {
                    messagePage.forEach(msg => messages.push(msg));

                    // Update our message pointer to be the last message on the page of messages
                    message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
                });
        }
    } else {
        let message = await channel.messages
            .fetch({ limit: 1, after: lastMessage })
            .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

        if (message) {
            messages.push(message);
        }

        while (message) {
            await channel.messages
                .fetch({ limit: messagePageSize, after: message.id })
                .then(messagePage => {
                    messagePage.forEach(msg => messages.push(msg));

                    // Update our message pointer to be the last message on the page of messages
                    message = messagePageSize < messagePage.size ? messagePage.at(0) : null;
                });
        }
    }

    return messages;
};

export const getPinnedMessages = async function (client, channelId) {
    const channel = client.channels.cache.get(channelId);
    let messages = [];

    await channel.messages.fetchPinned()
        .then(messageMap => { messageMap.forEach(message => messages.push(message)); });

    return messages;
};

export const getLastLeaderboardAndMessage = async function(fileLocation) {
    let data = {};

    try {
        console.log(`Reading leaderboard data from file ${fileLocation}...`);
        data = await fs.readFile(fileLocation);
    } catch (err) {
        console.log('Error retreiving existing data or it doesn\'t exist');
        console.log(err);
        return null;
    }

    return JSON.parse(data);
};

export const writeLastLeaderboardAndMessage = async function(leaderboard, messageId, fileLocation) {
    const data = { leaderboard: leaderboard, lastMessage: messageId };

    try {
        console.log(`Writing leaderboard info to file ${fileLocation}...`);
        await fs.writeFile(fileLocation, JSON.stringify(data));
    } catch (err) {
        console.log('Error writing leaderboard and messages to output file');
        console.log(err);
    }
};

export const buildLeaderboardEmbed = async function(leaderboard, title, additionalFields=[]) {
    let total = 0;
    for (let i = 0; i < leaderboard.length; i++) {
        total += leaderboard[i].value
    }
    
    // build columns
    let leaders = ``;
    let values = ``;

    for (let index = 1; index <= leaderboard.length; index++) {
        leaders += `**${index}**: ${leaderboard[index - 1].name}\n`;
        values += `${leaderboard[index - 1].value}\n`;
    }

    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(title)
        .addFields(
            { name: 'User', value: leaders, inline: true },
            { name: 'Value', value: values, inline: true },
        )
        .addFields(additionalFields)
        .setFooter({ text: `Total: ${total}`})
        .setTimestamp();
};

export const sortMessagesIntoLeaderboard = async function (messages, leaderboard) {
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
};
