import config from "../../config.js"

export function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect("/")
}

export function isOwner(req, res, next) {
  if (req.isAuthenticated() && config.ownerIds.includes(req.user.id)) {
    return next()
  }
  res.status(403).render("error", {
    message: "Zugriff verweigert",
    description: "Du hast keine Berechtigung, auf diese Seite zuzugreifen.",
  })
}
