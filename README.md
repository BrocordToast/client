# CleanLauncher

CleanLauncher ist ein legaler Minecraft-Launcher für Windows, macOS und Linux. Das Projekt nutzt Electron, React, TypeScript und Tailwind CSS. Alle Authentifizierungs- und Download-Vorgänge verwenden ausschließlich offizielle Microsoft- und Mojang-Schnittstellen. Es werden keine Schutzmaßnahmen umgangen oder manipuliert.

## Features

- Microsoft Device-Code-Anmeldung mit sicherer Token-Speicherung über die Betriebssystem-Keychain
- Automatische Aktualisierung des Minecraft-Version-Manifests und Auswahl zwischen Release- und Snapshot-Builds
- Download-Manager mit parallelen Downloads, Hash-Prüfung und Fortschritts-Events
- Verwaltung mehrerer Instanzen inklusive RAM-Zuweisung, Auflösung, Pfadwahl und Mods-Ordner
- Java-Laufzeit-Erkennung (JAVA_HOME, Systempfade) und Validierung des ausgewählten Pfades
- Vollständiger Start des Spiels mit offiziellen JVM- und Spiel-Argumenten, inklusive Logging-Integration in die UI
- Globale Einstellungen mit Theme-Umschaltung, Proxy- und Thread-Konfiguration
- Mock-Authentifizierung im Entwicklungsmodus (`MOCK_AUTH=true`), um UI-Flows ohne echtes Konto zu testen

## Voraussetzungen

- Node.js 18+
- pnpm 8 (wird über `packageManager` deklariert)
- macOS, Windows oder Linux

## Entwicklung

```bash
pnpm install
pnpm dev
```

Der Befehl startet Electron und die Vite-Entwicklungsumgebung.

### Tests & Qualitätssicherung

```bash
pnpm lint
pnpm typecheck
pnpm test
```

- `lint` – überprüft den Code mit ESLint
- `typecheck` – führt den TypeScript-Compiler ohne Emission aus
- `test` – führt Vitest-Tests aus (Argument-Builder, Manifest-Parsing)

## Build

```bash
pnpm build
```

Der Befehl erstellt die optimierten Produktions-Bundles für Main-, Preload- und Renderer-Prozess.

### Windows-Installer (.exe)

```bash
pnpm package:win
```

Damit wird mit `electron-builder` ein signaturfreier NSIS-Installer erzeugt. Die resultierende Datei (`CleanLauncher-Setup-<version>.exe`)
liegt anschließend unter `dist/`. Für Builds aller Plattformen kann `pnpm package` verwendet werden.

## Microsoft-Anmeldung

1. Starte CleanLauncher.
2. Klicke auf „Mit Microsoft anmelden“.
3. Gib den angezeigten Code auf <https://microsoft.com/devicelogin> ein.
4. Nach erfolgreicher Authentifizierung werden Gamertag und Skin angezeigt. Tokens werden verschlüsselt im OS-Speicher abgelegt.

## Erste Instanz

1. Öffne den Abschnitt „Instanz“ und passe Java-Pfad, Spielordner und RAM an.
2. Wähle im Version-Picker die gewünschte Release- oder Snapshot-Version.
3. Drücke „Launch“, sobald ein gültiges Konto verknüpft ist.

## Troubleshooting

- **Java nicht gefunden**: Setze den JAVA_HOME-Pfad oder trage den Pfad zur `java`-Binary manuell ein.
- **Authentifizierung abgelaufen**: Melde dich erneut über das Microsoft-Panel an. Tokens werden beim Start automatisch aktualisiert.
- **Download langsam**: Passe die Anzahl paralleler Threads in den globalen Einstellungen an und prüfe deine Netzwerkverbindung.
- **Spiel startet nicht**: Prüfe das UI-Log, um Fehler (z. B. fehlende Dateien, falsche Java-Version) zu identifizieren.

## Beispielkonfigurationen

- [`examples/settings.json`](examples/settings.json)
- [`examples/instance.json`](examples/instance.json)

## Sicherheit & Architektur

- Tokens verbleiben ausschließlich im Electron-Main-Prozess und werden via `keytar` im Credential Store des Betriebssystems gespeichert.
- IPC ist strikt whitelisted: Der Preload-Skript stellt nur geprüfte Methoden zur Verfügung.
- Downloads erfolgen über `fetch`/`https` mit Hash-Prüfung (SHA1) und parallelem Transfer.
- Electron ist mit `contextIsolation` und `sandbox` aktiviert, die Renderer haben keinen direkten Zugriff auf Node-APIs.

## Mock-Modus

Für UI-Entwicklung ohne Microsoft-Login:

```bash
MOCK_AUTH=true pnpm dev
```

Der Launcher zeigt dabei Demo-Accounts an, startet jedoch kein echtes Spiel.

---

CleanLauncher ist ein Entwicklungsprojekt und enthält keine proprietären Assets. Signaturen, Auto-Update und Distributions-Installer sind nicht Bestandteil des MVP.
