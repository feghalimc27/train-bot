import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GoogleAuth } from 'google-auth-library';
import { VertexAI } from '@google-cloud/vertexai';

const gcpProjectId = process.env.GCP_PROJECT_ID;
const gcpRegion = process.env.GCP_REGION;
const defaultModel = process.env.GEMINI_MODEL_DEFAULT;
const maxPromptLengthLimit = process.env.GEMINI_MAX_PROMPT_LENGTH_LIMIT;
const maxOutputTokens = process.env.GEMINI_MAX_OUTPUT_TOKENS;

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
                .setMaxLength(maxPromptLengthLimit))
        .addBooleanOption(option =>
            option
                .setName('new')
                .setDescription('Creates a new chat session. Replaces any existing chat session.')
                .setRequired(false))
        .addStringOption(option =>
            option
                .setName('model')
                .setDescription('The Gemini model to use when creating a new chat session (default = gemini-pro).')
                .setRequired(false)
                .addChoices({ name: 'gemini-pro', value: 'gemini-pro'})),
    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');
        const newChat = interaction.options.getBoolean('new');
        const model = interaction.options.getString('model') ?? defaultModel;

        await interaction.deferReply();
        if (geminiChatSession === null || newChat) {
            geminiChatSession = startChat(model);
        }

        const response = await geminiChatSession.sendMessage(prompt);
        var content = '';
        for (const part of response.response.candidates[0].content.parts) {
            content.concat('\n', part);
        }
        await interaction.editReply(content);
    },
}

const startChat = function(modelName) {
    const auth = new GoogleAuth();
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
