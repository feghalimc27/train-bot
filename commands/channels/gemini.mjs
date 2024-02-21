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
                .addChoices({name: 'gemini-1.0-pro', value: 'gemini-1.0-pro'}))
        .addBooleanOption(option =>
            option
                .setName('reset')
                .setDescription('Reset the given chat session (default = false).')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();

        let id = getChatId(interaction);
        let model = interaction.options.getString('model') ?? defaultModel;
        let reset = interaction.options.getBoolean('reset') ?? false;
        let prompt = interaction.options.getString('prompt');
        console.log('Gemini Prompt: ' + prompt);        

        if (!(id in chatSessions) || reset) {
            chatSessions[id] = {session: startChat(model), model: model};
        }

        const response = await chatSessions[id]['session'].sendMessage(prompt);
        let content = '';
        for (const part of response.response.candidates[0].content.parts) {
            content = content.concat('\n', part.text);
        }
        console.log('Gemini Response: ' + content);

        let embedResponse = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(prompt)
            .setDescription(content)
            .setFooter({text: `Chat ID: ${id}  Model: ${chatSessions[id]['model']}`});

        await interaction.editReply({embeds: [embedResponse]});
    },
}

const getChatId = function(interaction) {
    let id = interaction.options.getString('id') ?? '';
    let user = interaction.user.username;

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
