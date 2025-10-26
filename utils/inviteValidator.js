export async function validateInvite(client, inviteCode) {
  try {
    // Extract invite code from URL if full URL is provided
    const code = inviteCode.split("/").pop().split("?")[0]

    const invite = await client.fetchInvite(code)

    const memberCount = invite.approximateMemberCount || invite.memberCount || 0

    return {
      valid: true,
      memberCount: memberCount,
      guild: invite.guild,
    }
  } catch (error) {
    console.error(`Invite validation failed for ${inviteCode}:`, error.message)
    return {
      valid: false,
      memberCount: 0,
      guild: null,
      error: error.message,
    }
  }
}

export async function auditAllPartners(client, Partner, logger) {
  try {
    const partners = await Partner.find({})

    let validCount = 0
    let invalidCount = 0
    let warnedCount = 0
    const results = []

    for (const partner of partners) {
      if (partner.exemptFromRequirements) {
        validCount++
        results.push(`⭐ ${partner.name}: Befreit von Anforderungen`)
        continue
      }

      const validation = await validateInvite(client, partner.invite)

      if (validation.valid) {
        if (validation.memberCount < 100) {
          // Issue warning if not already warned
          if (partner.status !== "warned") {
            partner.status = "warned"
            partner.warningIssuedAt = new Date()

            // Send warning DM
            if (partner.applicantId) {
              try {
                const applicant = await client.users.fetch(partner.applicantId)
                await applicant.send({
                  embeds: [
                    {
                      color: 0xfee75c,
                      title: "⚠️ Partnerschaft-Warnung",
                      description:
                        `Dein Server **${partner.name}** erfüllt nicht mehr die Mindestanforderungen!\n\n` +
                        `**Aktuell:** ${validation.memberCount} Mitglieder\n` +
                        `**Erforderlich:** 100 Mitglieder\n\n` +
                        `Du hast **72 Stunden** Zeit, die Anforderungen wieder zu erfüllen, sonst wird die Partnerschaft beendet.`,
                      timestamp: new Date(),
                    },
                  ],
                })
              } catch (error) {
                console.error("Fehler beim Senden der Warn-DM:", error)
              }
            }

            warnedCount++
            results.push(`⚠️ ${partner.name}: Warnung ausgesprochen (${validation.memberCount} Mitglieder)`)
          } else {
            // Check if 72 hours have passed since warning
            const hoursSinceWarning = (Date.now() - partner.warningIssuedAt.getTime()) / (1000 * 60 * 60)
            if (hoursSinceWarning >= 72) {
              // End partnership
              partner.status = "invalid"

              // Remove partner role
              if (partner.applicantId) {
                try {
                  const guild = client.guilds.cache.first()
                  if (guild) {
                    const member = await guild.members.fetch(partner.applicantId).catch(() => null)
                    if (member) {
                      await member.roles.remove("1431950098891411466").catch(() => {})
                    }
                  }

                  const applicant = await client.users.fetch(partner.applicantId)
                  await applicant.send({
                    embeds: [
                      {
                        color: 0xed4245,
                        title: "❌ Partnerschaft beendet",
                        description:
                          `Die Partnerschaft mit **${partner.name}** wurde beendet, da die Mindestanforderungen nach 72 Stunden nicht erfüllt wurden.\n\n` +
                          `Du kannst dich gerne erneut bewerben, sobald dein Server die Anforderungen erfüllt.`,
                        timestamp: new Date(),
                      },
                    ],
                  })
                } catch (error) {
                  console.error("Fehler beim Beenden der Partnerschaft:", error)
                }
              }

              invalidCount++
              results.push(`❌ ${partner.name}: Partnerschaft beendet (72h Frist abgelaufen)`)
            } else {
              warnedCount++
              results.push(`⚠️ ${partner.name}: Noch ${Math.ceil(72 - hoursSinceWarning)}h bis Fristablauf`)
            }
          }
        } else {
          // Requirements met, clear warning if exists
          if (partner.status === "warned") {
            partner.status = "active"
            partner.warningIssuedAt = null

            if (partner.applicantId) {
              try {
                const applicant = await client.users.fetch(partner.applicantId)
                await applicant.send({
                  embeds: [
                    {
                      color: 0x57f287,
                      title: "✅ Anforderungen wieder erfüllt",
                      description:
                        `Dein Server **${partner.name}** erfüllt wieder alle Anforderungen!\n\n` +
                        `Die Warnung wurde aufgehoben.`,
                      timestamp: new Date(),
                    },
                  ],
                })
              } catch (error) {
                console.error("Fehler beim Senden der Bestätigungs-DM:", error)
              }
            }
          }

          partner.status = partner.status === "pending" ? "pending" : "active"
          partner.memberCount = validation.memberCount
          validCount++
          results.push(`✅ ${partner.name}: Gültig (${validation.memberCount} Mitglieder)`)
        }
      } else {
        partner.status = "invalid"
        partner.memberCount = 0
        invalidCount++
        results.push(`❌ ${partner.name}: Ungültig (${validation.error || "Unbekannter Fehler"})`)
      }

      partner.lastAudit = new Date()
      await partner.save()

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    const summary =
      `**Audit abgeschlossen**\n\n` +
      `✅ Gültige Partner: ${validCount}\n` +
      `⚠️ Gewarnter Partner: ${warnedCount}\n` +
      `❌ Ungültige Partner: ${invalidCount}\n\n` +
      `**Details:**\n${results.join("\n")}`

    if (logger) {
      await logger.info("🔍 Partner Audit", summary)
    }
    console.log("Audit completed successfully")

    return { validCount, invalidCount, warnedCount, results }
  } catch (error) {
    console.error("❌ Fehler beim Audit:", error)
    if (logger) {
      await logger.error("🔍 Partner Audit Fehler", error.message)
    }
    return null
  }
}
