import mongoose from "mongoose"

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  invite: {
    type: String,
    required: true,
  },
  beschreibung: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "active", "invalid", "warned"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastAudit: {
    type: Date,
    default: null,
  },
  memberCount: {
    type: Number,
    default: 0,
  },
  applicantId: {
    type: String,
    default: null,
  },
  exemptFromRequirements: {
    type: Boolean,
    default: false,
  },
  warningIssuedAt: {
    type: Date,
    default: null,
  },
})

export default mongoose.model("Partner", partnerSchema)
