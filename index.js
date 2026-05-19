require('dotenv').config();

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

const mongoose = require('mongoose');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// =====================================
// CONFIGURACIÓN GENERAL
// =====================================

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;

const TICKET_CATEGORY_ID = '1505883981005193588';
const STAFF_ROLE_ID = '1476541425263968391';

const COIN_LOGO_PATH = path.join(__dirname, 'vaganciacoin.png');

const VG_EMOJI = '<:f51af00539bb4f79a49135a782a8dcff:1506198945301528627>';

const ROLES = {
    collector: 'ROLE_ID_COLLECTOR',
    elite: 'ROLE_ID_ELITE',
    mythical: 'ROLE_ID_MYTHICAL',
    richest: 'ROLE_ID_RICHEST'
};

// =====================================
// CONEXIÓN MONGODB
// =====================================

if (!MONGO_URI) {
    console.log('❌ No se detectó MongoDB URI');
} else {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ MongoDB conectado'))
        .catch(err => console.log('❌ Error MongoDB:', err.message));
}

// =====================================
// SCHEMA
// =====================================

const userSchema = new mongoose.Schema({
    userId: String,
    coins: {
        type: Number,
        default: 0
    }
});

const User = mongoose.model('vgcoins', userSchema);

// =====================================
// RECOMPENSAS
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
// FUNCIONES
// =====================================

async function getUser(userId) {
    return await User.findOne({ userId });
}

async function createUser(userId) {
    return await User.create({
        userId,
        coins: 0
    });
}

async function removeCoins(userId, amount) {
    const user = await getUser(userId);
    if (!user || user.coins < amount) return false;

    user.coins = parseFloat(
        (user.coins - amount).toFixed(2)
    );

    await user.save();
    return true;
}

// =====================================
// RECTÁNGULOS REDONDOS
// =====================================

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

