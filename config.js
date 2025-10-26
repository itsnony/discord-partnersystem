import dotenv from "dotenv"
dotenv.config()

export const config = {
  token: process.env.TOKEN,
  mongoUri: process.env.MONGO_URI,
  ownerIds: ["DEINE_USER_ID_1", "DEINE_USER_ID_2"]
  channels: {
    ownAd: process.env.OWN_AD_CHANNEL,
    partnerAd: process.env.PARTNER_AD_CHANNEL,
    application: process.env.APPLICATION_CHANNEL,
    community: process.env.COMMUNITY_CHANNEL,
    log: process.env.LOG_CHANNEL,
  },
  server: {
    name: process.env.SERVER_NAME || "Mein Server",
    invite: process.env.SERVER_INVITE || "https://discord.gg/example",
    description: process.env.SERVER_DESCRIPTION || "Willkommen auf unserem Server!",
  },
  web: {
    port: process.env.WEB_PORT || 3000,
    discordClientId: process.env.DISCORD_CLIENT_ID,
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
    discordCallbackUrl: process.env.DISCORD_CALLBACK_URL || "http://localhost:3000/auth/callback",
    sessionSecret: process.env.SESSION_SECRET || "change-this-secret-in-production",
  },
}

export default config
