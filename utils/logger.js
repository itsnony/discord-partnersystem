import { EmbedBuilder } from "discord.js"
import { config } from "../config.js"

export class Logger {
  constructor(client) {
    this.client = client
  }

  async log(title, description, color = 0x5865f2) {
    try {
      const logChannel = await this.client.channels.fetch(config.channels.log).catch(() => null)
      if (!logChannel) {
        console.log(`[Logger] ${title}: ${description}`)
        return
      }

      const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp()

      await logChannel.send({ embeds: [embed] })
    } catch (error) {
      console.log(`[Logger] ${title}: ${description}`)
    }
  }

  async success(title, description) {
    await this.log(title, description, 0x57f287)
  }

  async error(title, description) {
    await this.log(title, description, 0xed4245)
  }

  async info(title, description) {
    await this.log(title, description, 0x5865f2)
  }

  async warning(title, description) {
    await this.log(title, description, 0xfee75c)
  }
}
