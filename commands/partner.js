import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js"
import { config } from "../config.js"
import { validateInvite, auditAllPartners } from "../utils/inviteValidator.js"

export const data = new SlashCommandBuilder()
  .setName("partner")
  .setDescription("Partner Management System")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Füge einen Partner manuell hinzu (Nur Owner)")
      .addStringOption((option) => option.setName("name").setDescription("Name des Partner-Servers").setRequired(true))
      .addStringOption((option) => option.setName("invite").setDescription("Discord Einladungslink").setRequired(true))
      .addStringOption((option) =>
        option.setName("beschreibung").setDescription("Beschreibung / Werbetext des Partners").setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Entferne einen Partner (Nur Owner)")
      .addStringOption((option) => option.setName("name").setDescription("Name des Partner-Servers").setRequired(true)),
  )
  .addSubcommand((subcommand) => subcommand.setName("list").setDescription("Zeige alle Partner"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("accept")
      .setDescription("Akzeptiere einen ausstehenden Partner (Nur Owner)")
      .addStringOption((option) =>
        option.setName("name").setDescription("Name des Partner-Servers").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("deny")
      .setDescription("Lehne einen ausstehenden Partner ab (Nur Owner)")
      .addStringOption((option) =>
        option.setName("name").setDescription("Name des Partner-Servers").setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("audit").setDescription("Führe eine sofortige Einladungsvalidierung durch"),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("openapps").setDescription("Öffne das Bewerbungssystem (Nur Owner)"),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("closeapps").setDescription("Schließe das Bewerbungssystem (Nur Owner)"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("partnerbedingungen")
      .setDescription("Sende oder bearbeite die Partnerbedingungen (Nur Owner)")
      .addStringOption((option) =>
        option
          .setName("aktion")
          .setDescription("Senden oder Bearbeiten")
          .setRequired(true)
          .addChoices({ name: "Senden", value: "send" }, { name: "Bearbeiten", value: "edit" }),
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Kanal für die Nachricht")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText),
      ),
  )

export async function execute(interaction, Partner, Settings, logger) {
  console.log("Partner command execute called")
  const subcommand = interaction.options.getSubcommand()
  console.log("Subcommand:", subcommand)

  // Owner-only commands
  const ownerCommands = ["add", "remove", "accept", "deny", "openapps", "closeapps", "partnerbedingungen"]
  if (ownerCommands.includes(subcommand)) {
    console.log("Owner command detected, checking permissions")
    // Check if ownerIds is properly configured
    if (!config.ownerIds || !Array.isArray(config.ownerIds)) {
      console.error("config.ownerIds is not properly configured:", config.ownerIds)
      return interaction.reply({
        content: "❌ Bot-Konfigurationsfehler: Owner IDs nicht gesetzt!",
        flags: MessageFlags.Ephemeral,
      })
    }

    // Check if user is an owner
    console.log("Checking if user", interaction.user.id, "is in ownerIds:", config.ownerIds)
    if (!config.ownerIds.includes(interaction.user.id)) {
      console.log("User is not an owner, denying access")
      return interaction.reply({
        content: "❌ Nur der Server-Owner kann diesen Befehl verwenden!",
        flags: MessageFlags.Ephemeral,
      })
    }
    console.log("User is an owner, proceeding")
  }

  console.log("Executing subcommand handler:", subcommand)
  switch (subcommand) {
    case "add":
      await handleAdd(interaction, Partner, logger)
      break
    case "remove":
      await handleRemove(interaction, Partner, logger)
      break
    case "list":
      await handleList(interaction, Partner)
      break
    case "accept":
      await handleAccept(interaction, Partner, logger)
      break
    case "deny":
      await handleDeny(interaction, Partner, logger)
      break
    case "audit":
      await handleAudit(interaction, Partner, logger)
      break
    case "openapps":
      await handleOpenApps(interaction, Settings, logger)
      break
    case "closeapps":
      await handleCloseApps(interaction, Settings, logger)
      break
    case "partnerbedingungen":
      await handlePartnerbedingungen(interaction, logger)
      break
  }
}

async function handleAdd(interaction, Partner, logger) {
  const name = interaction.options.getString("name")
  const invite = interaction.options.getString("invite")
  const beschreibung = interaction.options.getString("beschreibung")

  try {
    // Check if partner already exists
    const existing = await Partner.findOne({ name })
    if (existing) {
      return interaction.reply({
        content: "❌ Ein Partner mit diesem Namen existiert bereits!",
        flags: MessageFlags.Ephemeral,
      })
    }

    // Validate invite
    const validation = await validateInvite(interaction.client, invite)

    const partner = new Partner({
      name,
      invite,
      beschreibung,
      status: "active",
      memberCount: validation.memberCount,
    })

    await partner.save()

    const embed = new EmbedBuilder()
      .setTitle("✅ Partner hinzugefügt")
      .setDescription(`**${name}** wurde erfolgreich als Partner hinzugefügt!`)
      .addFields(
        { name: "Einladung", value: invite },
        { name: "Status", value: validation.valid ? "✅ Gültig" : "⚠️ Ungültig" },
        { name: "Mitglieder", value: validation.memberCount.toString() },
      )
      .setColor(0x57f287)
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
    await logger.success("➕ Partner hinzugefügt", `${name} wurde von ${interaction.user.tag} hinzugefügt.`)
  } catch (error) {
    console.error("Fehler beim Hinzufügen:", error)
    await interaction.reply({
      content: "❌ Fehler beim Hinzufügen des Partners!",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleRemove(interaction, Partner, logger) {
  const name = interaction.options.getString("name")

  try {
    const partner = await Partner.findOneAndDelete({ name })

    if (!partner) {
      return interaction.reply({
        content: "❌ Partner nicht gefunden!",
        flags: MessageFlags.Ephemeral,
      })
    }

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Partner entfernt")
      .setDescription(`**${name}** wurde erfolgreich entfernt.`)
      .setColor(0xed4245)
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
    await logger.info("➖ Partner entfernt", `${name} wurde von ${interaction.user.tag} entfernt.`)
  } catch (error) {
    console.error("Fehler beim Entfernen:", error)
    await interaction.reply({
      content: "❌ Fehler beim Entfernen des Partners!",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleList(interaction, Partner) {
  try {
    const partners = await Partner.find({})

    if (partners.length === 0) {
      return interaction.reply({
        content: "📋 Keine Partner gefunden!",
        flags: MessageFlags.Ephemeral,
      })
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 Partner Liste")
      .setDescription(`Insgesamt **${partners.length}** Partner`)
      .setColor(0x5865f2)
      .setTimestamp()

    for (const partner of partners) {
      let statusEmoji = "⏳"
      if (partner.status === "active") statusEmoji = "✅"
      if (partner.status === "invalid") statusEmoji = "❌"

      embed.addFields({
        name: `${statusEmoji} ${partner.name}`,
        value: `Status: ${partner.status}\nMitglieder: ${partner.memberCount}\n[Beitreten](${partner.invite})`,
        inline: true,
      })
    }

    await interaction.reply({ embeds: [embed] })
  } catch (error) {
    console.error("Fehler beim Auflisten:", error)
    await interaction.reply({
      content: "❌ Fehler beim Auflisten der Partner!",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleAccept(interaction, Partner, logger) {
  const name = interaction.options.getString("name")

  try {
    if (!name) {
      const pendingPartners = await Partner.find({ status: "pending" })

      if (pendingPartners.length === 0) {
        return interaction.reply({
          content: "📋 Keine ausstehenden Bewerbungen vorhanden!",
          flags: MessageFlags.Ephemeral,
        })
      }

      const embed = new EmbedBuilder()
        .setTitle("📋 Ausstehende Partner-Bewerbungen")
        .setDescription(
          `Es gibt **${pendingPartners.length}** ausstehende Bewerbung(en).\n\n` +
            `Verwende \`/partner accept <name>\` um einen Partner zu akzeptieren.`,
        )
        .setColor(0xfee75c)
        .setTimestamp()

      for (const partner of pendingPartners) {
        embed.addFields({
          name: `📝 ${partner.name}`,
          value:
            `**Mitglieder:** ${partner.memberCount}\n` +
            `**Beschreibung:** ${partner.beschreibung}\n` +
            `**Einladung:** ${partner.invite}`,
          inline: false,
        })
      }

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
    }

    const partner = await Partner.findOne({ name, status: "pending" })

    if (!partner) {
      return interaction.reply({
        content: "❌ Kein ausstehender Partner mit diesem Namen gefunden!",
        flags: MessageFlags.Ephemeral,
      })
    }

    partner.status = "active"
    await partner.save()

    if (partner.applicantId) {
      try {
        const applicant = await interaction.client.users.fetch(partner.applicantId)
        const dmEmbed = new EmbedBuilder()
          .setTitle("✅ Partnerschaft akzeptiert!")
          .setDescription(
            `Glückwunsch! Deine Bewerbung für **${partner.name}** wurde akzeptiert!\n\n` +
              `**Wichtige Hinweise:**\n` +
              `• Halte mindestens 100 Mitglieder\n` +
              `• Folge unserem Werbekanal: <#1431950297030201384>\n` +
              `• Poste nur alle 6 Stunden Werbung\n\n` +
              `Bei Nichteinhaltung kann die Partnerschaft beendet werden.`,
          )
          .setColor(0x57f287)
          .setTimestamp()

        await applicant.send({ embeds: [dmEmbed] })

        const guild = interaction.guild
        const member = await guild.members.fetch(partner.applicantId).catch(() => null)
        if (member) {
          await member.roles.add("1431950098891411466").catch((err) => {
            console.error("Fehler beim Hinzufügen der Rolle:", err)
          })
        }
      } catch (error) {
        console.error("Fehler beim Senden der DM:", error)
      }
    }

    // Send confirmation to admin
    const confirmEmbed = new EmbedBuilder()
      .setTitle("✅ Partner akzeptiert")
      .setDescription(`**${name}** wurde als Partner akzeptiert!`)
      .setColor(0x57f287)
      .setTimestamp()

    await interaction.reply({ embeds: [confirmEmbed] })

    // Send welcome embed to community channel
    const communityChannel = await interaction.client.channels.fetch(config.channels.community)
    if (communityChannel) {
      const welcomeEmbed = new EmbedBuilder()
        .setTitle("🎉 Neuer Partner!")
        .setDescription(`Wir freuen uns, **${partner.name}** als neuen Partner begrüßen zu dürfen!`)
        .addFields(
          { name: "📝 Beschreibung", value: partner.beschreibung },
          { name: "🔗 Beitreten", value: partner.invite },
        )
        .setColor(0x57f287)
        .setTimestamp()

      await communityChannel.send({ embeds: [welcomeEmbed] })
    }

    await logger.success("✅ Partner akzeptiert", `${name} wurde von ${interaction.user.tag} akzeptiert.`)
  } catch (error) {
    console.error("Fehler beim Akzeptieren:", error)
    await interaction.reply({
      content: "❌ Fehler beim Akzeptieren des Partners!",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleDeny(interaction, Partner, logger) {
  const name = interaction.options.getString("name")

  try {
    if (!name) {
      const pendingPartners = await Partner.find({ status: "pending" })

      if (pendingPartners.length === 0) {
        return interaction.reply({
          content: "📋 Keine ausstehenden Bewerbungen vorhanden!",
          flags: MessageFlags.Ephemeral,
        })
      }

      const embed = new EmbedBuilder()
        .setTitle("📋 Ausstehende Partner-Bewerbungen")
        .setDescription(
          `Es gibt **${pendingPartners.length}** ausstehende Bewerbung(en).\n\n` +
            `Verwende \`/partner deny <name>\` um einen Partner abzulehnen.`,
        )
        .setColor(0xfee75c)
        .setTimestamp()

      for (const partner of pendingPartners) {
        embed.addFields({
          name: `📝 ${partner.name}`,
          value:
            `**Mitglieder:** ${partner.memberCount}\n` +
            `**Beschreibung:** ${partner.beschreibung}\n` +
            `**Einladung:** ${partner.invite}`,
          inline: false,
        })
      }

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
    }

    const partner = await Partner.findOne({ name, status: "pending" })

    if (!partner) {
      return interaction.reply({
        content: "❌ Kein ausstehender Partner mit diesem Namen gefunden!",
        flags: MessageFlags.Ephemeral,
      })
    }

    if (partner.applicantId) {
      try {
        const applicant = await interaction.client.users.fetch(partner.applicantId)
        const dmEmbed = new EmbedBuilder()
          .setTitle("❌ Partnerschaft abgelehnt")
          .setDescription(
            `Deine Bewerbung für **${partner.name}** wurde leider abgelehnt.\n\n` +
              `Mögliche Gründe:\n` +
              `• Zu wenige Mitglieder\n` +
              `• Inaktive Community\n` +
              `• Nicht passende Thematik\n\n` +
              `Du kannst dich gerne später erneut bewerben!`,
          )
          .setColor(0xed4245)
          .setTimestamp()

        await applicant.send({ embeds: [dmEmbed] })
      } catch (error) {
        console.error("Fehler beim Senden der DM:", error)
      }
    }

    await partner.deleteOne()

    const embed = new EmbedBuilder()
      .setTitle("❌ Partner abgelehnt")
      .setDescription(`**${name}** wurde abgelehnt und entfernt.`)
      .setColor(0xed4245)
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
    await logger.warning("❌ Partner abgelehnt", `${name} wurde von ${interaction.user.tag} abgelehnt.`)
  } catch (error) {
    console.error("Fehler beim Ablehnen:", error)
    await interaction.reply({
      content: "❌ Fehler beim Ablehnen des Partners!",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleAudit(interaction, Partner, logger) {
  await interaction.deferReply()

  try {
    const result = await auditAllPartners(interaction.client, Partner, logger)

    if (!result) {
      return interaction.editReply({ content: "❌ Fehler beim Audit!" })
    }

    const embed = new EmbedBuilder()
      .setTitle("🔍 Partner Audit abgeschlossen")
      .setDescription(
        `✅ Gültige Partner: ${result.validCount}\n` +
          `❌ Ungültige Partner: ${result.invalidCount}\n\n` +
          `**Details:**\n${result.results.join("\n")}`,
      )
      .setColor(0x5865f2)
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    console.error("Fehler beim Audit:", error)
    await interaction.editReply({ content: "❌ Fehler beim Audit!" })
  }
}

async function handleOpenApps(interaction, Settings, logger) {
  try {
    await Settings.findOneAndUpdate({ key: "applicationsOpen" }, { value: true }, { upsert: true })

    const embed = new EmbedBuilder()
      .setTitle("✅ Bewerbungen geöffnet")
      .setDescription("Das Bewerbungssystem ist jetzt geöffnet!")
      .setColor(0x57f287)
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
    await logger.success("📝 Bewerbungen geöffnet", `Von ${interaction.user.tag} geöffnet.`)
  } catch (error) {
    console.error("Fehler beim Öffnen:", error)
    await interaction.reply({
      content: "❌ Fehler beim Öffnen der Bewerbungen!",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleCloseApps(interaction, Settings, logger) {
  try {
    await Settings.findOneAndUpdate({ key: "applicationsOpen" }, { value: false }, { upsert: true })

    const embed = new EmbedBuilder()
      .setTitle("🔒 Bewerbungen geschlossen")
      .setDescription("Das Bewerbungssystem ist jetzt geschlossen!")
      .setColor(0xed4245)
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
    await logger.warning("📝 Bewerbungen geschlossen", `Von ${interaction.user.tag} geschlossen.`)
  } catch (error) {
    console.error("Fehler beim Schließen:", error)
    await interaction.reply({
      content: "❌ Fehler beim Schließen der Bewerbungen!",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handlePartnerbedingungen(interaction, logger) {
  const aktion = interaction.options.getString("aktion")
  const channel = interaction.options.getChannel("channel")

  try {
    const embed = new EmbedBuilder()
      .setTitle("🤝 Partner-Anforderungen für Jannikjbi Treffpunkt")
      .setDescription(
        "Hey! Schön, dass du Partner von Jannikjbi Treffpunkt werden möchtest.\n\n" +
          "Damit unsere Partnerschaften fair und wertvoll bleiben, gibt's hier ein paar einfache, aber klare Anforderungen.",
      )
      .addFields(
        {
          name: "🌍 Grundvoraussetzungen",
          value:
            "• Freundliches, respektvolles Miteinander – kein Platz für Toxizität, Diskriminierung oder NSFW.\n" +
            "• Aktive Community (Chats, Events, Beteiligung).\n" +
            "• Themen wie Gaming, Community, KI, Technik sind willkommen.",
        },
        {
          name: "📈 Aktivität & Struktur",
          value:
            "• Mindestens 100 Mitglieder.\n" +
            "• Ca. 20 % regelmäßig aktiv (Chat, Voice, Events).\n" +
            "• Klare Struktur, Regeln, Rollen.",
        },
        {
          name: "🔒 Qualität & Moderation",
          value:
            "• Einhaltung aller Discord-Richtlinien.\n" +
            "• 2FA für Moderation empfohlen.\n" +
            "• Originalität statt Kopien.",
        },
        {
          name: "💬 Zusammenarbeit",
          value:
            "• Gegenseitige Werbung transparent im Partner-Kanal.\n" +
            "• Teilnahme an Community-Events pro Quartal.\n" +
            "• Kurzes Check-In mit Partnerteam.",
        },
        {
          name: "📨 Bewerbung",
          value:
            "Wenn du alles erfüllst, kannst du dich über den Button unten bewerben. Unser Partner-Team meldet sich danach persönlich.",
        },
      )
      .setColor(0x5865f2)
      .setTimestamp()

    const button = new ButtonBuilder()
      .setCustomId("partner_apply")
      .setLabel("Jetzt bewerben")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📝")

    const row = new ActionRowBuilder().addComponents(button)

    if (aktion === "send") {
      // Send new message
      await channel.send({ embeds: [embed], components: [row] })

      await interaction.reply({
        content: `✅ Partnerbedingungen wurden in ${channel} gesendet!`,
        flags: MessageFlags.Ephemeral,
      })

      await logger.success("📋 Partnerbedingungen gesendet", `Von ${interaction.user.tag} in ${channel.name} gesendet.`)
    } else if (aktion === "edit") {
      // Fetch last message from bot in channel
      const messages = await channel.messages.fetch({ limit: 10 })
      const botMessage = messages.find(
        (m) => m.author.id === interaction.client.user.id && m.embeds[0]?.title?.includes("Partner-Anforderungen"),
      )

      if (!botMessage) {
        return interaction.reply({
          content: "❌ Keine Partnerbedingungen-Nachricht in diesem Kanal gefunden!",
          flags: MessageFlags.Ephemeral,
        })
      }

      await botMessage.edit({ embeds: [embed], components: [row] })

      await interaction.reply({
        content: `✅ Partnerbedingungen in ${channel} wurden aktualisiert!`,
        flags: MessageFlags.Ephemeral,
      })

      await logger.success(
        "📋 Partnerbedingungen aktualisiert",
        `Von ${interaction.user.tag} in ${channel.name} aktualisiert.`,
      )
    }
  } catch (error) {
    console.error("Fehler bei Partnerbedingungen:", error)
    await interaction.reply({
      content: "❌ Fehler beim Verarbeiten der Partnerbedingungen!",
      flags: MessageFlags.Ephemeral,
    })
  }
}
