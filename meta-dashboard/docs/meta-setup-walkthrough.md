# Meta Business Manager — opret system user og token

Engangs-arbejde. ~5 minutter. Kræver admin-rolle på Altid Energis Business Manager.

## 1. Åbn Business Settings

1. Gå til [business.facebook.com](https://business.facebook.com)
2. Vælg "Altid Energi" som business hvis du har flere
3. Klik **⚙️ Settings** (gear-ikon nederst i venstre sidebar) → **Business settings**

## 2. Opret System User

1. I venstre menu → **Users → System users**
2. Klik **Add** (blå knap øverst)
3. Navn: `Altid Energi Reporting Bot`
4. Rolle: **Employee** (ikke Admin — vi skal kun have read)
5. Klik **Create system user**

## 3. Tildel ad account-adgang

Med system user'en valgt:

1. Klik **Add Assets** (i Assigned Assets-sektionen)
2. Vælg **Ad Accounts**
3. Marker Altid Energis ad account
4. Permission: vælg **View performance** (mindste tilstrækkelig — gør at scriptet kun kan læse, ikke ændre)
5. Klik **Save changes**

## 4. Generér token

1. Klik **Generate New Token** (på system user-siden)
2. Vælg din app:
   - Hvis du allerede har en Facebook app: vælg den
   - Hvis ikke: opret en på [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → "Other" → "Business" → giv den et navn fx "Altid Energi Reporting"
3. Token expiration: **Never** (system user-tokens udløber ikke)
4. Permissions — vælg disse to:
   - ✅ `ads_read`
   - ✅ `business_management`
5. Klik **Generate Token**
6. **KOPIÉR TOKEN MED DET SAMME** — den vises kun denne ene gang. Læg den et sikkert sted (1Password el. lign.) indtil du skal bruge den.

## 5. Find Ad Account ID

1. Gå til [Ads Manager](https://adsmanager.facebook.com)
2. Sørg for du har Altid Energis konto valgt øverst
3. Kig på URL'en — den indeholder `act=XXXXXXXXX` eller `selected_account_id=XXXXXXXXX`
4. Notér tallet. Account ID i format Apps Script forventer: `act_XXXXXXXXX` (med "act_" foran — scriptet tilføjer det selv hvis det mangler)

## Output

Du har nu:
- ✅ En access token (lang streng der starter med `EAA...`)
- ✅ En Ad Account ID (`act_XXXXXXXXX` eller bare tallet)

**Næste:** følg `google-setup-walkthrough.md`.

## Hvis token nogensinde lækker

Gå tilbage til Business Settings → System Users → din bot → klik tokenen → **Revoke**. Generér en ny og opdatér i Sheet'et via menuen "Meta Dashboard → Nulstil setup" og så Setup igen.
