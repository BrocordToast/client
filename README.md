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

- Node.js 18+ (siehe auch `engines`-Feld in `package.json`)
- pnpm 8 (wird über `packageManager` deklariert)
- macOS, Windows oder Linux

Das Projekt steht unter der [MIT-Lizenz](LICENSE) und kann als Ausgangspunkt für eigene, legale Launcher-Projekte genutzt werden.

## Schnellstart – „Wie benutze ich das?“

1. **Abhängigkeiten installieren**

   ```bash
   pnpm install
   ```

2. **Launcher im Entwicklungsmodus starten**

   ```bash
   pnpm dev
   ```

   Dadurch öffnen sich automatisch Electron und die Vite-Entwicklungsumgebung.

3. **Mit Microsoft-Konto anmelden** – Klicke im Account-Panel auf „Mit Microsoft anmelden“ und folge dem Device-Code-Flow (siehe Abschnitt „Microsoft-Anmeldung“).

4. **Instanz konfigurieren** – Wähle Java-Pfad, Speicherort und Version im „Instanz“-Panel.

5. **Spiel starten** – Sobald Konto und Instanz vollständig konfiguriert sind, aktiviere bei Bedarf Vollbild/RAM-Einstellungen und drücke „Launch“.

## Entwicklung

Die gleichen Befehle eignen sich auch für die lokale Entwicklung; beim Ändern von React-Komponenten erfolgt Hot Reload automatisch.

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

#### Automatischer GitHub-Download

- Das Repository enthält einen GitHub-Actions-Workflow (`.github/workflows/release.yml`), der auf `workflow_dispatch` sowie auf veröffentlichte Releases reagiert.
- Der Workflow baut auf `windows-latest`, führt `pnpm build` und `pnpm package:win` aus und lädt die erzeugte `CleanLauncher-Setup-<version>.exe` sowohl als Build-Artefakt als auch – bei Releases – direkt in den Release-Anhang hoch.
- Nach dem Ausführen des Workflows steht der Installer unter „Actions → Build Windows Installer“ als Artefakt sowie bei veröffentlichten Releases zum direkten Download bereit.

## Ersteinrichtung direkt in der EXE

Beim allerersten Start öffnet sich automatisch ein Setup-Wizard, der dich Schritt für Schritt durch die wichtigsten Einstellungen führt:

1. Vergib einen Instanz-Namen und wähle die gewünschte Minecraft-Version aus der Manifest-Liste.
2. Lasse den Java-Pfad automatisch erkennen oder trage den Pfad zur `java`-Binary manuell ein.
3. Lege RAM-Grenzen, Auflösung, Vollbild sowie Spiel- und Mods-Verzeichnisse fest – alles innerhalb des Wizards.
4. Speichere die Einstellungen; der Launcher merkt sich die Auswahl und überspringt den Wizard künftig automatisch.


## Microsoft-Anmeldung

1. Starte CleanLauncher.
2. Klicke auf „Mit Microsoft anmelden“.
3. Gib den angezeigten Code auf <https://microsoft.com/devicelogin> ein.
4. Nach erfolgreicher Authentifizierung werden Gamertag und Skin angezeigt. Tokens werden verschlüsselt im OS-Speicher abgelegt.

## Erste Instanz

1. Öffne den Abschnitt „Instanz“ und passe Java-Pfad, Spielordner und RAM an oder nutze die Angaben aus dem Setup-Wizard als Grundlage.
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
