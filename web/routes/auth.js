import express from "express"
import passport from "passport"

const router = express.Router()

router.get("/login", passport.authenticate("discord"))

router.get("/callback", passport.authenticate("discord", { failureRedirect: "/" }), (req, res) => {
  res.redirect("/dashboard")
})

router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/")
  })
})

export default router
