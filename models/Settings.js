import mongoose from "mongoose"

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: "global",
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  applicationsOpen: {
    type: Boolean,
    default: false,
  },
})

export default mongoose.model("Settings", settingsSchema)
