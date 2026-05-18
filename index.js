const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType,
    AttachmentBuilder
} = require('discord.js');

const { createClient } = require('@supabase/supabase-js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// =====================================
// CONFIG
// =====================================

const TOKEN = process.env.DISCORD_TOKEN;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CANALES
const CLAIM_CHANNEL_ID = 'PONER_CANAL_RECLAMOS';
const TICKET_CATEGORY_ID = 'PONER_CATEGORIA_TICKETS';

// STAFF
const STAFF_ROLE_ID = 'STAFF_ROLE_ID';

// LOGO MONEDA
const COIN_LOGO = './vaganciacoin.png';

// ROLES
const ROLES = {
    collector: 'ROLE_ID',
    elite: 'ROLE_ID',
    mythical: 'ROLE_ID',
    richest: 'ROLE_ID'
};

// =====================================
// PREMIOS
// =====================================

const rewards = {
    collector: {
        coins: 3,
        name: 'ROL COLLECTOR',
        role: ROLES.collector
    },

    elite: {
        coins: 5,
        name: 'ROL ELITE COLLECTOR',
        role: ROLES.elite
    },

    mythical: {
        coins: 10,
        name: 'ROL MYTHICAL COLLECTOR',
        role: ROLES.mythical
    },

    richest: {
        coins: 15,
        name: 'ROL RICHEST ONE',
        role: ROLES.richest
    },

    deco: {
        coins: 20,
        name: '1 DECO DE 4.99 USD'
    },

    saldo: {
        coins: 30,
        name: '10.000 ARS DE SALDO'
    }
};

// =====================================
// READY
// =====================================

client.once('ready', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

// =====================================
// FUNCIONES SUPABASE
// =====================================

async function getUser(userId) {

    const { data } = await supabase
        .from('vgcoins')
        .select('*')
        .eq('user_id', userId)
        .single();

    return data;
}

async function createUser(userId) {

    await supabase
        .from('vgcoins')
        .insert({
            user_id: userId,
            coins: 0
        });
}

async function addCoins(userId, amount) {

    let user = await getUser(userId);

    if (!user) {
        await createUser(userId);
        user = await getUser(userId);
    }

    const newCoins = Number(user.coins) + amount;

    await supabase
        .from('vgcoins')
        .update({
            coins: newCoins
        })
        .eq('user_id', userId);
}

async function removeCoins(userId, amount) {

    const user = await getUser(userId);

    if (!user) return false;

    const newCoins = Number(user.coins) - amount;

    if (newCoins < 0) return false;

    await supabase
        .from('vgcoins')
        .update({
            coins: newCoins
        })
        .eq('user_id', userId);

    return true;
}

// =====================================
// COMANDOS
// =====================================

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    // =================================
    // SUMAR WIN
    // =================================

    if (message.content.startsWith('!addwin')) {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return;
        }

        const member = message.mentions.users.first();

        if (!member) {
            return message.reply('❌ Menciona un usuario.');
        }

        await addCoins(member.id, 0.15);

        const user = await getUser(member.id);

        message.reply(
            `✅ ${member.username} ganó +0.15 VG COINS\n🪙 Total: ${Number(user.coins).toFixed(2)}`
        );
    }

    // =================================
    // VER COINS
    // =================================

    if (message.content === '!coins') {

        let user = await getUser(message.author.id);

        if (!user) {
            await createUser(message.author.id);
            user = await getUser(message.author.id);
        }

        const attachment = new AttachmentBuilder(COIN_LOGO);

        const embed = new EmbedBuilder()
            .setColor('#d4af37')
            .setThumbnail('attachment://vaganciacoin.png')

            .setAuthor({
                name: `${message.author.username}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })

            .setTitle('🏦 VAGANCIA COINS')

            .setDescription(`
🪙 **TUS VG COINS**

# ${Number(user.coins).toFixed(2)} 🪙

━━━━━━━━━━━━━━

🎮 Relájate, juega, gana.
            `)

            .setFooter({
                text: 'Vagancia Coin System'
            });

        message.reply({
            embeds: [embed],
            files: [attachment]
        });
    }

    // =================================
    // TOP COINS
    // =================================

    if (message.content === '!topcoins') {

        const { data } = await supabase
            .from('vgcoins')
            .select('*')
            .order('coins', { ascending: false })
            .limit(10);

        const attachment = new AttachmentBuilder(COIN_LOGO);

        let ranking = '';

        for (let i = 0; i < data.length; i++) {

            const user = data[i];

            let member;

            try {
                member = await client.users.fetch(user.user_id);
            } catch {
                continue;
            }

            ranking += `
**${i + 1}. ${member.username}**
🪙 ${Number(user.coins).toFixed(2)} VG COINS

`;
        }

        const embed = new EmbedBuilder()
            .setColor('#d4af37')
            .setThumbnail('attachment://vaganciacoin.png')

            .setTitle('🏆 TOP VG COINS')

            .setDescription(`
Ranking de usuarios con más monedas.

━━━━━━━━━━━━━━

${ranking}
            `)

            .setFooter({
                text: 'Vagancia Coin Leaderboard'
            });

        message.reply({
            embeds: [embed],
            files: [attachment]
        });
    }

    // =================================
    // SHOP
    // =================================

    if (message.content === '!vgshop') {

        const attachment = new AttachmentBuilder(COIN_LOGO);

        const embed = new EmbedBuilder()
            .setColor('#d4af37')
            .setThumbnail('attachment://vaganciacoin.png')

            .setTitle('🏦 VAGANCIA COIN SHOP')

            .setDescription(`
🪙 SISTEMA OFICIAL DE RECOMPENSAS

━━━━━━━━━━━━━━

🥉 3 VG COINS
ROL COLLECTOR

🥈 5 VG COINS
ROL ELITE COLLECTOR

🏆 10 VG COINS
ROL MYTHICAL COLLECTOR

👑 15 VG COINS
ROL RICHEST ONE

💎 20 VG COINS
1 DECO DE 4.99 USD

💵 30 VG COINS
10.000 ARS DE SALDO
            `);

        const row = new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('claim_collector')
                    .setLabel('COLLECTOR')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('claim_elite')
                    .setLabel('ELITE')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('claim_mythical')
                    .setLabel('MYTHICAL')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('claim_richest')
                    .setLabel('RICHEST')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('claim_deco')
                    .setLabel('DECO')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId('claim_saldo')
                    .setLabel('SALDO')
                    .setStyle(ButtonStyle.Primary)
            );

        message.channel.send({
            embeds: [embed],
            components: [row, row2],
            files: [attachment]
        });
    }
});

// =====================================
// BOTONES
// =====================================

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isButton()) return;

    const rewardKey = interaction.customId.replace('claim_', '');

    if (!rewards[rewardKey]) return;

    let user = await getUser(interaction.user.id);

    if (!user) {
        await createUser(interaction.user.id);
        user = await getUser(interaction.user.id);
    }

    const reward = rewards[rewardKey];

    if (Number(user.coins) < reward.coins) {

        return interaction.reply({
            content: '❌ No tienes suficientes VG COINS.',
            ephemeral: true
        });
    }

    await removeCoins(interaction.user.id, reward.coins);

    // =================================
    // DAR ROL
    // =================================

    if (reward.role) {

        const member = await interaction.guild.members.fetch(interaction.user.id);

        await member.roles.add(reward.role);
    }

    // =================================
    // CREAR TICKET
    // =================================

    const channel = await interaction.guild.channels.create({

        name: `claim-${interaction.user.username}`,

        type: ChannelType.GuildText,

        parent: TICKET_CATEGORY_ID,

        permissionOverwrites: [

            {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },

            {
                id: interaction.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages
                ]
            },

            {
                id: STAFF_ROLE_ID,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages
                ]
            }
        ]
    });

    const attachment = new AttachmentBuilder(COIN_LOGO);

    const embed = new EmbedBuilder()

        .setColor('#00ff99')

        .setThumbnail('attachment://vaganciacoin.png')

        .setTitle('🎁 NUEVO RECLAMO')

        .setDescription(`
👤 Usuario:
${interaction.user}

🎁 Premio:
${reward.name}

🪙 Coins gastadas:
${reward.coins}

━━━━━━━━━━━━━━

✅ Reclamo generado correctamente.
        `);

    channel.send({
        content: `<@&${STAFF_ROLE_ID}>`,
        embeds: [embed],
        files: [attachment]
    });

    const logChannel = interaction.guild.channels.cache.get(CLAIM_CHANNEL_ID);

    if (logChannel) {

        logChannel.send({
            embeds: [embed],
            files: [attachment]
        });
    }

    interaction.reply({
        content: `✅ Premio reclamado correctamente.\n🎫 Ticket creado: ${channel}`,
        ephemeral: true
    });
});

client.login(TOKEN);