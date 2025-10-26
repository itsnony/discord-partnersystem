import express from "express"
import { isAuthenticated, isOwner } from "../middleware/auth.js"
import Partner from "../../models/Partner.js"
import Settings from "../../models/Settings.js"
import config from "../../config.js"

const router = express.Router()

router.use(isAuthenticated)
router.use(isOwner)

// Accept partner
router.post("/accept/:id", async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id)
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner nicht gefunden" })
    }

    partner.status = "active"
    await partner.save()

    if (partner.applicantId) {
      try {
        const client = req.app.locals.client
        const applicant = await client.users.fetch(partner.applicantId)

        await applicant.send({
          embeds: [
            {
              color: 0x57f287,
              title: "✅ Partnerschaft akzeptiert!",
              description:
                `Glückwunsch! Deine Bewerbung für **${partner.name}** wurde akzeptiert!\n\n` +
                `**Wichtige Hinweise:**\n` +
                `• Halte mindestens 100 Mitglieder\n` +
                `• Folge unserem Werbekanal: <#1431950297030201384>\n` +
                `• Poste nur alle 6 Stunden Werbung\n\n` +
                `Bei Nichteinhaltung kann die Partnerschaft beendet werden.`,
              timestamp: new Date(),
            },
          ],
        })

        // Give partner role
        const guild = client.guilds.cache.first()
        if (guild) {
          const member = await guild.members.fetch(partner.applicantId).catch(() => null)
          if (member) {
            await member.roles.add("1431950098891411466").catch((err) => {
              console.error("Fehler beim Hinzufügen der Rolle:", err)
            })
          }
        }
      } catch (error) {
        console.error("Fehler beim Senden der DM:", error)
      }
    }

    // Send community announcement
    const client = req.app.locals.client
    const communityChannel = await client.channels.fetch(config.channels.community)
    if (communityChannel) {
      await communityChannel.send({
        embeds: [
          {
            color: 0x00ff00,
            title: "🎉 Neue Partnerschaft!",
            description: `Wir freuen uns, **${partner.name}** als neuen Partner begrüßen zu dürfen!\n\n${partner.beschreibung}\n\n[Zum Server](${partner.invite})`,
            fields: [{ name: "👥 Mitglieder", value: partner.memberCount?.toString() || "Unbekannt", inline: true }],
            timestamp: new Date(),
          },
        ],
      })
    }

    res.json({ success: true, message: "Partner erfolgreich akzeptiert" })
  } catch (error) {
    console.error("[Web] Accept partner error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Deny partner
router.post("/deny/:id", async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id)
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner nicht gefunden" })
    }

    if (partner.applicantId) {
      try {
        const client = req.app.locals.client
        const applicant = await client.users.fetch(partner.applicantId)

        await applicant.send({
          embeds: [
            {
              color: 0xed4245,
              title: "❌ Partnerschaft abgelehnt",
              description:
                `Deine Bewerbung für **${partner.name}** wurde leider abgelehnt.\n\n` +
                `Mögliche Gründe:\n` +
                `• Zu wenige Mitglieder\n` +
                `• Inaktive Community\n` +
                `• Nicht passende Thematik\n\n` +
                `Du kannst dich gerne später erneut bewerben!`,
              timestamp: new Date(),
            },
          ],
        })
      } catch (error) {
        console.error("Fehler beim Senden der Denial-DM:", error)
      }
    }

    await partner.deleteOne()

    res.json({ success: true, message: "Bewerbung abgelehnt" })
  } catch (error) {
    console.error("[Web] Deny partner error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post("/exempt/:id", async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id)
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner nicht gefunden" })
    }

    partner.exemptFromRequirements = !partner.exemptFromRequirements
    await partner.save()

    res.json({
      success: true,
      exemptFromRequirements: partner.exemptFromRequirements,
      message: `Partner ${partner.exemptFromRequirements ? "ist nun" : "ist nicht mehr"} von Anforderungen befreit`,
    })
  } catch (error) {
    console.error("[Web] Exempt partner error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Remove partner
router.delete("/:id", async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id)
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner nicht gefunden" })
    }

    res.json({ success: true, message: "Partner erfolgreich entfernt" })
  } catch (error) {
    console.error("[Web] Remove partner error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Toggle applications
router.post("/settings/applications", async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: "global" })
    if (!settings) {
      settings = await Settings.create({
        key: "global",
        value: {},
        applicationsOpen: false,
      })
    }

    settings.applicationsOpen = !settings.applicationsOpen
    await settings.save()

    res.json({
      success: true,
      applicationsOpen: settings.applicationsOpen,
      message: `Bewerbungen ${settings.applicationsOpen ? "geöffnet" : "geschlossen"}`,
    })
  } catch (error) {
    console.error("[Web] Toggle applications error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Force audit
router.post("/audit", async (req, res) => {
  try {
    const { auditAllPartners } = await import("../../utils/inviteValidator.js")
    const client = req.app.locals.client
    const logger = req.app.locals.logger
    const PartnerModel = (await import("../../models/Partner.js")).default

    await auditAllPartners(client, PartnerModel, logger)
    res.json({ success: true, message: "Audit erfolgreich durchgeführt" })
  } catch (error) {
    console.error("[Web] Audit error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
