# Friesen Bau- und Mietservice — Verwaltungs-App

Verwaltungssoftware für den Bagger- und Geräteverleih von Julian Friesen, Lohmar.

## Prototyp starten

```bash
cd project
python3 -m http.server 8181
# → http://localhost:8181/Friesen%20Baggerverleih.html
```

## Projektstruktur

```
project/
  Friesen Baggerverleih.html   ← App-Einstiegspunkt
  app/                         ← React-Komponenten (JSX)
  contact.html                 ← Kontaktformular
```

## GitHub Pages

Die App ist über GitHub Pages erreichbar:
`https://falwin.github.io/baggerverleih-app/`

Alle Daten liegen im localStorage des Browsers (Prototyp-Stand).
