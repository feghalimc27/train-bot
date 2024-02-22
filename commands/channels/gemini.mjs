import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GoogleAuth } from 'google-auth-library';
import { VertexAI } from '@google-cloud/vertexai';

const gcpProjectId = process.env.GCP_PROJECT_ID;
const gcpRegion = process.env.GCP_REGION;
const defaultModel = process.env.GEMINI_MODEL_DEFAULT;
const defaultChatId = 'main';
const maxPromptLength = Number(process.env.GEMINI_MAX_PROMPT_LENGTH);
const maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS);
const maxIdLength = 25;

var chatSessions = {};
var lastUserSessions = {};

export const command = {
    data: new SlashCommandBuilder()
        .setName('gemini')
        .setDescription('Interact with Google\'s Gemini chat model.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('chat')
                .setDescription('Chat with Google\'s Gemini chat model.')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('The prompt message.')
                        .setRequired(true)
                        .setMaxLength(maxPromptLength))
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription(`The target chat session ID (default = ${defaultChatId}).`)
                        .setRequired(false)
                        .setMaxLength(maxIdLength))
                .addStringOption(option =>
                    option
                        .setName('model')
                        .setDescription(`The Gemini model of the new chat session (default = ${defaultModel}).`)
                        .setRequired(false)
                        .addChoices({name: 'gemini-1.0-pro', value: 'gemini-1.0-pro'})))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List the current chat sessions.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('current')
                .setDescription('Grab the last chat sessions you interacted with.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the given chat session.')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription(`The target chat session ID.`)
                        .setRequired(true))),
    async execute(interaction) {
        await interaction.deferReply();

        let command = interaction.options.getSubcommand();
        let response = new EmbedBuilder().setTitle('Invalid Command. Try again.');
        switch(command) {
            case 'chat':
                response = chatCommand(interaction);
                break;
            case 'list':
                response = listCommand();
                break;
            case 'current':
                response = currentCommand(interaction.user.username);
                break;
            case 'reset':
                response = resetCommand(interaction.options.getString('id'));
                break;
        }

        response.setColor(0x0099FF);
        await interaction.editReply({embeds: [response]});
    },
}

const startChat = function(modelName) {
    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    const vertexAI = new VertexAI({
      project: gcpProjectId,
      location: gcpRegion, 
      googleAuthOptions: auth.getCredentials()
    });
    const generativeModel = vertexAI.preview.getGenerativeModel({
      model: modelName,
      generation_config: {max_output_tokens: maxOutputTokens},
    });
    return generativeModel.startChat({});
};

const getChatId = function(user, id='') {
    if (id !== ''){
        lastUserSessions[user] = id;
        return id;
    }

    if (user in lastUserSessions) {
        return lastUserSessions[user];
    }

    lastUserSessions[user] = defaultChatId;
    return defaultChatId
}

const chatCommand = async function(interaction) {
    let id = getChatId(interaction.user.username, interaction.options.getString('id') ?? '');
    let model = interaction.options.getString('model') ?? defaultModel;
    let prompt = interaction.options.getString('prompt');
    console.log('Gemini Prompt: ' + prompt);        

    if (!(id in chatSessions)) {
        chatSessions[id] = {session: startChat(model), model: model};
    }

    const response = await chatSessions[id]['session'].sendMessage(prompt);
    let content = '';
    for (const part of response.response.candidates[0].content.parts) {
        content = content.concat('\n', part.text);
    }
    console.log('Gemini Response: ' + content);

    return new EmbedBuilder()
        .setTitle(prompt)
        .setDescription(content)
        .setFooter({text: `Chat ID: ${id}  Model: ${chatSessions[id]['model']}`});
}

const listCommand = function() {
    let sessions = '';
    for (session in chatSessions) {
        sessions += `${session}\n`;
    }

    return new EmbedBuilder()
        .setTitle('Open Chat Sessions')
        .setDescription(sessions);
}

const currentCommand = function(user) {
    let lastChatId = defaultChatId;
    if (user in lastUserSessions) {
        lastChatId = lastUserSessions[user];
    }

    return new EmbedBuilder()
        .setTitle(`${user}'s Current Chat`)
        .setDescription(lastChatId)
}

const resetCommand = function(chatId) {
    let msg = `Nothing to reset; ${chatId} doesn't exist.`;
    if (chatId in chatSessions) {
        delete chatSessions[chatId];
        msg = 'Success!';
    }

    return new EmbedBuilder()
        .setTitle(`Reset ${chatId}`)
        .setDescription(msg);
}
