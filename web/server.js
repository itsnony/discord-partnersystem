import express from "express"
import session from "express-session"
import passport from "passport"
import { Strategy as DiscordStrategy } from "passport-discord"
import path from "path"
import { fileURLToPath } from "url"
import authRoutes from "./routes/auth.js"
import dashboardRoutes from "./routes/dashboard.js"
import partnerRoutes from "./routes/partners.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createWebServer(client, logger) {
  const app = express()

  app.set("view engine", "ejs")
  app.set("views", path.join(__dirname, "views"))

  // Middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(express.static(path.join(__dirname, "public")))

  // Session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
    }),
  )

  // Passport setup
  passport.serializeUser((user, done) => done(null, user))
  passport.deserializeUser((obj, done) => done(null, obj))

  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL || "http://localhost:3000/auth/callback",
        scope: ["identify"],
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile)
      },
    ),
  )

  app.use(passport.initialize())
  app.use(passport.session())

  app.locals.client = client
  app.locals.logger = logger

  // Routes
  app.use("/auth", authRoutes)
  app.use("/dashboard", dashboardRoutes)
  app.use("/api/partners", partnerRoutes)

  // Home route
  app.get("/", (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect("/dashboard")
    }
    res.render("index")
  })

  return app
}
