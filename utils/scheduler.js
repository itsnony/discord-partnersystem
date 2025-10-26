import cron from "node-cron"
import { EmbedBuilder } from "discord.js"
import { config } from "../config.js"
import { auditAllPartners } from "./inviteValidator.js"

export function setupScheduler(client, Partner, logger) {
  // Post advertisements every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      await postAdvertisements(client, Partner, logger)
    } catch (error) {
      console.error("❌ Fehler beim Posten der Werbung:", error)
      await logger.error("📢 Werbung Fehler", error.message)
    }
  })

  // Daily audit at 12:00 PM
  cron.schedule("0 12 * * *", async () => {
    try {
      await auditAllPartners(client, Partner, logger)
    } catch (error) {
      console.error("❌ Fehler beim täglichen Audit:", error)
      await logger.error("🔍 Tägliches Audit Fehler", error.message)
    }
  })

  console.log("⏰ Scheduler eingerichtet: Werbung alle 6 Stunden, Audit täglich um 12:00 Uhr")
}

async function postAdvertisements(client, Partner, logger) {
  try {
    // Post own server ad
    const ownAdChannel = await client.channels.fetch(config.channels.ownAd)
    if (ownAdChannel) {
      const ownAdEmbed = new EmbedBuilder()
        .setTitle(`📢 ${config.server.name}`)
        .setDescription(config.server.description)
        .setColor(0x5865f2)
        .addFields({
          name: "🔗 Beitreten",
          value: config.server.invite,
        })
        .setTimestamp()

      await ownAdChannel.send({ embeds: [ownAdEmbed] })
    }

    // Post all active partner ads
    const partnerAdChannel = await client.channels.fetch(config.channels.partnerAd)
    if (partnerAdChannel) {
      const activePartners = await Partner.find({ status: "active" })

      for (const partner of activePartners) {
        const partnerEmbed = new EmbedBuilder()
          .setTitle(`🤝 ${partner.name}`)
          .setDescription(partner.beschreibung)
          .setColor(0x57f287)
          .addFields(
            { name: "🔗 Beitreten", value: partner.invite },
            { name: "👥 Mitglieder", value: partner.memberCount.toString(), inline: true },
          )
          .setTimestamp()

        await partnerAdChannel.send({ embeds: [partnerEmbed] })

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    await logger.success(
      "📢 Werbung gepostet",
      `Eigene Werbung und ${await Partner.countDocuments({ status: "active" })} Partner-Werbungen wurden gepostet.`,
    )
  } catch (error) {
    throw error
  }
}
