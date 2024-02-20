import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GoogleAuth } from 'google-auth-library';
import { VertexAI } from '@google-cloud/vertexai';

const gcpProjectId = process.env.GCP_PROJECT_ID;
const gcpRegion = process.env.GCP_REGION;
const defaultModel = process.env.GEMINI_MODEL_DEFAULT;
const maxPromptLength = Number(process.env.GEMINI_MAX_PROMPT_LENGTH);
const maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS);

var geminiChatId = null;
var geminiChatSession = null;

export const command = {
    data: new SlashCommandBuilder()
        .setName('gemini')
        .setDescription('Interact with Google\'s Gemini chat model.')
        .addStringOption(option =>
            option
                .setName('prompt')
                .setDescription('The message to prompt Gemini with.')
                .setRequired(true)
                .setMaxLength(maxPromptLength))
        .addBooleanOption(option =>
            option
                .setName('new')
                .setDescription('Creates a new chat session. Replaces any existing chat session.')
                .setRequired(false))
        .addStringOption(option =>
            option
                .setName('model')
                .setDescription(`The Gemini model to use when creating a new chat session (default = ${defaultModel}).`)
                .setRequired(false)
                .addChoices({ name: 'gemini-1.0-pro', value: 'gemini-1.0-pro'})),
    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');
        console.log('Gemini Prompt: ' + prompt);
        const newChat = interaction.options.getBoolean('new');
        const model = interaction.options.getString('model') ?? defaultModel;

        await interaction.deferReply();
        if (geminiChatSession === null || newChat) {
            geminiChatId = genPseudoRandomString(10);
            geminiChatSession = startChat(model);
        }

        const response = await geminiChatSession.sendMessage(prompt);
        var content = '';
        for (const part of response.response.candidates[0].content.parts) {
            content = content.concat('\n', part.text);
        }
        console.log('Gemini Response: ' + content);
        embedResponse = new EmbedBuilder()
            .setColor(0x0099FF)
            .addFields(
                {name: `${interaction.user.username}`, value: prompt},
                {name: 'Gemini', value: content}
            )
            .setFooter({text: `Chat ID: ${geminiChatId}`})


        await interaction.editReply(embedResponse);
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

const genPseudoRandomString = function(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}
