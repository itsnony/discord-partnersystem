# Discord Partner Management Bot

Ein vollständiger Discord Bot für Partner-Management mit automatischer Werbung, Bewerbungssystem, Invite-Validierung und Web-Dashboard.

## Features

- **Slash Commands**: Vollständiges Partner-Management-System
- **Automatische Werbung**: Alle 6 Stunden werden Werbungen gepostet
- **Tägliches Audit**: Überprüfung aller Einladungslinks um 12:00 Uhr mit 72h Warnsystem
- **Bewerbungssystem**: Modal-basiertes Bewerbungsformular mit DM-Benachrichtigungen
- **Web-Dashboard**: Verwalte Partner über eine moderne Web-Oberfläche mit Discord OAuth
- **VIP-Partner**: Befreie bestimmte Partner von Mindestanforderungen
- **Partner-Rolle**: Automatische Rollenvergabe bei Akzeptierung
- **MongoDB Integration**: Persistente Datenspeicherung
- **Logging System**: Alle wichtigen Aktionen werden geloggt
- **Komplett auf Deutsch**: Alle Nachrichten und Befehle in deutscher Sprache

## Voraussetzungen

- Node.js 18 oder höher
- MongoDB (lokal oder Atlas)
- Discord Bot Token
- Discord Application für OAuth (für Web-Dashboard)

## Installation

1. Repository klonen:
```bash
git clone [[<repository-url>](https://github.com/itsnony/discord-partnersystem)](https://github.com/itsnony/discord-partnersystem)
cd discord-partner-bot
```

2. Dependencies installieren:
```bash
npm install
```

3. `.env` Datei erstellen:
```bash
cp .env.example .env
```

4. `.env` Datei ausfüllen (siehe Konfiguration unten)

5. Bot starten:
```bash
npm start
```

Für Entwicklung mit Auto-Reload:
```bash
npm run dev
```

## Konfiguration

Erstelle eine `.env` Datei mit folgenden Werten:

```env
# Discord Bot Token (von https://discord.com/developers/applications)
TOKEN=dein_bot_token_hier

# MongoDB Verbindungsstring
MONGO_URI=mongodb://localhost:27017/discord-partner-bot

# Channel IDs (Rechtsklick auf Channel → ID kopieren)
OWN_AD_CHANNEL=deine_channel_id
PARTNER_AD_CHANNEL=deine_channel_id
APPLICATION_CHANNEL=deine_channel_id
COMMUNITY_CHANNEL=deine_channel_id
LOG_CHANNEL=deine_channel_id

# Server Informationen
SERVER_NAME=Dein Server Name
SERVER_INVITE=https://discord.gg/deineinladung
SERVER_DESCRIPTION=Deine Server-Beschreibung

# Web Dashboard
WEB_PORT=3000
DISCORD_CLIENT_ID=deine_client_id
DISCORD_CLIENT_SECRET=dein_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/auth/callback
SESSION_SECRET=ein_zufälliger_geheimer_string
```

### Owner IDs konfigurieren

Öffne `config.js` und trage deine Discord User IDs ein:

```javascript
ownerIds: ["DEINE_USER_ID_1", "DEINE_USER_ID_2"]
```

So findest du deine User ID:
1. Aktiviere den Entwicklermodus in Discord (Einstellungen → Erweitert → Entwicklermodus)
2. Rechtsklick auf deinen Namen → "ID kopieren"

### Partner-Rolle konfigurieren

In `config.js` kannst du die Partner-Rolle ID anpassen:

```javascript
partnerRoleId: "DEINE_ROLLEN_ID"
```

### Mindestanforderungen anpassen

In `config.js`:

```javascript
minMemberCount: 100  // Mindestanzahl Mitglieder
```

## Commands

### Partner Management

- `/partner add <name> <invite> <beschreibung>` - Partner manuell hinzufügen (Owner)
- `/partner remove <name>` - Partner entfernen (Owner)
- `/partner list` - Alle Partner anzeigen (Öffentlich)
- `/partner accept [name]` - Partner akzeptieren oder Liste anzeigen (Owner)
- `/partner deny [name]` - Partner ablehnen oder Liste anzeigen (Owner)
- `/partner audit` - Sofortige Invite-Validierung durchführen
- `/partner openapps` - Bewerbungssystem öffnen (Owner)
- `/partner closeapps` - Bewerbungssystem schließen (Owner)
- `/partner partnerbedingungen <send/edit> <channel>` - Partnerbedingungen senden/bearbeiten (Owner)

## Automatische Funktionen

### Werbung
Alle 6 Stunden werden automatisch Werbungen in den konfigurierten Kanälen gepostet:
- Eigene Server-Werbung im OWN_AD_CHANNEL
- Partner-Werbungen im PARTNER_AD_CHANNEL

