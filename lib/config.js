const Configstore = require('configstore');

const pkg = require('../package.json');

const conf = new Configstore(pkg.name, {
  "trello": {
    "api_url": "https://api.trello.com/1",
    "key": null,
    "token": null
  },
  "google": {
    "scopes": [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/spreadsheets"
    ],
    "client": null,
    "access_token": null
  },
  "app": {
    "merge_users": {
    }
  }
});

// 'Ada',             'Aida Lalo',      'Alessandro Angilella',
// 'Alessia Bramati', 'Algert Ozuni',   'Alketa',
// 'Ana Cuka',        'AnxhelaKosta',   'Arlind',
// 'Bledar Meniku',   'Blenard Pazari', 'Dafni Kuculi',
// 'Dardan Alija',    'Davide',         'Dorina Lamlli',
// 'Driton Xhezairi', 'Enton Mehmeti',  'Erald Mustafara',
// 'Eraldo Cuko',     'Ervin',          'Evi Hysa',
// 'Fatjon',          'Fatjon Shaba',   'Fitim Vata',
// 'Gerti Boshnjaku', 'Irda',           'Juxhin Bleta',
// 'Klajdi',          'Kristi',         'MARIA STELLA BRUNELLO',
// 'Najada',          'Pellumb Metaj',  'SEO Queryo',
// 'Spiro',           'Ujeza',          'Valentina Spada',
// 'Xhenilda Lala',   'andrea.c',       'cristina.macauda',
// 'dena16',          'evihysa0',       'giulia.allevi',
// 'marco.massara',   'mirjeta',        'monica.colombo',
// 'niku_NM',         'redona',         'serena.benati',
// 'sergio.costa'


module.exports = conf