# Social Script PWA – UX & Interaction Feedback

## 1. Einleitung & Setup

### Charaktere-Nummern
- **Was**: Bei der Frage „Who is a main character?" → Frage stellen: „Who is **main character number 1/2/3**?"
- **Warum**: Nummerierung von Anfang an, sodass Gruppe konsistent und eindeutig über Charaktere sprechen kann
- **Wo**: Character selection screen

### Purpose-Statement verbessern
- **Was**: Statt „Got a minute for our story?" → **Simpler & direkter:**
  - „We are playing a Game and need help, can I ask you a quick question?"
- **Warum**: Klarer Kontext ohne zu viel Erklärung; Stranger versteht sofort, worum es geht
- **Wo**: Story intro / Setup phase

---


## 3. Ideensammlung Phase

### UI-Änderung: Kreis statt Liste
- **Was**: Bei „Who's got an idea?" → Statt linearer Liste als **Kreis darstellen**
  - Visuelle Abbildung der Gruppe
  - Wir wissen ja, wer das Handy/die Kontrolle hat
- **Warum**: Inklusivität, Gruppengefühl; nicht Linear = weniger Hierarchie
- **Wo**: Ideation screen

---

## 4. Story-Längen Transparenz

### Vorschau: Wie lange geht diese Story?
- **Was**: Am **Start ankündigen**:
  - „Diese Story hat 3 Erzähl-Runden"
  - „Das dauert ca. 10 Minuten"
  - Oder: „Wir erzählen bis [Element X] fertig ist"
- **Warum**: Mentale Vorbereitung, keine Überraschungen beim Umfang
- **Wo**: Story introduction / opening screen

### Feedback bei vielen restlichen Elementen
- **Was**: Nach X Erzähl-Runden: Wenn immer noch **zu viele Story-Elemente übrig** sind
  - → Gruppe explizit erinnern: „Wir haben noch 7 Elemente — wollen wir Tempo hochfahren?"
- **Warum**: Bewusste Tempo-Anpassung, realistische Erwartungen, nicht gehetzt wirken
- **Wo**: Nach jeder 2-3. Erzähl-Runde

---

## 5. Completion & Rückblick

### „Does story feel complete?" – Erweitern
- **Was**: Zusätzlich zur Frage "does it feel complete?" explizit fragen:
  - **„or do you want to add an ending?"**
  - „Braucht die Story noch einen finalen Moment?"
- **Warum**: Explizite Möglichkeit, noch einen abschließenden Punkt zu schaffen; nicht alles ist in der Erzählung
- **Wo**: Completion check screen

### Story-Text in Feedback-Phase anzeigen
- **Was**: Im Feedback-Screen: Option, den **geschriebenen Story-Text nochmal anzuzeigen**
  - NUR Text-Anzeige, kein echtes „Zurück" zur Bearbeitung
  - Nicht zurück zur interaktiven Phase (da das Replay später nicht funktioniert)
- **Warum**: Closure-Moment; die Geschichte nochmal reflektieren. Aber: muss replay-safe sein (keine State-Änderung)
- **Wo**: Feedback screen

---

## 6. Timing & UX-Polish

### Phasenscreen länger anzeigen
- **Was**: Der Übergangsscreen zwischen Phasen sollte etwas **länger stehen**
  - Nicht sofort zur nächsten Phase übergehen
  - Beispiel: 2-3 Sekunden statt sofort
- **Warum**: Mentale Übergänge brauchen Zeit; schnelle Übergänge wirken gehetzt und unterbinden Reflexion
- **Wo**: Alle Phase-Übergänge (Setup → Idea → Storytelling → Feedback)

---

## 🔑 Durchgängiges Thema: Psychologische Sicherheit

Das rote Faden durch all dieses Feedback:

1. **Transparenz**: Ankündigungen, was kommt, wie lange, warum
2. **Kontrolle**: Abort-Möglichkeiten, Tempo-Anpassung, Rückblick
3. **Respekt**: Gefühle können sich ändern, Grenzen werden eingehalten
4. **Zeit**: Nicht gehetzt, mentale Übergänge bekommen Raum

---

## 📊 Implementierungs-Prioritäten

| Priorität | Feature | Aufwand | Impact |
|-----------|---------|--------|--------|
| 🔴 Sofort | Charaktere-Nummern | Klein | Hoch (Klarheit) |
| 🔴 Sofort | Purpose-Statement | Klein | Hoch (Kontext) |
| 🟠 Wichtig | Phasenscreen-Timing | Sehr klein | Mittel (Feeling) |
| 🟠 Wichtig | Story-Längen-Vorschau | Klein | Mittel (UX) |
| 🟡 Nice-to-have | Kreis-UI (Ideation) | Mittel | Gering (UI Polish) |
| 🟡 Nice-to-have | Rückblick in Feedback | Mittel | Mittel (Closure) |