// =====================================
// MENSAJES
// =====================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const isStaff = message.member?.roles.cache.has(STAFF_ROLE_ID);
    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator);

    // =====================================
    // !WCOIN
    // =====================================
    if (message.content.startsWith('!wcoin')) {
        if (!isAdmin && !isStaff) return;

        const member = message.mentions.users.first();
        if (!member) {
            return message.reply('❌ Uso correcto: `!wcoin @usuario`');
        }

        try {
            let user = await getUser(member.id);
            if (!user) user = await createUser(member.id);

            user.coins = parseFloat((user.coins + 0.15).toFixed(2));
            await user.save();

            return message.reply(
                `${VG_EMOJI} ${member} ganó \`+0.15 VG COINS\`\n${VG_EMOJI} Total actual: \`${user.coins.toFixed(2)} VG\``
            );
        } catch (err) {
            return message.reply(`❌ Error: ${err.message}`);
        }
    }

    // =====================================
    // !RESETCOIN
    // =====================================
    if (message.content.startsWith('!resetcoin')) {
        if (!isAdmin && !isStaff) return;

        const member = message.mentions.users.first();
        if (!member) {
            return message.reply('❌ Uso correcto: `!resetcoin @usuario`');
        }

        try {
            let user = await getUser(member.id);
            if (!user) user = await createUser(member.id);

            user.coins = 0;
            await user.save();

            return message.reply(`${VG_EMOJI} Monedas reseteadas correctamente`);
        } catch (err) {
            return message.reply(`❌ Error: ${err.message}`);
        }
    }

    // =====================================
    // !MYCOINS
    // =====================================
    if (message.content === '!mycoins') {
        try {
            let user = await getUser(message.author.id);
            if (!user) user = await createUser(message.author.id);

            const canvas = createCanvas(800, 260);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#0f1014';
            ctx.fillRect(0, 0, 800, 260);

            ctx.fillStyle = '#17181d';
            drawRoundRect(ctx, 20, 20, 760, 220, 20, true, false);

            ctx.fillStyle = '#ffcc00';
            drawRoundRect(ctx, 20, 20, 10, 220, 20, true, false);

            try {
                const avatar = await loadImage(
                    message.author.displayAvatarURL({ extension: 'png', size: 256 })
                );
                ctx.save();
                ctx.beginPath();
                ctx.arc(120, 130, 65, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 55, 65, 130, 130);
                ctx.restore();
            } catch {
                ctx.fillStyle = '#2b2d36';
                ctx.beginPath();
                ctx.arc(120, 130, 65, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(120, 130, 65, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 34px Arial';
            ctx.fillText(message.author.username.toUpperCase(), 230, 105);

            ctx.fillStyle = '#9ca0aa';
            ctx.font = '20px Arial';
            ctx.fillText('SALDO ACTUAL DE VG COINS', 230, 145);

            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 52px Arial';
            ctx.fillText(`${user.coins.toFixed(2)} VG`, 230, 205);

            try {
                const coin = await loadImage(COIN_LOGO_PATH);
                ctx.globalAlpha = 0.9;
                ctx.drawImage(coin, 590, 45, 150, 150);
            } catch {}

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#6b7280';
            ctx.font = 'italic 16px Arial';
            ctx.fillText('La Vagancia • Sistema Oficial', 230, 235);

            const attachment = new AttachmentBuilder(await canvas.toBuffer('image/png'), { name: 'mycoins.png' });
            return message.reply({ files: [attachment] });

        } catch (err) {
            console.log(err);
            return message.reply('❌ Error al generar la tarjeta.');
        }
    }

    // =====================================
    // !TOPCOINS
    // =====================================
    if (message.content === '!topcoins') {
        try {
            const data = await User.find().sort({ coins: -1 }).limit(5);

            if (!data.length) {
                return message.reply('❌ No hay usuarios en el ranking.');
            }

            const canvas = createCanvas(800, 520);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#0f1014';
            ctx.fillRect(0, 0, 800, 520);

            // Cabecera Amarilla
            ctx.fillStyle = '#ffcc00';
            drawRoundRect(ctx, 20, 20, 760, 70, 18, true, false);

            ctx.fillStyle = '#111111';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('TOP VG COINS', 45, 68);

            let y = 115;

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                let username = 'Usuario Desconocido';
                let avatar = null;

                try {
                    const fetched = await client.users.fetch(row.userId);
                    username = fetched.username;
                    avatar = await loadImage(
                        fetched.displayAvatarURL({ extension: 'png', size: 128 })
                    );
                } catch {}

                // Fondo de la fila
                ctx.fillStyle = '#17181d';
                drawRoundRect(ctx, 20, y, 760, 65, 15, true, false);

                // Número de posición (#1, #2, etc.)
                ctx.fillStyle = '#ffcc00';
                ctx.font = 'bold 28px Arial';
                ctx.fillText(`#${i + 1}`, 45, y + 42);

                // Render de Avatar Circular
                if (avatar) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(140, y + 32, 24, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(avatar, 116, y + 8, 48, 48);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#2b2d36';
                    ctx.beginPath();
                    ctx.arc(140, y + 32, 24, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Nombre del usuario
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(username.toUpperCase(), 200, y + 41);

                // Saldo de monedas alineado a la derecha
                ctx.fillStyle = '#ffcc00';
                ctx.font = 'bold 26px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`${row.coins.toFixed(2)} VG`, 740, y + 41);
                ctx.textAlign = 'left'; // Resetear alineación

                y += 76;
            }

            // Moneda decorativa abajo a la derecha
            try {
                const coin = await loadImage(COIN_LOGO_PATH);
                ctx.save();
                ctx.globalAlpha = 0.8;
                ctx.drawImage(coin, 650, 410, 110, 110);
                ctx.restore();
            } catch {}

            const attachment = new AttachmentBuilder(await canvas.toBuffer('image/png'), { name: 'topcoins.png' });
            return message.reply({ files: [attachment] });

        } catch (err) {
            console.log(err);
            return message.reply('❌ Error al generar el top.');
        }
    }

    // =====================================
    // !PANELCOIN
    // =====================================
    if (message.content === '!panelcoin') {
        if (!isAdmin && !isStaff) return;

        const file = new AttachmentBuilder(COIN_LOGO_PATH, { name: 'vaganciacoin.png' });

        const embed = new EmbedBuilder()
            .setColor('#ffcc00')
            .setThumbnail('attachment://vaganciacoin.png')
            .setTitle('LA VAGANCIA • COIN STORE')
            .setDescription(`
${VG_EMOJI} \`03 VG COINS\` ➜ **ROL COLLECTOR**
${VG_EMOJI} \`05 VG COINS\` ➜ **ROL ELITE**
${VG_EMOJI} \`10 VG COINS\` ➜ **ROL MYTHICAL**
${VG_EMOJI} \`15 VG COINS\` ➜ **ROL RICHEST**
${VG_EMOJI} \`20 VG COINS\` ➜ **1 DECO 4.99 USD**
${VG_EMOJI} \`30 VG COINS\` ➜ **10.000 ARS**

━━━━━━━━━━━━━━━━━━
Presioná un botón para reclamar.
`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_collector').setLabel('Collector').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim_elite').setLabel('Elite').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_mythical').setLabel('Mythical').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('claim_richest').setLabel('Richest').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_deco').setLabel('Deco').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('claim_saldo').setLabel('10.000 ARS').setStyle(ButtonStyle.Primary)
        );

        await message.delete().catch(() => {});

        return message.channel.send({
            embeds: [embed],
            components: [row, row2],
            files: [file]
        });
    }
});

