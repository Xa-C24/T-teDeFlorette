# TeteDeFlorette

Application web de memos par date, avec une interface Vue 3 et une API serverless Netlify Functions branchee sur Neon PostgreSQL.

## Architecture retenue

Le projet suit l’architecture que tu as precisee :

- `frontend/` : application Vue 3 + Vite
- `netlify/functions/` : mini backend API serverless
- `db/init.sql` : creation de la table PostgreSQL
- `Neon PostgreSQL` : base distante
- `Netlify` : hebergement du frontend et execution des fonctions

La cle `DATABASE_URL` reste uniquement cote serveur dans Netlify / local `.env`. Elle n’est jamais exposee au frontend.

## Structure

```text
TeteDeFlorette/
├─ frontend/
│  ├─ src/
│  │  ├─ assets/
│  │  ├─ router/
│  │  ├─ services/
│  │  ├─ utils/
│  │  └─ views/
│  ├─ .env.example
│  ├─ package.json
│  └─ vite.config.js
├─ netlify/
│  └─ functions/
│     ├─ _lib/
│     ├─ health.js
│     └─ memos.js
├─ db/
│  └─ init.sql
├─ .env.example
├─ netlify.toml
├─ package.json
└─ README.md
```

## Fonctionnalites MVP

- Calendrier mensuel avec navigation entre les mois
- Mise en evidence de la date du jour
- Indicateur visuel sur les dates avec memo
- Page memo par date
- Zone de texte libre
- Sauvegarde manuelle
- Sauvegarde automatique simple
- Etat vide si aucun memo
- Message `Memo enregistre`
- API CRUD pour les memos
- Validation simple du format `YYYY-MM-DD`
- Route `GET /api/health`

## API exposee

Les routes sont publiees sous `/api/*` grace aux redirects Netlify :

- `GET /api/health`
- `GET /api/memos`
- `GET /api/memos/:date`
- `POST /api/memos`
- `DELETE /api/memos/:date`

### Exemple de payload POST

```json
{
  "memoDate": "2026-04-27",
  "content": "Appeler le client\nFinir le devis"
}
```

## Table PostgreSQL

```sql
CREATE TABLE memos (
  id SERIAL PRIMARY KEY,
  memo_date DATE UNIQUE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Un trigger met aussi `updated_at` a jour automatiquement.

## Variables d’environnement

### Racine

Copier `.env.example` vers `.env` :

```bash
DATABASE_URL=postgresql://user:password@host.neon.tech/tetedeflorette?sslmode=require
```

### Frontend

Copier `frontend/.env.example` vers `frontend/.env` :

```bash
VITE_API_URL=/api
```

En production Netlify, garder simplement `VITE_API_URL=/api` fonctionne bien si le frontend et les fonctions sont heberges ensemble.

## Installation

Installer les dependances :

```bash
npm install
npm --prefix frontend install
```

## Lancement en local

### Option recommandee avec Netlify

Cette option sert le frontend et les fonctions ensemble, avec les redirects `/api`.

```bash
npm run dev
```

### Frontend seul

```bash
npm run dev:frontend
```

## Build

```bash
npm run build
```

Le build Vite sort dans `frontend/dist`.

## Initialisation de la base

Deux options :

1. Lancer le SQL `db/init.sql` dans Neon.
2. Laisser la fonction initialiser automatiquement la table au premier appel API.

Les fonctions executent un `CREATE TABLE IF NOT EXISTS`, donc le premier appel sur `/api/health` ou `/api/memos` peut preparer la table.

## Deploiement Netlify + Neon

### Neon

1. Creer un projet Neon.
2. Recuperer la connection string PostgreSQL.
3. Verifier que `sslmode=require` est present.

### Netlify

1. Connecter le repository a Netlify.
2. Build command : `npm run build`
3. Publish directory : `frontend/dist`
4. Ajouter la variable d’environnement serveur :

```bash
DATABASE_URL=ta_connection_string_neon
```

5. Ajouter la variable frontend si necessaire :

```bash
VITE_API_URL=/api
```

6. Deployer.

Le fichier `netlify.toml` est deja configure pour :

- builder le frontend Vite
- exposer les fonctions Netlify
- rediriger `/api/*` vers `/.netlify/functions/*`
- gerer le fallback SPA Vue Router

## Notes de qualite

- `DATABASE_URL` n’est jamais utilisee dans le frontend
- validation de date cote API
- gestion centralisee des erreurs API
- structure prete pour un deploiement simple sur Netlify
- style responsive desktop / tablette / mobile
- design creme, sauge, rose pale, avec animations discretes

## Scripts utiles

### Racine

- `npm run dev` : lance Netlify local
- `npm run dev:frontend` : lance Vite seul
- `npm run build` : build frontend
- `npm run preview` : preview du build frontend
- `npm run check` : verification par build

### Frontend

- `npm --prefix frontend run dev`
- `npm --prefix frontend run build`
- `npm --prefix frontend run preview`
