import { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';

const pinChannelId = process.env.PIN_CHANNEL_ID;

export const command = {
    data: new ContextMenuCommandBuilder()
        .setName('Add to hall')
        .setType(ApplicationCommandType.Message),
    async execute(interaction) {
        const modal = await buildModal();

        const interactionAwaitFilter = (interaction) => interaction.customId('getPinInfo');

        await interaction.showModal(modal);
        interaction.awaitModalSubmit({ interactionAwaitFilter, time: 60_000 })
            .then(modalInteraction => {
                const messageUrl = interaction.targetMessage.url;
                const pinTitle = modalInteraction.fields.getTextInputValue('pinTitle');
                const pinUser = interaction.user;
                modalInteraction.reply( { content: 'Message pinned successfully!', ephemeral: true } );
                interaction.client.channels.cache.get(pinChannelId).send({ embeds: [buildPinEmbed(messageUrl, pinTitle, pinUser)] });
            })
            .catch(err => { 
                console.log('no response to modal'); 
                console.log(err); 
            });
    },
}

const buildModal = async function () {
    const modal = new ModalBuilder()
        .setCustomId('getPinInfo')
        .setTitle('Pin Information')

    const pinTitleInput = new TextInputBuilder()
        .setCustomId('pinTitle')
        .setLabel('What is the pin title?')
        .setRequired(false)
        .setPlaceholder('Pin title (Optional)')
        .setStyle(TextInputStyle.Short)

    const firstActionRow = new ActionRowBuilder().addComponents(pinTitleInput);

    modal.addComponents(firstActionRow);

    return modal;
}

const buildPinMessage = function (messageUrl, pinTitle) {
    if (pinTitle) {
        return `**${pinTitle}** ${messageUrl}`;
    } else {
        return `${messageUrl}`;
    }
}

const buildPinEmbed = function (messageUrl, pinTitle, pinUser) {
    let embed = new EmbedBuilder()
        .setColor(0xC27C0E)
        .setAuthor({ name: pinUser.username, iconURL: pinUser.displayAvatarURL()})
        .setDescription(buildPinMessage(messageUrl, pinTitle))
        .setTimestamp();

    return embed;
}