// =====================================
// BOTONES
// =====================================

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // =====================================
    // CERRAR TICKET
    // =====================================
    if (interaction.customId === 'close_ticket') {
        const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isStaff && !isAdmin) {
            return interaction.reply({
                content: '❌ Solo el staff puede cerrar tickets.',
                ephemeral: true
            });
        }

        await interaction.reply('🔒 Cerrando ticket en 5 segundos...');
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
        return;
    }

    // =====================================
    // CLAIMS
    // =====================================
    const rewardKey = interaction.customId.replace('claim_', '');
    if (!rewards[rewardKey]) return;

    await interaction.deferReply({ ephemeral: true });

    if (mongoose.connection.readyState !== 1) {
        return interaction.editReply({ content: '❌ Base de datos desconectada.' });
    }

    let user = await getUser(interaction.user.id);
    if (!user) user = await createUser(interaction.user.id);

    const reward = rewards[rewardKey];
    if (user.coins < reward.coins) {
        return interaction.editReply({ content: `❌ Necesitás ${reward.coins} VG COINS` });
    }

    await removeCoins(interaction.user.id, reward.coins);

    try {
        const ticketChannel = await interaction.guild.channels.create({
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
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ]
        });

        const file = new AttachmentBuilder(COIN_LOGO_PATH, { name: 'vaganciacoin.png' });

        const embed = new EmbedBuilder()
            .setColor('#ffcc00')
            .setThumbnail('attachment://vaganciacoin.png')
            .setTitle('RECLAMO GENERADO')
            .setDescription(`
${VG_EMOJI} Usuario: ${interaction.user}

${VG_EMOJI} Premio:
\`${reward.name}\`

${VG_EMOJI} Costo:
\`${reward.coins} VG COINS\`

${VG_EMOJI} Saldo restante:
\`${(user.coins - reward.coins).toFixed(2)} VG\`
`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
            content: `<@&${STAFF_ROLE_ID}> Nuevo reclamo.`,
            embeds: [embed],
            components: [row],
            files: [file]
        });

        return interaction.editReply({ content: `✅ Ticket creado: ${ticketChannel}` });

    } catch (err) {
        console.log(err);
        return interaction.editReply({ content: '❌ Error creando ticket.' });
    }
});

// =====================================
// LOGIN
// =====================================
client.login(TOKEN);