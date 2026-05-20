# TeteDeFlorette

Application web de memos calendaires construite avec Vue 3, Vite, une API Node/Netlify Functions et PostgreSQL.

Le produit actuel est un agenda-memo simple centré sur :

- un calendrier mensuel
- un memo par date
- un espace libre `Fourre-tout`
- des mini-taches integrees dans chaque memo
- une personnalisation visuelle par themes

## Apercu fonctionnel

L'application propose 3 usages principaux :

- consulter un calendrier mensuel
- ouvrir un memo pour une date donnee
- conserver un memo global non date via `Le Fourre-tout`

### Fonctions disponibles

- navigation mensuelle dans le calendrier
- acces rapides `Hier`, `Aujourd'hui`, `Demain`, `Calendrier`, `Le Fourre-tout`
- indicateur visuel sur les jours qui contiennent un memo
- notes libres par jour
- taches cochees / non cochees
- niveau d'importance de tache `+` ou `++`
- autosauvegarde
- suppression automatique du memo si son contenu devient vide
- sauvegarde locale de secours pour `Le Fourre-tout`
- themes d'interface memorises dans le navigateur

### Routes frontend

- `/` : calendrier
- `/memo/:date` : memo date
- `/memo/fourre-tout` : memo global

### Routes API

- `GET /api/health`
- `GET /api/memos`
- `GET /api/memos/:date`
- `POST /api/memos`
- `DELETE /api/memos/:date`

## Stack technique

### Frontend

- Vue 3
- Vue Router
- Vite

Fichiers principaux :

- [frontend/src/App.vue](frontend/src/App.vue)
- [frontend/src/views/CalendarView.vue](frontend/src/views/CalendarView.vue)
- [frontend/src/views/MemoView.vue](frontend/src/views/MemoView.vue)
- [frontend/src/services/api.js](frontend/src/services/api.js)
- [frontend/src/theme.js](frontend/src/theme.js)
- [frontend/src/assets/styles.css](frontend/src/assets/styles.css)

### Backend

- Netlify Functions pour la production
- Express pour le dev local de l'API
- `pg` pour PostgreSQL

Fichiers principaux :

- [netlify/functions/memos.js](netlify/functions/memos.js)
- [netlify/functions/health.js](netlify/functions/health.js)
- [netlify/functions/_lib/db.js](netlify/functions/_lib/db.js)
- [dev-api/server.cjs](dev-api/server.cjs)

### Base de donnees

Une seule table `memos` est utilisee aujourd'hui.

Schema actuel :

```sql
CREATE TABLE IF NOT EXISTS memos (
  id SERIAL PRIMARY KEY,
  memo_date DATE UNIQUE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Source :

- [db/init.sql](db/init.sql)

## Structure du projet

```text
TeteDeFlorette/
├─ frontend/
│  ├─ public/
│  └─ src/
│     ├─ assets/
│     ├─ router/
│     ├─ services/
│     ├─ utils/
│     └─ views/
├─ netlify/
│  └─ functions/
│     └─ _lib/
├─ dev-api/
├─ db/
├─ scripts/
├─ netlify.toml
├─ package.json
└─ README.md
```

## Modele de donnees actuel

Le produit ne stocke qu'un objet principal : le memo.

Un memo est identifie par une date unique `memo_date`.

### Memo date classique

Exemple :

```json
{
  "memoDate": "2026-05-20",
  "content": "Appeler le client"
}
```

### Memo enrichi avec taches

Quand des taches sont presentes, le champ `content` n'est plus un simple texte. Il contient un prefixe technique suivi d'un JSON.

Prefixe :

```text
[[TDF_MEMO_V2]]
```

Structure logique :

```json
{
  "notes": "Acheter du pain",
  "tasks": [
    {
      "id": "1716200000000-ab12cd",
      "label": "Passer a la pharmacie",
      "importance": "++",
      "done": false
    }
  ]
}
```

Source :

- [frontend/src/utils/memo.js](frontend/src/utils/memo.js)

### Memo special `Fourre-tout`

Le `Fourre-tout` est stocke comme un memo classique, avec une date technique reservee :

```text
9999-12-31
```

Cette date est exclue de l'affichage du calendrier mais permet de reutiliser la meme API.

## Themes

L'application contient 5 themes visuels et editoriaux :

- `equitation`
- `montagne`
- `plage`
- `place-doree`
- `girly-rose`

Chaque theme definit :

- les textes d'ambiance
- les placeholders
- les libelles d'ecran
- les variables visuelles CSS

Le theme choisi est memorise dans le `localStorage`.

Sources :

- [frontend/src/theme.js](frontend/src/theme.js)
- [frontend/src/assets/styles.css](frontend/src/assets/styles.css)

## PWA

L'application contient aujourd'hui :

- un `manifest.webmanifest`
- des icones
- un affichage `standalone`

En revanche, elle n'a pas encore :

- de service worker
- de cache offline complet
- de synchronisation offline
- de notifications push

Source :

- [frontend/public/manifest.webmanifest](frontend/public/manifest.webmanifest)

## Variables d'environnement

Copier `.env.example` vers `.env` a la racine :

```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/tetedeflorette?sslmode=require
```

Le frontend utilise par defaut :

```bash
VITE_API_URL=/api
```

Si besoin, cette variable peut etre definie dans `frontend/.env`.

## Installation

Installer les dependances racine et frontend :

```bash
npm install
npm --prefix frontend install
```

## Lancement en local

### API locale seule

Lance l'API Express locale sur `http://localhost:3000` :

