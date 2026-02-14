# 📘 OpenRemover API — Documentation

> **Base URL** : `https://openremover.vercel.app`
>
> **Version** : `v1`
>
> **Endpoint unique** : `POST /api/v1/remove`

---

## 📋 Table des matières

1. [Présentation](#-présentation)
2. [Authentification](#-authentification)
3. [Endpoint : Remove Background](#-endpoint--remove-background)
4. [Codes d'erreur](#-codes-derreur)
5. [Exemples cURL](#-exemples-curl)
6. [Configuration dans n8n (HTTP Request)](#-configuration-dans-n8n-http-request)
7. [Workflow n8n avancé](#-workflow-n8n-avancé)
8. [Système de crédits](#-système-de-crédits)
9. [Limites et quotas](#-limites-et-quotas)

---

## 🎯 Présentation

OpenRemover est une API de suppression d'arrière-plan d'images, propulsée par l'IA (modèle RMBG-2.0). L'API accepte une image et retourne un PNG avec l'arrière-plan supprimé (transparent ou couleur de fond personnalisée).

**Fonctionnalités** :

- Suppression d'arrière-plan haute qualité via IA
- Fond transparent (PNG avec alpha) ou couleur personnalisée
- Authentification par clé API ou token Bearer
- Système de crédits (1 crédit = 1 image traitée)

---

## 🔐 Authentification

L'API supporte **2 méthodes** d'authentification :

### Méthode 1 : Clé API (recommandée pour n8n) ✅

Passez votre clé API dans le header `x-api-key`.

| Header      | Valeur                 |
| ----------- | ---------------------- |
| `x-api-key` | `sk_votre_cle_api_ici` |

> **Où obtenir sa clé API ?**
>
> 1. Se connecter sur [openremover.vercel.app/login](https://openremover.vercel.app/login)
> 2. Aller sur le [Dashboard](https://openremover.vercel.app/dashboard)
> 3. Créer une nouvelle clé API dans la section "API Keys"
> 4. **Copier la clé immédiatement** — elle ne sera plus visible après !

### Méthode 2 : Bearer Token (Supabase Auth)

Utilisez un token d'authentification Supabase dans le header `Authorization`.

| Header          | Valeur                      |
| --------------- | --------------------------- |
| `Authorization` | `Bearer votre_access_token` |

> ⚠️ Cette méthode est principalement utilisée par l'interface web. **Pour n8n, privilégiez la Méthode 1 (clé API).**

---

## 🖼️ Endpoint : Remove Background

### `POST /api/v1/remove`

Supprime l'arrière-plan d'une image.

### Request

| Propriété              | Valeur                                         |
| ---------------------- | ---------------------------------------------- |
| **Method**             | `POST`                                         |
| **URL**                | `https://openremover.vercel.app/api/v1/remove` |
| **Content-Type**       | `multipart/form-data`                          |
| **Timeout recommandé** | `60 secondes`                                  |

### Paramètres (Form-Data)

| Champ      | Type     | Obligatoire | Description                                                                     |
| ---------- | -------- | :---------: | ------------------------------------------------------------------------------- |
| `image`    | `File`   |   ✅ Oui    | L'image à traiter (PNG, JPG, WebP)                                              |
| `bg_color` | `String` |   ❌ Non    | Couleur de fond en hex (ex: `#ffffff`, `#00ff00`). Si absent → fond transparent |

### Response (Succès — 200)

| Propriété               | Valeur                              |
| ----------------------- | ----------------------------------- |
| **Content-Type**        | `image/png`                         |
| **Content-Disposition** | `inline; filename="removed-bg.png"` |
| **Body**                | Données binaires de l'image PNG     |

> **Important** : La réponse est une image **binaire** (pas du JSON). Il faut configurer n8n pour recevoir des données binaires.

---

## ❌ Codes d'erreur

| Code HTTP | Message                                 | Cause                                  |
| :-------: | --------------------------------------- | -------------------------------------- |
|   `400`   | `No image file provided`                | Aucun fichier dans le champ `image`    |
|   `401`   | `Invalid API Key`                       | Clé API invalide ou inexistante        |
|   `401`   | `Missing API Key or Auth Token`         | Aucun header d'authentification fourni |
|   `401`   | `Invalid Auth Token`                    | Token Bearer invalide ou expiré        |
|   `402`   | `Insufficient credits. Please upgrade.` | Plus de crédits disponibles            |
|   `413`   | `File too large (max 10MB)`             | Fichier supérieur à 10 Mo              |
|   `415`   | `Invalid file type`                     | Le fichier n'est pas une image         |
|   `500`   | `Internal Server Error`                 | Erreur serveur (modèle IA, etc.)       |

Toutes les erreurs retournent du JSON au format :

```json
{
  "error": "Message d'erreur ici"
}
```

---

## 🔧 Exemples cURL

### Suppression d'arrière-plan (fond transparent)

```bash
curl -X POST https://openremover.vercel.app/api/v1/remove \
  -H "x-api-key: sk_votre_cle_api" \
  -F "image=@photo.jpg" \
  --output result.png
```

### Avec couleur de fond personnalisée (blanc)

```bash
curl -X POST https://openremover.vercel.app/api/v1/remove \
  -H "x-api-key: sk_votre_cle_api" \
  -F "image=@photo.jpg" \
  -F "bg_color=#ffffff" \
  --output result.png
```

---

## 🔗 Configuration dans n8n (HTTP Request)

### Étape 1 — Ajouter un nœud "HTTP Request"

Dans votre workflow n8n, ajoutez un nœud **HTTP Request**.

### Étape 2 — Configuration générale

| Paramètre           | Valeur                                         |
| ------------------- | ---------------------------------------------- |
| **Method**          | `POST`                                         |
| **URL**             | `https://openremover.vercel.app/api/v1/remove` |
| **Response Format** | `File`                                         |

> ⚠️ **IMPORTANT** : Le **Response Format** doit être sur `File` (pas `JSON`) car l'API retourne une image binaire.

### Étape 3 — Authentification (Header)

Dans l'onglet **"Headers"**, ajoutez :

| Header Name | Header Value           |
| ----------- | ---------------------- |
| `x-api-key` | `sk_votre_cle_api_ici` |

> 💡 **Astuce sécurité** : Utilisez une **Credential** de type "Header Auth" dans n8n pour ne pas exposer votre clé en clair dans le workflow :
>
> 1. Allez dans **Credentials** > **Add Credential** > **Header Auth**
> 2. **Name** : `x-api-key`
> 3. **Value** : `sk_votre_cle_api_ici`
> 4. Sélectionnez cette credential dans "Authentication" du nœud HTTP Request

### Étape 4 — Body (envoi de l'image)

| Paramètre             | Valeur                |
| --------------------- | --------------------- |
| **Body Content Type** | `Multipart Form Data` |
| **Specify Body**      | `Using Fields Below`  |

Puis ajoutez les champs :

**Champ 1 (obligatoire) :**

| Paramètre                 | Valeur                                                        |
| ------------------------- | ------------------------------------------------------------- |
| **Field Name**            | `image`                                                       |
| **Input Data Field Name** | `data` _(ou le nom du champ binaire de votre nœud précédent)_ |
| **Type**                  | `n8n Binary Data`                                             |

**Champ 2 (optionnel — couleur de fond) :**

| Paramètre      | Valeur                             |
| -------------- | ---------------------------------- |
| **Field Name** | `bg_color`                         |
| **Value**      | `#ffffff` _(ou toute couleur hex)_ |
| **Type**       | `String`                           |

### Étape 5 — Options supplémentaires

Dans l'onglet **"Options"** :

| Paramètre    | Valeur                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------- |
| **Timeout**  | `60000` _(60 secondes — le traitement IA peut prendre du temps lors du premier appel "cold start")_ |
| **Response** | Sélectionner **`Put Output in Field`** → `data`                                                     |

### Résumé visuel de la configuration

```
┌─────────────────────────────────────────────────┐
│           n8n — HTTP Request Node               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Method:         POST                           │
│  URL:            https://openremover.vercel.    │
│                  app/api/v1/remove               │
│                                                 │
│  ── Authentication ──                           │
│  Type:           Header Auth                    │
│  Header:         x-api-key                      │
│  Value:          sk_xxxxxxxxxxxx                │
│                                                 │
│  ── Body ──                                     │
│  Content Type:   Multipart Form Data            │
│  Field 1:        image (Binary Data)            │
│  Field 2:        bg_color (String, optionnel)   │
│                                                 │
│  ── Response ──                                 │
│  Response Format: File                          │
│  Put Field:      data                           │
│                                                 │
│  ── Options ──                                  │
│  Timeout:        60000 ms                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Workflow n8n avancé

### Exemple 1 : Traitement d'images depuis un webhook

```
[Webhook] → [HTTP Request (OpenRemover)] → [Email / Slack / Google Drive]
```

1. **Webhook** : Reçoit une image en POST
2. **HTTP Request** : Envoie l'image à l'API OpenRemover
3. **Action finale** : Envoie le résultat par email, Slack, etc.

### Exemple 2 : Traitement en batch depuis Google Drive

```
[Google Drive Trigger] → [Google Drive (Download)] → [HTTP Request (OpenRemover)] → [Google Drive (Upload)]
```

1. **Google Drive Trigger** : Détecte un nouveau fichier dans un dossier
2. **Google Drive Download** : Télécharge l'image en binaire
3. **HTTP Request** : Supprime l'arrière-plan via l'API
4. **Google Drive Upload** : Upload le résultat dans un dossier de sortie

### Exemple 3 : Traitement via formulaire (n8n Form Trigger)

```
[Form Trigger] → [HTTP Request (OpenRemover)] → [Respond to Webhook]
```

1. **Form Trigger** : Affiche un formulaire avec upload de fichier
2. **HTTP Request** : Traite l'image
3. **Respond to Webhook** : Retourne l'image traitée à l'utilisateur

### Configuration pour les workflows en batch

> ⚠️ **Attention au rate limiting et aux crédits** : Chaque appel API consomme **1 crédit**. Pour les workflows en batch, pensez à :
>
> - Ajouter un nœud **Wait** entre chaque image (1-2 secondes)
> - Vérifier vos crédits avant de lancer un batch
> - Gérer les erreurs `402` (plus de crédits)

---

## 💰 Système de crédits

| Plan            | Crédits à l'inscription | Prix    |
| --------------- | :---------------------: | ------- |
| **Free**        |       10 crédits        | Gratuit |
| **Small Pack**  |       50 crédits        | $4.99   |
| **Medium Pack** |       150 crédits       | $12.99  |
| **Large Pack**  |       500 crédits       | $34.99  |

- **1 crédit = 1 image traitée** (quel que soit le résultat)
- Les crédits sont **décomptés atomiquement** (pas de double-consommation)
- Si crédits = 0, l'API retourne une erreur `402`

---

## 📏 Limites et quotas

| Limite                    | Valeur                                                       |
| ------------------------- | ------------------------------------------------------------ |
| **Taille max du fichier** | 10 Mo                                                        |
| **Formats acceptés**      | PNG, JPG/JPEG, WebP                                          |
| **Timeout serveur**       | 60 secondes                                                  |
| **Format de sortie**      | PNG (RGBA)                                                   |
| **Cold start**            | ~10-30s au premier appel (le modèle IA se charge en mémoire) |

> 💡 **Note sur le cold start** : Le premier appel après une période d'inactivité peut être plus lent car le modèle IA (~100 Mo) doit être téléchargé et chargé en mémoire. Les appels suivants sont beaucoup plus rapides (~3-10s).

---

## 📝 Récapitulatif rapide pour n8n

```
✅ Method       → POST
✅ URL          → https://openremover.vercel.app/api/v1/remove
✅ Header       → x-api-key: sk_votre_cle
✅ Body Type    → Multipart Form Data
✅ Champ image  → Binary Data (champ "image")
✅ Champ option → bg_color (string hex, optionnel)
✅ Response     → File (binaire)
✅ Timeout      → 60000 ms
```
