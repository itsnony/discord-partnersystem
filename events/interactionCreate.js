import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js"
import { config } from "../config.js"
import { execute as executePartnerCommand } from "../commands/partner.js"

export async function execute(interaction, Partner, Settings, logger) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    console.log("Chat input command:", interaction.commandName)
    if (interaction.commandName === "partner") {
      console.log("Executing partner command")
      await executePartnerCommand(interaction, Partner, Settings, logger)
    }
  }

  // Handle button interactions
  if (interaction.isButton()) {
    console.log("Button interaction:", interaction.customId)
    if (interaction.customId === "partner_apply") {
      await handlePartnerApplication(interaction, Settings)
    } else if (interaction.customId.startsWith("partner_accept_")) {
      const partnerId = interaction.customId.replace("partner_accept_", "")
      await handleQuickAccept(interaction, Partner, partnerId, logger)
    } else if (interaction.customId.startsWith("partner_deny_")) {
      const partnerId = interaction.customId.replace("partner_deny_", "")
      await handleQuickDeny(interaction, Partner, partnerId, logger)
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    console.log("Modal submission:", interaction.customId)
    if (interaction.customId === "partner_application_modal") {
      await handleApplicationSubmit(interaction, Partner, logger)
    }
  }
}

async function handlePartnerApplication(interaction, Settings) {
  try {
    // Check if applications are open
    const setting = await Settings.findOne({ key: "applicationsOpen" })
    const applicationsOpen = setting ? setting.value : true

    if (!applicationsOpen) {
      return interaction.reply({
        content: "❌ Bewerbungen sind derzeit geschlossen!",
        flags: MessageFlags.Ephemeral,
      })
    }

    // Create and show modal
    const modal = new ModalBuilder().setCustomId("partner_application_modal").setTitle("Partner Bewerbung")

    const nameInput = new TextInputBuilder()
      .setCustomId("server_name")
      .setLabel("Server Name")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Dein Server Name")
      .setRequired(true)
      .setMaxLength(100)

    const inviteInput = new TextInputBuilder()
      .setCustomId("server_invite")
      .setLabel("Einladungslink")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("https://discord.gg/...")
      .setRequired(true)

    const descriptionInput = new TextInputBuilder()
      .setCustomId("server_description")
      .setLabel("Beschreibung / Werbetext")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Beschreibe deinen Server...")
      .setRequired(true)
      .setMaxLength(1000)

    const row1 = new ActionRowBuilder().addComponents(nameInput)
    const row2 = new ActionRowBuilder().addComponents(inviteInput)
    const row3 = new ActionRowBuilder().addComponents(descriptionInput)

    modal.addComponents(row1, row2, row3)

    await interaction.showModal(modal)
  } catch (error) {
    console.error("Fehler beim Anzeigen des Modals:", error)
  }
}

async function handleApplicationSubmit(interaction, Partner, logger) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  } catch (error) {
    console.error("Fehler beim Defer:", error)
    return
  }

  try {
    const name = interaction.fields.getTextInputValue("server_name")
    const invite = interaction.fields.getTextInputValue("server_invite")
    const beschreibung = interaction.fields.getTextInputValue("server_description")

    // Check if partner already exists
    const existing = await Partner.findOne({ name })
    if (existing) {
      return interaction.editReply({
        content: "❌ Ein Partner mit diesem Namen existiert bereits!",
      })
    }

    const partner = new Partner({
      name,
      invite,
      beschreibung,
      status: "pending",
      applicantId: interaction.user.id,
    })

    await partner.save()

    try {
      const pendingEmbed = new EmbedBuilder()
        .setTitle("⏳ Bewerbung wird geprüft")
        .setDescription(
          `Deine Bewerbung für **${name}** wurde erfolgreich eingereicht!\n\n` +
            "Ein Administrator wird deine Bewerbung prüfen. Du erhältst eine Benachrichtigung, sobald eine Entscheidung getroffen wurde.",
        )
        .setColor(0xfee75c)
        .setTimestamp()

      await interaction.user.send({ embeds: [pendingEmbed] })
    } catch (error) {
      console.error("Fehler beim Senden der Pending-DM:", error)
    }

    // Send confirmation to user
    const userEmbed = new EmbedBuilder()
      .setTitle("✅ Bewerbung eingereicht")
      .setDescription(
        `Deine Bewerbung für **${name}** wurde erfolgreich eingereicht!\n\n` +
          "Ein Administrator wird deine Bewerbung prüfen.",
      )
      .setColor(0x57f287)
      .setTimestamp()

    await interaction.editReply({ embeds: [userEmbed] })

    const logChannel = await interaction.client.channels.fetch(config.channels.log)
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("📝 Neue Partner-Bewerbung")
        .setDescription(`Von ${interaction.user.tag} (${interaction.user.id})`)
        .addFields(
          { name: "Server Name", value: name },
          { name: "Einladung", value: invite },
          { name: "Beschreibung", value: beschreibung },
        )
        .setColor(0x5865f2)
        .setTimestamp()

      const acceptButton = new ButtonBuilder()
        .setCustomId(`partner_accept_${partner._id}`)
        .setLabel("Akzeptieren")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅")

      const denyButton = new ButtonBuilder()
        .setCustomId(`partner_deny_${partner._id}`)
        .setLabel("Ablehnen")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")

      const row = new ActionRowBuilder().addComponents(acceptButton, denyButton)

      await logChannel.send({ embeds: [logEmbed], components: [row] })
    }

    await logger.info("📝 Neue Bewerbung", `${name} von ${interaction.user.tag}`)
  } catch (error) {
    console.error("Fehler beim Einreichen der Bewerbung:", error)
    try {
      await interaction.editReply({
        content: "❌ Fehler beim Einreichen der Bewerbung!",
      })
    } catch (e) {
      console.error("Fehler beim Senden der Fehler-Nachricht:", e)
    }
  }
}

async function handleQuickAccept(interaction, Partner, partnerId, logger) {
  try {
    const partner = await Partner.findById(partnerId)
    if (!partner) {
      return interaction.reply({
        content: "❌ Partner nicht gefunden!",
        flags: MessageFlags.Ephemeral,
      })
    }

    partner.status = "active"
    await partner.save()

    // Send DM to applicant
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

        // Give partner role
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

    // Update button message
    await interaction.update({
      components: [],
      embeds: [
        EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(0x57f287)
          .setFooter({
            text: `Akzeptiert von ${interaction.user.tag}`,
          }),
      ],
    })

    // Send to community channel
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

    await logger.success("✅ Partner akzeptiert", `${partner.name} wurde von ${interaction.user.tag} akzeptiert.`)
  } catch (error) {
    console.error("Fehler beim Akzeptieren:", error)
    await interaction.reply({
      content: "❌ Fehler beim Akzeptieren!",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleQuickDeny(interaction, Partner, partnerId, logger) {
  try {
    const partner = await Partner.findById(partnerId)
    if (!partner) {
      return interaction.reply({
        content: "❌ Partner nicht gefunden!",
        flags: MessageFlags.Ephemeral,
      })
    }

    // Send denial DM
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

    // Update button message
    await interaction.update({
      components: [],
      embeds: [
        EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(0xed4245)
          .setFooter({
            text: `Abgelehnt von ${interaction.user.tag}`,
          }),
      ],
    })

    await logger.warning("❌ Partner abgelehnt", `${partner.name} wurde von ${interaction.user.tag} abgelehnt.`)
  } catch (error) {
    console.error("Fehler beim Ablehnen:", error)
    await interaction.reply({
      content: "❌ Fehler beim Ablehnen!",
      flags: MessageFlags.Ephemeral,
    })
  }
}
