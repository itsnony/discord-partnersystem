import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } from "discord.js"
import { config } from "../config.js"
import { data as partnerCommand } from "../commands/partner.js"

export async function execute(client, logger) {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`)

  // Register slash commands
  try {
    console.log("🔄 Registriere Slash Commands...")

    const rest = new REST({ version: "10" }).setToken(config.token)

    await rest.put(Routes.applicationCommands(client.user.id), { body: [partnerCommand.toJSON()] })

    console.log("✅ Slash Commands erfolgreich registriert!")
  } catch (error) {
    console.error("❌ Fehler beim Registrieren der Commands:", error)
  }

  // Setup application panel
  try {
    // Wait for guilds to be cached
    if (client.guilds.cache.size === 0) {
      console.log("⚠️ Bot ist in keinem Server. Bitte lade den Bot ein!")
      return
    }

    const applicationChannel = await client.channels.fetch(config.channels.application).catch(() => null)

    if (!applicationChannel) {
      console.log("⚠️ Bewerbungs-Channel nicht gefunden oder keine Berechtigung. Überspringe Panel-Erstellung.")
    } else {
      // Check if panel already exists
      const messages = await applicationChannel.messages.fetch({ limit: 10 }).catch(() => null)

      if (!messages) {
        console.log("⚠️ Kann Nachrichten nicht abrufen. Überspringe Panel-Erstellung.")
      } else {
        const existingPanel = messages.find(
          (m) => m.author.id === client.user.id && m.embeds[0]?.title === "🤝 Partner werden",
        )

        if (!existingPanel) {
          const embed = new EmbedBuilder()
            .setTitle("🤝 Partner werden")
            .setDescription(
              "**Möchtest du Partner werden?**\n\n" +
                "Klicke auf den Button unten, um dich zu bewerben!\n\n" +
                "**Voraussetzungen:**\n" +
                "• Aktiver Discord Server\n" +
                "• Gültiger Einladungslink\n" +
                "• Aussagekräftige Beschreibung\n\n" +
                "**Was bieten wir?**\n" +
                "• Regelmäßige Werbung für deinen Server\n" +
                "• Zugang zu unserer Community\n" +
                "• Langfristige Partnerschaft",
            )
            .setColor(0x5865f2)
            .setTimestamp()

          const button = new ButtonBuilder()
            .setCustomId("partner_apply")
            .setLabel("Jetzt bewerben")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📝")

          const row = new ActionRowBuilder().addComponents(button)

          await applicationChannel.send({ embeds: [embed], components: [row] })
          console.log("✅ Bewerbungspanel erstellt!")
        } else {
          console.log("ℹ️ Bewerbungspanel existiert bereits.")
        }
      }
    }
  } catch (error) {
    console.log("⚠️ Fehler beim Erstellen des Bewerbungspanels:", error.message)
  }

  try {
    await logger.success("🤖 Bot gestartet", `${client.user.tag} ist jetzt online!`)
  } catch (error) {
    console.log("⚠️ Konnte nicht in Log-Channel schreiben:", error.message)
  }

  console.log("✅ Bot ist vollständig online und bereit!")
}