### Audit-System mit 72h Warnung
- Täglich um 12:00 Uhr werden alle Partner-Invites überprüft
- Partner unter der Mindestanzahl (Standard: 100) erhalten eine Warnung per DM
- 72 Stunden Zeit, die Anforderungen wieder zu erfüllen
- Nach Ablauf wird die Partnerschaft automatisch beendet
- VIP-Partner (exemptFromRequirements) werden übersprungen
- Bei Wiedererfüllung der Anforderungen wird die Warnung aufgehoben

### Bewerbungssystem
- Nutzer können sich über Button + Modal bewerben
- Automatische DM-Benachrichtigungen:
  - **Bewerbung eingereicht**: Bestätigung mit "Pending"-Status
  - **Bewerbung akzeptiert**: Glückwunsch mit Anforderungen und Regeln
  - **Bewerbung abgelehnt**: Höfliche Ablehnung
  - **Warnung**: Bei Nichteinhaltung der Mindestanforderungen
  - **Bestätigung**: Bei Wiedererfüllung der Anforderungen
- Akzeptierte Partner erhalten automatisch die Partner-Rolle
- Log-Channel erhält Buttons für schnelles Akzeptieren/Ablehnen

### Partner-Rolle
Bei Akzeptierung einer Partnerschaft:
- Bewerber erhält automatisch die konfigurierte Partner-Rolle
- Rolle wird entfernt, wenn Partnerschaft endet
- Funktioniert nur, wenn der Bewerber auf dem Server ist

## Web-Dashboard

Das Web-Dashboard läuft standardmäßig auf Port 3000 und bietet:
- Discord OAuth Login (nur für konfigurierte Owner)
- Übersicht aller Partner und Bewerbungen mit Statistiken
- Partner akzeptieren/ablehnen
- VIP-Status vergeben (Befreiung von Anforderungen)
- Audit manuell auslösen
- Bewerbungssystem öffnen/schließen
- Moderne UI mit Tailwind CSS und Remix Icons

Zugriff: `http://localhost:3000`

### Dashboard Setup
1. Erstelle eine Discord Application auf https://discord.com/developers/applications
2. Füge OAuth2 Redirect URL hinzu: `http://localhost:3000/auth/callback`
3. Kopiere Client ID und Client Secret in die `.env`
4. Wähle die Scopes: `identify`

## Datenbank

MongoDB Collections:
- **partners**: Partner-Informationen
  - name, invite, beschreibung
  - status: pending, active, invalid, warned
  - memberCount, lastAudit
  - applicantId (Discord User ID des Bewerbers)
  - exemptFromRequirements (VIP-Status)
  - warningIssuedAt (Zeitpunkt der Warnung)
- **settings**: Bot-Einstellungen
  - applicationsOpen (Bewerbungssystem offen/geschlossen)

## Bot Permissions

Erforderliche Discord Permissions:
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands
- Manage Roles (für Partner-Rolle)
- View Channels
- Create Invites (für Invite-Validierung)

Bot Invite Link:
```
https://discord.com/api/oauth2/authorize?client_id=DEINE_CLIENT_ID&permissions=268445760&scope=bot%20applications.commands
```

## Troubleshooting

**Bot startet nicht:**
- Überprüfe TOKEN und MONGO_URI in der .env
- Stelle sicher, dass MongoDB läuft
- Überprüfe Node.js Version (mindestens 18)

**Commands funktionieren nicht:**
- Bot braucht die richtigen Permissions
- Slash Commands müssen registriert sein (passiert automatisch beim Start)
- Überprüfe Owner IDs in config.js

**Web-Dashboard funktioniert nicht:**
- Überprüfe DISCORD_CLIENT_ID und DISCORD_CLIENT_SECRET
- Stelle sicher, dass die Callback-URL in der Discord Application konfiguriert ist
- OAuth2 Redirect URL: `http://localhost:3000/auth/callback`
- Überprüfe Owner IDs in config.js

**Audit schlägt fehl:**
- Bot braucht Zugriff auf die Invite API
- Rate Limits beachten (1 Sekunde Pause zwischen Invites)
- Überprüfe, ob Invites gültig sind

**Partner-Rolle wird nicht vergeben:**
- Bot braucht "Manage Roles" Permission
- Bot-Rolle muss höher sein als die Partner-Rolle
- Bewerber muss auf dem Server sein

**DMs kommen nicht an:**
- Benutzer muss DMs von Server-Mitgliedern erlauben
- Bot kann keine DMs an Benutzer senden, die den Bot blockiert haben

## Beitragen

Contributions sind willkommen! Siehe [CONTRIBUTING.md](.github/CONTRIBUTING.md) für Details.

## Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte! Siehe [LICENSE](LICENSE) für Details.

## Support

Bei Fragen oder Problemen erstelle ein Issue im Repository.

## Credits

Entwickelt mit:
- discord.js v14
- Express.js
- MongoDB & Mongoose
- EJS Templates
- Tailwind CSS
- Remix Icons
