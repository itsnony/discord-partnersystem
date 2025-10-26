import { Client, GatewayIntentBits, Partials, MessageFlags } from "discord.js"
import mongoose from "mongoose"
import { config } from "./config.js"
import { Logger } from "./utils/logger.js"
import { setupScheduler } from "./utils/scheduler.js"
import Partner from "./models/Partner.js"
import Settings from "./models/Settings.js"
import { execute as readyHandler } from "./events/ready.js"
import { execute as interactionHandler } from "./events/interactionCreate.js"
import { createWebServer } from "./web/server.js"

console.log("🔍 Bot Konfiguration:")
console.log("  - Token:", config.token ? "✅ Gesetzt" : "❌ Fehlt")
console.log("  - MongoDB URI:", config.mongoUri ? "✅ Gesetzt" : "❌ Fehlt")
console.log("  - Owner IDs (raw):", process.env.OWNER_IDS || "❌ Nicht gesetzt")
console.log(
  "  - Owner IDs (parsed):",
  config.ownerIds && config.ownerIds.length > 0 ? `✅ [${config.ownerIds.join(", ")}]` : "❌ Fehlt oder leer",
)
console.log("  - Anzahl Owner IDs:", config.ownerIds ? config.ownerIds.length : 0)
console.log("  - Eigene Werbung Channel:", config.channels.ownAd ? "✅ Gesetzt" : "❌ Fehlt")
console.log("  - Partner Werbung Channel:", config.channels.partnerAd ? "✅ Gesetzt" : "❌ Fehlt")
console.log("  - Bewerbungs Channel:", config.channels.application ? "✅ Gesetzt" : "❌ Fehlt")
console.log("  - Community Channel:", config.channels.community ? "✅ Gesetzt" : "❌ Fehlt")
console.log("  - Log Channel:", config.channels.log ? "✅ Gesetzt" : "❌ Fehlt")
console.log("")

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
})

// Initialize logger
const logger = new Logger(client)

// Connect to MongoDB
console.log("🔄 Verbinde mit MongoDB...")
mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log("✅ MongoDB verbunden!")
  })
  .catch((error) => {
    console.error("❌ MongoDB Verbindungsfehler:", error)
    process.exit(1)
  })

// Event: Bot ready
client.once("clientReady", async () => {
  await readyHandler(client, logger)

  // Setup scheduler for automated tasks
  setupScheduler(client, Partner, logger)

  const app = createWebServer(client, logger)
  const port = config.web.port
  app.listen(port, () => {
    console.log(`🌐 Web Dashboard läuft auf http://localhost:${port}`)
  })
})

// Event: Interaction create
client.on("interactionCreate", async (interaction) => {
  try {
    await interactionHandler(interaction, Partner, Settings, logger)
  } catch (error) {
    console.error("❌ Fehler beim Verarbeiten der Interaction:", error)
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Ein Fehler ist aufgetreten!",
          flags: MessageFlags.Ephemeral,
        })
      } catch (e) {
        console.error("❌ Konnte nicht auf Interaction antworten:", e)
      }
    }
  }
})

// Error handling
client.on("error", (error) => {
  console.error("❌ Discord Client Fehler:", error)
})

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Promise Rejection:", error)
})

// Login to Discord
console.log("🔄 Starte Bot...")
client.login(config.token).catch((error) => {
  console.error("❌ Login Fehler:", error)
  process.exit(1)
})
