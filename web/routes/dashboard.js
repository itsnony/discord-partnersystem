import express from "express"
import { isAuthenticated, isOwner } from "../middleware/auth.js"
import Partner from "../../models/Partner.js"
import Settings from "../../models/Settings.js"

const router = express.Router()

router.use(isAuthenticated)
router.use(isOwner)

router.get("/", async (req, res) => {
  try {
    const partners = await Partner.find({ status: "active" })
    const pending = await Partner.find({ status: "pending" })
    const settings = await Settings.findOne()

    res.render("dashboard", {
      user: req.user,
      partners,
      pending,
      settings,
      stats: {
        totalPartners: partners.length,
        pendingApplications: pending.length,
        applicationsOpen: settings?.applicationsOpen || false,
      },
    })
  } catch (error) {
    console.error("[Web] Dashboard error:", error)
    res.status(500).render("error", {
      message: "Fehler beim Laden des Dashboards",
      description: error.message,
    })
  }
})

router.get("/partners", async (req, res) => {
  try {
    const partners = await Partner.find({ status: "active" }).sort({ addedAt: -1 })
    res.render("partners", { user: req.user, partners })
  } catch (error) {
    console.error("[Web] Partners error:", error)
    res.status(500).render("error", {
      message: "Fehler beim Laden der Partner",
      description: error.message,
    })
  }
})

router.get("/applications", async (req, res) => {
  try {
    const applications = await Partner.find({ status: "pending" }).sort({ addedAt: -1 })
    res.render("applications", { user: req.user, applications })
  } catch (error) {
    console.error("[Web] Applications error:", error)
    res.status(500).render("error", {
      message: "Fehler beim Laden der Bewerbungen",
      description: error.message,
    })
  }
})

export default router
