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

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;

// CANALES Y CATEGORÍAS
const CLAIM_CHANNEL_ID = 'PONER_AQUÍ_ID_CANAL_LOGS_RECLAMOS'; 
const TICKET_CATEGORY_ID = '1505883981005193588'; 

// STAFF Y PERMISOS
const STAFF_ROLE_ID = '1476541425263968391'; 

// LOGO MONEDA
const COIN_LOGO = './vaganciacoin.png';

// ROLES DE RECOMPENSA
const ROLES = {
    collector: 'ROLE_ID_COLLECTOR',
    elite: 'ROLE_ID_ELITE',
    mythical: 'ROLE_ID_MYTHICAL',
    richest: 'ROLE_ID_RICHEST'
};

// =====================================
// MONGODB
// =====================================

mongoose.connect(MONGO_URI)
.then(() => {
    console.log('✅ MongoDB conectado');
})
.catch((err) => {
    console.log('❌ Error en MongoDB:', err);
});

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
// PREMIOS
// =====================================

const rewards = {
    collector: { coins: 3, name: 'ROL COLLECTOR', role: ROLES.collector },
    elite: { coins: 5, name: 'ROL ELITE COLLECTOR', role: ROLES.elite },
    mythical: { coins: 10, name: 'ROL MYTHICAL COLLECTOR', role: ROLES.mythical },
    richest: { coins: 15, name: 'ROL RICHEST ONE', role: ROLES.richest },
    deco: { coins: 20, name: '1 DECO DE 4.99 USD' },
    saldo: { coins: 30, name: '10.000 ARS DE SALDO' }
};

// =====================================
// READY
// =====================================

client.once('ready', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

// =====================================
// FUNCIONES AUXILIARES
// =====================================

async function getUser(userId) {
    return await User.findOne({ userId });
}

async function createUser(userId) {
    return await User.create({ userId, coins: 0 });
}

async function addCoins(userId, amount) {
    let user = await getUser(userId);
    if (!user) {
        user = await createUser(userId);
    }
    user.coins += amount;
    await user.save();
    return user;
}

async function removeCoins(userId, amount) {
    const user = await getUser(userId);
    if (!user || user.coins < amount) return false;
    user.coins -= amount;
    await user.save();
    return true;
}

// =====================================
// EVENTO: MENSAJES (COMANDOS)
// =====================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // =================================
    // COMANDO: !wcoin (Suma siempre 0.15)
    // =================================
    if (message.content.startsWith('!wcoin')) {
        const isNotificationStaff = message.member.roles.cache.has(STAFF_ROLE_ID);
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isAdmin && !isNotificationStaff) return;

        const member = message.mentions.users.first();

        if (!member) {
            return message.reply('❌ **Uso correcto:** `!wcoin @usuario`');
        }

        // Suma fija de 0.15 VG COINS
        const user = await addCoins(member.id, 0.15);
        return message.reply(`✅ **Felicidades!** ${member} ganó **+0.15 VG COINS**\n🪙 **Total:** \`${user.coins.toFixed(2)} VG\``);
    }

    // =================================
    // COMANDO: !mycoins
    // =================================
    if (message.content === '!mycoins') {
        let user = await getUser(message.author.id);
        if (!user) {
            user = await createUser(message.author.id);
        }

        const file = new AttachmentBuilder(COIN_LOGO);
        const embed = new EmbedBuilder()
            .setColor('#d4af37')
            .setThumbnail('attachment://vaganciacoin.png')
            .setAuthor({
                name: message.author.username,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTitle('🏦 BANCARIZACIÓN VAGANCIA')
            .setDescription(`
🪙 **TUS COINS DISPONIBLES**

# ${user.coins.toFixed(2)} 🪙

━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *Relájate, juega y canjeá tus victorias.*
            `)
            .setFooter({ text: 'Vagancia Coin System • Control de Perfil' });

        return message.reply({ embeds: [embed], files: [file] });
    }

    // =================================
    // COMANDO: !topcoins
    // =================================
    if (message.content === '!topcoins') {
        const data = await User.find().sort({ coins: -1 }).limit(10);
        const file = new AttachmentBuilder(COIN_LOGO);
        let ranking = '';

        for (let i = 0; i < data.length; i++) {
            const user = data[i];
            let member;
            try {
                member = await client.users.fetch(user.userId);
            } catch {
                continue;
            }
            ranking += `**#${i + 1}** • ${member.username} \`🪙 ${user.coins.toFixed(2)} VG\`\n\n`;
        }

        const embed = new EmbedBuilder()
            .setColor('#d4af37')
            .setThumbnail('attachment://vaganciacoin.png')
            .setTitle('🏆 TOP RANKING • VG COINS')
            .setDescription(`Lista global de los usuarios con más capital acumulado.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${ranking}`)
            .setFooter({ text: 'Vagancia Coin Leaderboard' });

        return message.reply({ embeds: [embed], files: [file] });
    }

    // =================================
    // COMANDO: !panelcoin
    // =================================
    if (message.content === '!panelcoin') {
        const isNotificationStaff = message.member.roles.cache.has(STAFF_ROLE_ID);
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isAdmin && !isNotificationStaff) return;

        const file = new AttachmentBuilder(COIN_LOGO);
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
💵 \`30 VG COINS\` ➔ **10.000 ARS DE SALDO**

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

    const rewardKey = interaction.customId.replace('claim_', '');
    if (!rewards[rewardKey]) return;

    await interaction.deferReply({ ephemeral: true });

    let user = await getUser(interaction.user.id);
    if (!user) {
        user = await createUser(interaction.user.id);
    }

    const reward = rewards[rewardKey];

    if (user.coins < reward.coins) {
        return interaction.editReply({
            content: `❌ **Fondos insuficientes:** Necesitás **${reward.coins} VG COINS** para este canje. Tu saldo es de \`${user.coins.toFixed(2)} VG\`.`
        });
    }

    await removeCoins(interaction.user.id, reward.coins);

    if (reward.role) {
        try {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            await member.roles.add(reward.role);
        } catch (e) {
            console.log("⚠️ No se pudo asignar el rol automáticamente.");
        }
    }

    try {
        const ticketChannel = await interaction.guild.channels.create({
            name: `🎫-claim-${interaction.user.username}`,
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

        const file = new AttachmentBuilder(COIN_LOGO);

        await ticketChannel.send({
            content: `📢 <@&${STAFF_ROLE_ID}> • ¡Nuevo reclamo abierto por ${interaction.user}!`,
            embeds: [ticketEmbed],
            files: [file]
        });

        const logChannel = interaction.guild.channels.cache.get(CLAIM_CHANNEL_ID);
        if (logChannel) {
            logChannel.send({
                content: `📝 **Log de Auditoría de Canjes:**`,
                embeds: [ticketEmbed],
                files: [file]
            }).catch(() => {});
        }

        return interaction.editReply({
            content: `✅ **Canje exitoso.** El premio se ha procesado.\n🎫 Tu ticket privado de entrega fue generado en: ${ticketChannel}`
        });

    } catch (error) {
        console.error(error);
        return interaction.editReply({
            content: `❌ Ocurrió un error al intentar generar tu ticket en la categoría. Contacta a un administrador.`
        });
    }
});

client.login(TOKEN);