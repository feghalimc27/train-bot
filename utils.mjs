const countingChannelId = process.env.COUNTING_CHANNEL_ID
const messagePageSize = 100;

export const getAllMessages = async function (client, lastMessage = null) {
    const channel = client.channels.cache.get(countingChannelId);
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
}