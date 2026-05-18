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
const path = require('path'); // Módulo nativo para manejar rutas seguras

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

// RUTA ABSOLUTA SEGURA: Apunta directo a tu archivo subido en GitHub
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
    console.log('❌ ERROR CRÍTICO: No se detectó ninguna variable de MongoDB in Railway.');
} else {
    mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB conectado correctamente');
    })
    .catch((err) => {
        console.log('❌ Error al conectar en MongoDB:', err.message);
    });
}

// =====================================
// BASE DE DATOS - SCHEMA
// =====================================

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
// EVENTO: MENSAJES (COMANDOS)
// =====================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const isNotificationStaff = message.member?.roles.cache.has(STAFF_ROLE_ID);
    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator);

    // =================================
    // COMANDO: !wcoin
    // =================================
    if (message.content.trim().startsWith('!wcoin')) {
        if (!isAdmin && !isNotificationStaff) return;
        const member = message.mentions.users.first();
        if (!member) return message.reply('❌ **Uso correcto:** `!wcoin @usuario`');

        try {
            if (mongoose.connection.readyState !== 1) return message.reply('❌ **Error de conexión:** MongoDB offline.');
            let user = await User.findOne({ userId: member.id });
            if (!user) user = new User({ userId: member.id, coins: 0 });

            user.coins = parseFloat((user.coins + 0.15).toFixed(2));
            await user.save();
            return message.reply(`✅ **Felicidades!** ${member} ganó **+0.15 VG COINS**\n🪙 **Total:** \`${user.coins.toFixed(2)} VG\``);
        } catch (error) {
            return message.reply(`❌ **Error:** \`${error.message}\``);
        }
    }

    // =================================
    // COMANDO: !resetcoin
    // =================================
    if (message.content.trim().startsWith('!resetcoin')) {
        if (!isAdmin && !isNotificationStaff) return;
        const member = message.mentions.users.first();
        if (!member) return message.reply('❌ **Uso correcto:** `!resetcoin @usuario`');

        try {
            let user = await User.findOne({ userId: member.id });
            if (!user) user = new User({ userId: member.id, coins: 0 });
            user.coins = 0;
            await user.save();
            return message.reply(`🔄 **Bancarización:** Monedas reseteadas para ${member}.\n🪙 **Saldo Actual:** \`0.00 VG\``);
        } catch (error) {
            return message.reply(`❌ **Error:** \`${error.message}\``);
        }
    }

    // =================================
    // COMANDO GRAFICO: !mycoins 🎨
    // =================================
    if (message.content === '!mycoins') {
        try {
            if (mongoose.connection.readyState !== 1) return message.reply('❌ **Error:** Sin conexión a la BD.');

            let user = await getUser(message.author.id);
            if (!user) user = await createUser(message.author.id);

            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');

            const grad = ctx.createLinearGradient(0, 0, 700, 250);
            grad.addColorStop(0, '#111215');
            grad.addColorStop(1, '#16171a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 700, 250);

            ctx.fillStyle = '#d4af37';
            ctx.fillRect(0, 0, 8, 250);

            ctx.save();
            ctx.beginPath();
            ctx.arc(110, 125, 60, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            
            const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 256 });
            const avatarImg = await loadImage(avatarUrl);
            ctx.drawImage(avatarImg, 50, 65, 120, 120);
            ctx.restore();

            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(110, 125, 60, 0, Math.PI * 2, true);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText(message.author.username.toUpperCase(), 200, 95);

            ctx.fillStyle = '#a0a2a6';
            ctx.font = '14px sans-serif';
            ctx.fillText('TUS VG COINS', 200, 60);

            ctx.fillStyle = '#e5c158';
            ctx.font = 'bold 42px sans-serif';
            ctx.fillText(`${user.coins.toFixed(2)}`, 200, 155);

            ctx.fillStyle = '#212226';
            drawRoundRect(ctx, 200, 180, 430, 14, 7, true, false);

            const porcentaje = Math.min(user.coins / 30, 1);
            if (porcentaje > 0) {
                ctx.fillStyle = '#d4af37';
                drawRoundRect(ctx, 200, 180, 430 * porcentaje, 14, 7, true, false);
            }

            ctx.fillStyle = '#686a6e';
            ctx.font = 'italic 13px sans-serif';
            ctx.fillText('Relájate, juega, gana.', 200, 215);

            // Carga segura desde la ruta absoluta del proyecto
            try {
                const coinImg = await loadImage(COIN_LOGO_PATH);
                ctx.save();
                ctx.globalAlpha = 0.85; 
                ctx.drawImage(coinImg, 480, 35, 180, 180);
                ctx.restore();
            } catch (e) {
                console.log("⚠️ No se pudo cargar el archivo local vaganciacoin.png:", e.message);
            }

            const attachment = new AttachmentBuilder(await canvas.toBuffer(), { name: 'profile-vagancia.png' });
            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            return message.reply('❌ Error gráfico al generar la tarjeta de perfil.');
        }
    }

    // =================================
    // COMANDO GRAFICO: !topcoins 🏆
    // =================================
    if (message.content === '!topcoins') {
        try {
            if (mongoose.connection.readyState !== 1) return message.reply('❌ **Error:** Sin conexión.');

            const data = await User.find().sort({ coins: -1 }).limit(5); 
            if (data.length === 0) return message.reply('🪙 El ranking está vacío actualmente.');

            const canvas = createCanvas(620, 500);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#111215';
            ctx.fillRect(0, 0, 620, 500);

            ctx.fillStyle = '#d4af37';
            ctx.fillRect(0, 0, 620, 80);

            ctx.fillStyle = '#111215';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('🏆 TOP COINS', 35, 48);

            ctx.fillStyle = '#332500';
            ctx.font = '14px sans-serif';
            ctx.fillText('Ranking de los usuarios con más VG Coins', 35, 68);

            let yOffset = 140;
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                let username = 'Usuario Desconocido';
                let avatarBuffer;

                try {
                    const fetchedUser = await client.users.fetch(row.userId);
                    username = fetchedUser.username;
                    const avatarUrl = fetchedUser.displayAvatarURL({ extension: 'png', size: 128 });
                    avatarBuffer = await loadImage(avatarUrl);
                } catch {}

                ctx.fillStyle = '#16171a';
                drawRoundRect(ctx, 30, yOffset - 32, 560, 58, 8, true, false);

                if (avatarBuffer) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(110, yOffset - 3, 20, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(avatarBuffer, 90, yOffset - 23, 40, 40);
                    ctx.restore();
                }

                if (i === 0) ctx.fillStyle = '#ffd700'; 
                else if (i === 1) ctx.fillStyle = '#c0c0c0'; 
                else if (i === 2) ctx.fillStyle = '#cd7f32'; 
                else ctx.fillStyle = '#ffffff';

                ctx.font = 'bold 20px sans-serif';
                ctx.fillText(`${i + 1}.`, 55, yOffset + 3);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText(username, 150, yOffset + 3);

                ctx.fillStyle = '#e5c158';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText(`${row.coins.toFixed(2)} VG`, 490, yOffset + 3);

                yOffset += 70;
            }

            try {
                const coinImg = await loadImage(COIN_LOGO_PATH);
                ctx.drawImage(coinImg, 510, 400, 80, 80);
            } catch (e) {}

            const attachment = new AttachmentBuilder(await canvas.toBuffer(), { name: 'leaderboard-vagancia.png' });
            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            return message.reply('❌ Error gráfico al generar el Leaderboard.');
        }
    }

    // =================================
    // COMANDO: !panelcoin
    // =================================
    if (message.content === '!panelcoin') {
        if (!isAdmin && !isNotificationStaff) return;

        // Mandamos la imagen local adjunta para el panel de la tienda
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