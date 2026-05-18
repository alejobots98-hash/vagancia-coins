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
const Jimp = require('jimp');
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

const ROLES = {
    collector: 'ROLE_ID_COLLECTOR',
    elite: 'ROLE_ID_ELITE',
    mythical: 'ROLE_ID_MYTHICAL',
    richest: 'ROLE_ID_RICHEST'
};

// =====================================
// CONEXIÓN A MONGODB
// =====================================

if (!MONGO_URI) {
    console.log('❌ ERROR CRÍTICO: No se detectó ninguna variable de MongoDB.');
} else {
    mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB conectado correctamente'))
    .catch((err) => console.log('❌ Error en MongoDB:', err.message));
}

// Schema
const userSchema = new mongoose.Schema({
    userId: String,
    coins: { type: Number, default: 0 }
});
const User = mongoose.model('vgcoins', userSchema);

const rewards = {
    collector: { coins: 3, name: 'ROL COLLECTOR', role: ROLES.collector },
    elite: { coins: 5, name: 'ROL ELITE COLLECTOR', role: ROLES.elite },
    mythical: { coins: 10, name: 'ROL MYTHICAL COLLECTOR', role: ROLES.mythical },
    richest: { coins: 15, name: 'ROL RICHEST ONE', role: ROLES.richest },
    deco: { coins: 20, name: '1 DECO DE 4.99 USD' },
    saldo: { coins: 30, name: '10.000 ARS DE SALDO' }
};