```bash
npm run dev:api
```

### Frontend seul

Le frontend Vite tourne sur `http://localhost:5173`.

Commande standard :

```bash
npm run dev:frontend
```

Si Vite echoue a demarrer sur certains environnements Windows avec une erreur de resolution de `vite.config.js`, utiliser ce contournement :

```bash
npm --prefix frontend exec vite -- --host 0.0.0.0
```

### Dev complet

Le script racine lance l'API locale et le frontend :

```bash
npm run dev
```

Selon l'environnement, le frontend peut necessiter le contournement ci-dessus.

### Netlify local

Pour tester les redirects et les fonctions Netlify :

```bash
npm run dev:netlify
```

## Build

Build du frontend :

```bash
npm run build
```

Preview du build :

```bash
npm run preview
```

Verification :

```bash
npm run check
```

## Deploiement

Le projet est prepare pour Netlify.

Configuration :

- build command : `npm --prefix frontend run build`
- publish directory : `frontend/dist`
- functions directory : `netlify/functions`

Source :

- [netlify.toml](netlify.toml)

## Comportement actuel de l'API

### `GET /api/memos`

Retourne tous les memos, tries par date croissante.

### `GET /api/memos/:date`

Retourne un memo ou `null` si absent.

### `POST /api/memos`

Crée ou met a jour un memo par `upsert` sur `memo_date`.

### `DELETE /api/memos/:date`

Supprime le memo associe a la date.

## Limitations actuelles

Le projet est aujourd'hui un prototype fonctionnel avance, pas encore un SaaS finalise.

Limites principales :

- pas d'authentification
- pas de comptes utilisateurs
- toutes les donnees sont globales cote API
- pas de recherche
- pas de tags ni categories
- pas de rappels / notifications
- pas de partage famille/couple
- pas d'offline complet
- pas de tests automatises

## Points d'attention techniques

- `server.js` existe encore mais n'est pas le point d'entree principal du mode dev actuel
- la logique API existe a la fois en Netlify Functions et dans `dev-api/server.cjs`
- `MemoView.vue` concentre encore beaucoup de logique de presentation et de persistence
- le README historique ne decrivait plus totalement le comportement reel de l'app

## Scripts disponibles

### Racine

- `npm run dev`
- `npm run dev:api`
- `npm run dev:frontend`
- `npm run dev:netlify`
- `npm run build`
- `npm run preview`
- `npm run check`

### Frontend

- `npm --prefix frontend run dev`
- `npm --prefix frontend run build`
- `npm --prefix frontend run preview`
- `npm --prefix frontend exec vite -- --host 0.0.0.0`

## Fichiers importants

Produit et UI :

- [frontend/src/App.vue](frontend/src/App.vue)
- [frontend/src/views/CalendarView.vue](frontend/src/views/CalendarView.vue)
- [frontend/src/views/MemoView.vue](frontend/src/views/MemoView.vue)
- [frontend/src/theme.js](frontend/src/theme.js)

API et data :

- [netlify/functions/memos.js](netlify/functions/memos.js)
- [netlify/functions/health.js](netlify/functions/health.js)
- [netlify/functions/_lib/db.js](netlify/functions/_lib/db.js)
- [frontend/src/services/api.js](frontend/src/services/api.js)
- [db/init.sql](db/init.sql)

Config :

- [package.json](package.json)
- [frontend/package.json](frontend/package.json)
- [frontend/vite.config.js](frontend/vite.config.js)
- [netlify.toml](netlify.toml)

## Etat du projet

TeteDeFlorette est aujourd'hui une base solide pour :

- un memo personnel simple
- un prototype produit type `anti-oubli`
- une future PWA grand public

Avant commercialisation, il faudra au minimum ajouter :

- authentification
- donnees par utilisateur
- synchronisation multi-appareils
- rappels
- durcissement securite
- RGPD

