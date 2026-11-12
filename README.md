# Square-Foot-Kasten Konfigurator

Webseite zum Planen eines Square-Foot-Gardening-Hochbeets aus gesteckten Brettern (Halbierungsverbindung) – entstanden im P-Seminar.

Alles ist einstellbar: Anzahl und Größe der Felder, Brettmaße, Überstand, Innenraster, Eckpfosten mit Käfig, Netzart und Maschenweite, 7 Dachvarianten (Klappdeckel, zwei Klappflügel, Schiebedeckel, Satteldach, Bogendach, festes Netz, offen) und 6 Varianten für die Vorderseite (Doppeltür, Einzeltür, Klappe nach oben, Schiebetür, Netz-Rollo, festes Netz). Daraus erzeugt die Seite:

- ein drehbares **3D-Modell** (mit Explosionsansicht, Erde und Pflanzen, aufklappbarem Deckel und Türen)
- eine **Materialliste** inkl. Einkaufsliste in Rohlängen, Beschlägen, Schrauben, Netzfläche und Erdmenge
- einen **Zuschnittplan** mit Kerbpositionen pro Brett und Schnittplan auf Rohlänge
- eine **Bauanleitung**, die zur Konfiguration passt
- eine **Pflanzenliste** mit Eignung je nach Erdtiefe und Käfighöhe und einen änderbaren **Pflanzplan** (hohe Pflanzen hinten)
- den **Bodenaufbau** je nach Untergrund (Rasen, Erde, Kies, Pflaster, Beton, Holzterrasse): Wühlmausgitter, Vlies, Drainage oder Folienwanne
- Export als Text, CSV, Druckansicht und Link mit der eigenen Konfiguration

## Benutzen

Einfach die Seite über GitHub Pages öffnen. Lokal geht es mit einem beliebigen Webserver, z. B.:

```bash
python3 -m http.server
# dann http://localhost:8000 öffnen
```

(Direkt per Doppelklick auf `index.html` geht es nicht, weil Browser ES-Module über `file://` blockieren.)

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seitengerüst, lädt three.js über jsDelivr |
| `js/calc.js` | Die ganze Rechnerei: Geometrie, Kerben, Materialliste, Schnittplan, Anleitung |
| `js/options.js` | Dach- und Türvarianten mit ihren Teilen und Anleitungsschritten |
| `js/plants.js` | Pflanzendaten, Eignung und Pflanzplan |
| `js/scene.js` | 3D-Modell mit three.js |
| `js/app.js` | Formular, Ausgabe, Export |
| `css/style.css` | Aussehen, Dark Mode, Druckansicht |

Alle Maße sind in cm. Neue Optionen kommen in `DEFAULTS` und `sanitize()` in `calc.js`, ins `SCHEMA` in `app.js` und, falls sichtbar, in `scene.js`.