client.once('ready', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

async function getUser(userId) { return await User.findOne({ userId }); }
async function createUser(userId) { return await User.create({ userId, coins: 0 }); }
async function removeCoins(userId, amount) {
    const user = await getUser(userId);
    if (!user || user.coins < amount) return false;
    user.coins = parseFloat((user.coins - amount).toFixed(2));
    await user.save();
    return true;
}

// =====================================
// EVENTO: MENSAJES (COMANDOS)
// =====================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const isNotificationStaff = message.member?.roles.cache.has(STAFF_ROLE_ID);
    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator);

    // !wcoin
    if (message.content.trim().startsWith('!wcoin')) {
        if (!isAdmin && !isNotificationStaff) return;
        const member = message.mentions.users.first();
        if (!member) return message.reply('❌ **Uso correcto:** `!wcoin @usuario`');

        try {
            let user = await User.findOne({ userId: member.id });
            if (!user) user = new User({ userId: member.id, coins: 0 });

            user.coins = parseFloat((user.coins + 0.15).toFixed(2));
            await user.save();
            return message.reply(`✅ **Felicidades!** ${member} ganó **+0.15 VG COINS**\n🪙 **Total:** \`${user.coins.toFixed(2)} VG\``);
        } catch (error) {
            return message.reply(`❌ **Error:** \`${error.message}\``);
        }
    }

    // !resetcoin
    if (message.content.trim().startsWith('!resetcoin')) {
        if (!isAdmin && !isNotificationStaff) return;
        const member = message.mentions.users.first();
        if (!member) return message.reply('❌ **Uso correcto:** `!resetcoin @usuario`');

        try {
            let user = await User.findOne({ userId: member.id });
            if (!user) user = new User({ userId: member.id, coins: 0 });
            user.coins = 0;
            await user.save();
            return message.reply(`🔄 **Bancarización:** Monedas reseteadas.\n🪙 **Saldo Actual:** \`0.00 VG\``);
        } catch (error) {
            return message.reply(`❌ **Error:** \`${error.message}\``);
        }
    }

    // =================================
    // COMANDO ULTRA ESTABLE: !mycoins 🎨
    // =================================
    if (message.content === '!mycoins') {
        try {
            let user = await getUser(message.author.id);
            if (!user) user = await createUser(message.author.id);

            // Creamos un fondo negro puro de 700x250 de forma nativa
            const image = new Jimp(700, 250, 0x111215FF);
            
            // Línea decorativa dorada a la izquierda
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 250; y++) {
                    image.setPixelColor(Jimp.rgbaToInt(212, 175, 55, 255), x, y);
                }
            }

            // Cargamos fuentes nativas bitmap de Jimp (Cero choques con Linux)
            const fontWhite = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            const fontGray = await Jimp.loadFont(Jimp.FONT_SANS_14_BLACK); // Auxiliar gris/oscuro
            const fontYellow = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE); // Modificable por color si se requiere

            // Estampamos textos estables
            image.print(fontWhite, 215, 50, "TUS VG COINS");
            image.print(fontWhite, 215, 95, message.author.username.toUpperCase());
            image.print(fontWhite, 215, 145, `SALDO: ${user.coins.toFixed(2)} VG`);

            // Intentamos estampar el logo de la moneda si existe localmente
            try {
                const coinImg = await Jimp.read(COIN_LOGO_PATH);
                coinImg.resize(150, 150);
                image.composite(coinImg, 510, 50, {
                    mode: Jimp.BLEND_SOURCE_OVER,
                    opacitySource: 0.8
                });
            } catch (e) {}

            // Intentamos meter el avatar de Discord de forma segura
            try {
                const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 128 });
                const avatarImg = await Jimp.read(avatarUrl);
                avatarImg.resize(110, 110);
                image.composite(avatarImg, 50, 70);
            } catch (avErr) {}

            const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
            const attachment = new AttachmentBuilder(buffer, { name: 'profile-vagancia.png' });
            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            return message.reply('❌ Error de procesamiento estable en la tarjeta de perfil.');
        }
    }

    // =================================
    // COMANDO ULTRA ESTABLE: !topcoins 🏆
    // =================================
    if (message.content === '!topcoins') {
        try {
            const data = await User.find().sort({ coins: -1 }).limit(5);
            if (data.length === 0) return message.reply('🪙 El ranking está vacío actualmente.');

            const image = new Jimp(620, 500, 0x111215FF);
            const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            const fontRows = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

            // Pintar cabecera dorada estática
            for (let x = 0; x < 620; x++) {
                for (let y = 0; y < 80; y++) {
                    image.setPixelColor(Jimp.rgbaToInt(212, 175, 55, 255), x, y);
                }
            }

            image.print(fontTitle, 35, 25, "TOP COINS - LA VAGANCIA");

            let yOffset = 120;
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                let username = 'Usuario Desconocido';

                try {
                    const fetchedUser = await client.users.fetch(row.userId);
                    username = fetchedUser.username;
                } catch (e) {}

                image.print(fontRows, 50, yOffset, `${i + 1}. ${username.toUpperCase()}`);
                image.print(fontRows, 450, yOffset, `${row.coins.toFixed(2)} VG`);
                yOffset += 65;
            }

            const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
            const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard-vagancia.png' });
            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            return message.reply('❌ Error de procesamiento estable en el Leaderboard.');
        }
    }

    // !panelcoin
    if (message.content === '!panelcoin') {
        if (!isAdmin && !isNotificationStaff) return;

        const file = new AttachmentBuilder(COIN_LOGO_PATH, { name: 'vaganciacoin.png' });
        const embed = new EmbedBuilder()
            .setColor('#00ff99')
            .setThumbnail('attachment://vaganciacoin.png')
            .setTitle('🏦 LA VAGANCIA • COIN TIENDA')
            .setDescription(`
¡Bienvenido al mercado central de **La Vagancia**! Utiliza tus monedas acumuladas compitiendo en el servidor para canjearlas por los siguientes beneficios exclusivos.

👑 **LISTA DE RECOMPENSAS DISPONIBLES**

🥉 \`03 VG COINS\` ➔ **ROL COLLECTOR**
🥈 \`05 VG COINS\` ➔ **ROL ELITE COLLECTOR**
🏆 \`10 VG COINS\` ➔ **ROL MYTHICAL COLLECTOR**
👑 \`15 VG COINS\` ➔ **ROL RICHEST ONE**
💎 \`20 VG COINS\` ➔ **1 DECO DE 4.99 USD**
💵 \`30 VG COINS\` ➔ **10.000 ARS DE SALDO NARANJA X / MERCADO PAGO**

━━━━━━━━━━━━━━━━━━━━━━━━━━
👇 Presioná el botón correspondiente abajo para iniciar el reclamo.
            `);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_collector').setLabel('🥉 Collector').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim_elite').setLabel('🥈 Elite').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_mythical').setLabel('🏆 Mythical').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('claim_richest').setLabel('👑 Richest').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_deco').setLabel('💎 Canjear Deco 4.99$').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('claim_saldo').setLabel('💵 Canjear 10.000 ARS').setStyle(ButtonStyle.Primary)
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
// EVENTO: INTERACCIONES (BOTONES)
// =====================================

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close_ticket') {
        const isStaff = interaction.member.roles.cache.has(STAFF_ROLE_ID);
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isAdmin && !isStaff) {
            return interaction.reply({ content: '❌ Solo el Staff puede cerrar este ticket.', ephemeral: true });
        }

        await interaction.reply('🔒 **Cerrando el ticket...** Este canal se eliminará en 5 segundos.');
        setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
        return;
    }

    const rewardKey = interaction.customId.replace('claim_', '');
    if (!rewards[rewardKey]) return;

    await interaction.deferReply({ ephemeral: true });

    if (mongoose.connection.readyState !== 1) {
        return interaction.editReply({ content: '❌ El sistema de base de datos se encuentra offline.' });
    }

    let user = await getUser(interaction.user.id);
    if (!user) user = await createUser(interaction.user.id);

    const reward = rewards[rewardKey];

    if (user.coins < reward.coins) {
        return interaction.editReply({
            content: `❌ **Fondos insuficientes:** Necesitás **${reward.coins} VG COINS**. Saldo: \`${user.coins.toFixed(2)} VG\`.`
        });
    }

    await removeCoins(interaction.user.id, reward.coins);

    if (reward.role && reward.role !== 'ROLE_ID_COLLECTOR' && reward.role !== 'ROLE_ID_ELITE' && reward.role !== 'ROLE_ID_MYTHICAL' && reward.role !== 'ROLE_ID_RICHEST') {
        try {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            await member.roles.add(reward.role);
        } catch (e) {}
    }

    try {
        const ticketChannel = await interaction.guild.channels.create({
            name: `🎫-claim-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.AttachFiles
                    ]
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.AttachFiles
                    ]
                }
            ]
        });

        const ticketEmbed = new EmbedBuilder()
            .setColor('#bb0000')
            .setThumbnail('attachment://vaganciacoin.png')
            .setTitle('🎫 TICKET DE RECLAMO CENTRAL')
            .setDescription(`
Hola ${interaction.user}, tu solicitud de canje fue procesada con éxito y tus monedas ya fueron descontadas. El Staff revisará este caso a la brevedad.

\`\`\`
          INFORMACIÓN DEL CANJE
\`\`\`
> 👤 **Usuario Solicitante:** ${interaction.user} (\`${interaction.user.id}\`)
> 🎁 **Premio Adquirido:** \`${reward.name}\`
> 🪙 **Inversión Realizada:** \`${reward.coins} VG COINS\`
> 🏦 **Saldo Restante:** \`${(user.coins - reward.coins).toFixed(2)} VG\`

━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Si canjeaste Saldo o Deco, por favor deja las capturas o datos necesarios en este chat para agilizar la entrega manual.*
            `)
            .setFooter({ text: 'Sistema de Reclamación Centralizado • La Vagancia' });

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Cerrar Ticket').setStyle(ButtonStyle.Danger)
        );

        const file = new AttachmentBuilder(COIN_LOGO_PATH, { name: 'vaganciacoin.png' });

        await ticketChannel.send({
            content: `📢 <@&${STAFF_ROLE_ID}> • ¡Nuevo reclamo abierto por ${interaction.user}!`,
            embeds: [ticketEmbed],
            components: [closeRow],
            files: [file]
        });

        return interaction.editReply({
            content: `✅ **Canje exitoso.**\n🎫 Tu ticket privado fue generado en: ${ticketChannel}`
        });

    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: `❌ Error al generar tu ticket.` });
    }
});

client.login(TOKEN);