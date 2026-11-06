# ZooPit · Spielkonzept

Stand: 6. November 2026. Eigene Umsetzung des Tierplatzierungs-Prinzips mit eigenen Bildern, Rätseln und Namen; keine Übernahme von Originalgrafiken oder Leveldaten.

## Festgelegte Regeln

- Android-App, werbefrei. Levelreise, freies Spiel und Zufallsmix offline; Freundeswettbewerbe mit Internetverbindung.
- Zunächst ausschließlich Tierplatzierung; weitere Rätselarten später ergänzbar.
- Quadratische Raster von **4×4 bis 10×10**, durchgehend dieselben Regeln: genau ein Tier je Reihe, Spalte und Farbgebiet; Tiere berühren sich auch diagonal nicht.
- Jedes Rätsel ist eindeutig lösbar. Die Schwierigkeit wiederholt sich in Wellen **1, 2, 3, 4, 5, 1, 2 …**; nach einer schweren Aufgabe wird es wieder leichter.
- Drei Fehlversuche, danach dasselbe Rätsel neu beginnen. Bereits verbrauchte Tipps bleiben verbraucht; Fehler und Zeit für die Punktewertung bleiben erhalten.
- Einmal tippen: Kreuz setzen/entfernen. Doppeltippen: Tier setzen. Ziehen: mehrere Kreuze mit einem Strich setzen/entfernen; gesetzte Tiere schützen.
- Automatische Kreuzmarkierung in Einstellungen ein-/ausschaltbar.

## Tiere und Gestaltung

Eigene plastische Figuren in verspielter 3D-Optik: Katzen, Hunde, Pferde, Krebse, Axolotl, Ameisen, Hochlandrinder, Ziegen und Hühner. Eine Tierart pro Rätsel, automatisch wechselnd.

Bunte Pastellfarben für die Farbgebiete, gut erkennbare Grenzen. Spielgeräusche und ruhige Hintergrundmusik jeweils unabhängig ein-/ausschaltbar, mit eigenen Lautstärkereglern. Musik zunächst aus; Klänge werden lokal erzeugt.

## Modi

1. **Levelreise:** feste Levels der Reihe nach freischalten. Gelöste Rätsel erneut spielbar.
2. **Freies Spiel:** Schwierigkeit/Raster wählen; neue Rätsel spielen.
3. **Zufallsmix:** ausgewählte Rätselarten und Schwierigkeiten mischen. In Version 0.1.0 ist Tierplatzierung die verfügbare Rätselart.
4. **ZooPit-iade:** Freundeswettbewerbe über Einladungscode. Gastgeber wählt 5, 10, 15 oder 20 Rätsel. Alle erhalten denselben Rätselsatz und dieselbe Reihenfolge.

## Tipps und Punkte

- Pro neuem Rätsel ein Tipp. Ungenutzter Tipp wird nach dem Lösen einmalig ins Tippkonto übertragen. Wiederholen oder Neustarten erzeugt keine zusätzlichen Tipps.
- Tippwahl: nächsten logischen Schritt erklären oder ein Tier richtig setzen. Jeweils ein Tipp.
- Gesammelte Tipps zusätzlich im Wettbewerb erlaubt. Jeder eingesetzte Tipp kostet Punkte.
- Punkte berücksichtigen Schwierigkeit, benötigte Zeit, Fehler und Tipps. Zeit läuft bei normalen Spielen nur während des aktiven Spiels; bei begonnenen Wettbewerbsrätseln läuft sie bis zur Abgabe.
- Umsetzungsvorschlag für die erste Version: Grundpunkte 1.000 × Schwierigkeit; Zeitbonus max. 500 × Schwierigkeit, minus 2 × Schwierigkeit pro Sekunde; Fehlerabzug 150 × Schwierigkeit; Tippabzug 200 × Schwierigkeit; mindestens 0 Punkte. Formel in der App einsehbar.

## Online

Spitzname und privater Einladungscode, Ergebnisliste innerhalb des Wettbewerbs. Keine öffentliche globale Rangliste als Pflicht. Keine Kontakte auslesen, keine Einladungen automatisch verschicken. Ergebnisse werden vom Wettbewerbsdienst anhand des Rätsels und des Spielverlaufs geprüft; keine Zusage manipulationssicherer Turniere.
