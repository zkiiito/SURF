type Translations = Record<string, string>

const translations: Record<string, Translations> = {
  'en-US': {},
  'hu': {
    'Next unread': 'Köv. olvasatlan',
    'Edit': 'Szerkesztés',
    'All read': 'Mindet olvasottá',
    'Leave conversation': 'Kilépés',
    'participants': 'résztvevő',
    'Press Return to send, Shift-Return to break line.': 'Nyomj Entert a mentéshez, Shift-Entert a sortöréshez.',
    'Save message': 'Üzenet mentése',
    'Earlier messages': 'Régebbi üzenetek',
    'Add message': 'Új üzenet',
    'new messages': 'új üzenet',
    'Reply to message': 'Válasz üzenetre',
    'Cancel': 'Mégse',
    'Close': 'Bezárás',
    'You have no conversations.': 'Nincs aktív beszélgetésed',
    'Add conversation': 'Új beszélgetés',
    'Add conversation +': 'Új beszélgetés +',
    'Title': 'Beszélgetés címe',
    'Participants': 'Résztvevők',
    'Create': 'Létrehozás',
    'Sign out': 'Kijelentkezés',
    'Edit conversation': 'Beszélgetés szerkesztése',
    'Save': 'Mentés',
    'Searching...': 'Keresés...',
    'User not found.': 'Nincs ilyen felhasználónk.',
    'Enter username.': 'Írj be egy felhasználónevet.',
    'Do you want to leave conversation {{ title }}?\n\nIf you want to come back later, participants can invite you': 'Biztosan kilépsz a következő beszélgetésből: {{ title }}?\n\nHa később vissza szeretnél lépni, a beszélgetés résztvevői újra meghívhatnak.',
    'Get invite code': 'Meghívó igénylés',
    'Invite URL': 'Meghívó URL',
    'Edit profile': 'Profil',
    'Name': 'Név',
    'Avatar': 'Avatár',
    'Notifications': 'Értesítések',
    'Not supported': 'Nem támogatott',
    'Enabled': 'Bekapcsolva',
    'Disabled': 'Kikapcsolva',
    'Test': 'Teszt',
    'Disconnected': 'Megszakadt a kapcsolat',
    'You\'re disconnected': 'Megszakadt a kapcsolat',
    'Retrying in:': 'Újracsatlakozás:',
    'Reconnect': 'Újracsatlakozás most',
    'Show pictures': 'Képek mutatása',
    'Show videos': 'Videók mutatása',
    'Show link previews': 'Link előnézetek mutatása'
  }
}

let currentLocale = 'en-US'

export function setLocale(locale: string) {
  if (translations[locale]) {
    currentLocale = locale
  } else if (locale.startsWith('hu')) {
    currentLocale = 'hu'
  } else {
    currentLocale = 'en-US'
  }
}

export function t(key: string, replacements?: Record<string, string>): string {
  const localeTranslations = translations[currentLocale] || {}
  let translation = localeTranslations[key] || key

  if (replacements) {
    Object.entries(replacements).forEach(([placeholder, value]) => {
      translation = translation.replace(new RegExp(`{{ ${placeholder} }}`, 'g'), value)
    })
  }

  return translation
}

// Initialize locale from browser
export function initI18n() {
  const browserLocale = navigator.language || (navigator as any).browserLanguage || 'en-US'
  setLocale(browserLocale)
}

