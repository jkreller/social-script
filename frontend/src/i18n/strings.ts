import { getLocale } from '../utils/locale'

// Translation catalog, mirroring social_script/_internal/i18n.py: the English
// literal already at the call site is the lookup key — nothing needs
// duplicating here except the German translation.
const TRANSLATIONS: Record<string, Record<string, string>> = {
  de: {
    'About': 'Über',
    'Language': 'Sprache',
    'waking up…': 'Lädt...',
    'Play': 'Spielen',
    'what should we call you?': 'Wie willst du genannt werden?',
    'your name': 'Dein Name',
    'Filming on': 'Kamera an',
    'Filming off': 'Kamera aus',
    "Let's play": "Los geht's!",
    'Exit': 'Beenden',
    'Toggle sound': 'Ton umschalten',
    'Raise exception': 'Fehler melden',
    'Retry': 'Erneut versuchen',
    'Continuing…': 'Weiter geht\'s…',
    'Leave the game?': 'Spiel verlassen?',
    'Keep playing': 'Weiter',
    'Quit': 'Beenden',
    'what happened?': 'Was ist passiert?',
    'cancel': 'abbrechen',
    'add a note (optional)': 'Notiz hinzufügen (optional)',
    'stop': 'Stopp',
    'continue': 'Weiter',
    'back': 'zurück',
    'Game over!': 'Spiel vorbei!',
    'Download ZIP': 'ZIP herunterladen',
    'Show debug downloads': 'Debug-Downloads anzeigen',
    'Download Log': 'Log herunterladen',
    'Download Video': 'Video herunterladen',
    'Download Video {n}': 'Video {n} herunterladen',
    'Play again': 'Nochmal spielen',
    'Paused': 'Pause',
    'Your footage is safe. Pick up where you left off, or wrap it up.':
      'Dein Video wurde gesichert. Mach weiter oder beende das Spiel.',
    'Resume': 'Fortsetzen',
    'Finish & save': 'Beenden & speichern',
    'Close': 'Schließen',
    'about': 'Über',
    '"social_game" is an art-project that investigates what happens when people run social interactions as code.': '"social_game" ist ein Kunstprojekt, das untersucht, was passiert, wenn Menschen soziale Interaktionen als Code ausführen.',
    'tap to continue': 'Tippen zum Weitermachen',
    'Yes': 'Ja',
    'No': 'Nein',
    'Confirm': 'Bestätigen',
    'or make up your own': 'Oder deine eigene',
    'type here…': 'Hier eingeben…',
    'the story so far': 'bisherige Story',
    'Go': 'Los',
    'chapter': 'Kapitel',
    'icons by pxlkit.xyz': 'Icons von pxlkit.xyz',
  },
}

export function t(text: string, vars?: Record<string, string | number>): string {
  const locale = getLocale()
  const translated = locale === 'en' ? text : (TRANSLATIONS[locale]?.[text] ?? text)
  if (!vars) return translated
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), translated)
}
