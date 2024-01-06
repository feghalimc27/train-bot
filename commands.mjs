import fs from 'fs';
import path from 'path';
import * as url from 'url';
import { Collection } from 'discord.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const exportCommands = async function () {
    var commands = new Collection();

    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.mjs'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const { command } = await import(filePath);
            // Set a new item in the Collection with the key as the command name and the value as the exported module
            if ('data' in command && 'execute' in command) {
                commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    return commands;
}