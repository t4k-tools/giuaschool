# Procedura: Assegnazione cattedre a un docente

Procedura per assegnare una o più cattedre a un docente nel registro elettronico.

Una **cattedra** è la terna **docente + materia + classe** che abilita il docente a operare (firme, voti, assenze, note) su quella classe per quella materia.

## Prerequisiti

- Essere loggati con un account **Amministratore** o **Dirigente** (Renato D'ambrosi è amministratore).
- Il docente da assegnare esiste in `Docenti → Modifica` ed è **abilitato**.
- La classe esiste e l'anno scolastico è quello corrente.
- La materia esiste in anagrafica (`Scuola → Materie`).

## Procedura standard (UI)

1. Accedi a **`https://registro.efor.it`** come amministratore.
2. Dal menu laterale apri **Docenti → Cattedre**.
3. Click su **"Aggiungi"** in alto a destra.
4. Compila il form:
   - **Docente** *: seleziona il docente (es. Abronzino Andrea).
   - **Materia** *: seleziona la materia.
   - **Classe** *: seleziona la classe (es. `1ª A-IP19`).
   - **Tipo**: scegli fra:
     - **Normale** — cattedra ordinaria (default).
     - **ITP** — Insegnante Tecnico-Pratico (compresenza laboratorio).
     - **Potenziamento** — ore di potenziamento dell'organico.
     - **Att. Alternativa** — alternativa alla religione cattolica.
   - **Supplenza**: attiva solo se il docente è in sostituzione di un titolare.
5. Click **"Salva"**.

La cattedra è creata in stato **Attiva**. Il docente la vedrà al successivo login alla voce **Cattedre attive** nella pagina **Contesto lezioni**.

## Modifica o disattivazione

- **Modifica**: click sull'icona matita sulla riga (o click sulla riga). Si possono cambiare docente, materia, classe, tipo, supplenza.
- **Disattivare temporaneamente** (senza eliminare lo storico): in modifica, disattiva l'interruttore **"Attiva"**. La cattedra non comparirà più nel contesto lezioni del docente ma resta in DB.
- **Eliminare**: click sull'icona cestino. Conferma nel dialog. **Attenzione**: l'eliminazione è definitiva — preferire la disattivazione se ci sono già firme/voti collegati.

## Verifica lato docente

1. Logout dall'amministratore.
2. Login come il docente assegnato.
3. La pagina **Home → Contesto lezioni** deve mostrare:
   - **Cattedre attive: N** (numero > 0).
4. Click su **Cattedra** → tendina con la classe-materia.
5. Selezionare la cattedra e click su **"Salva contesto"**.
6. **Apri registro firme** o **Apri registro voti** deve aprire il modulo sulla classe scelta.

Se "Cattedre attive" resta a 0 dopo l'assegnazione, controllare che:
- la cattedra sia stata salvata in stato **Attiva** (non disattivata);
- il docente nella cattedra sia esattamente quello con cui si è loggati (verificare `id` con `?` nella URL della modifica);
- non ci sia una sessione cache: forzare logout/login.

## Errori comuni

| Messaggio | Causa | Rimedio |
|---|---|---|
| `Questa cattedra esiste già.` (409) | Esiste già la stessa terna docente-materia-classe | Modifica quella esistente invece di crearne una nuova; oppure cambia uno dei tre campi |
| `Docente non trovato.` (404) | ID docente non valido | Selezionare il docente dalla tendina, non incollare ID |
| `Materia non trovata.` (404) | Materia eliminata o ID errato | Verificare anagrafica materie in `Scuola → Materie` |
| `Classe non trovata.` (404) | Classe non presente nell'anno corrente | Verificare in `Scuola → Classi` |
| Errore 401 al salvataggio | Token JWT scaduto (TTL 8h) | Logout e login, poi ripetere |

## Carico orario in blocco

Per importare cattedre da file (PDF orario, CSV) usare la procedura legacy descritta in `Guida-caricamento-orario-1.pdf`. Lo strumento di import del refactor non gestisce ancora il caricamento massivo di cattedre.

## Riferimenti tecnici

- **UI**: `refactor/src/app/(app)/docenti/cattedre/page.tsx`
- **API**:
  - `GET /api/cattedre` — lista paginata, filtri `search`, `classe`, `docente`
  - `POST /api/cattedre` — crea (body: `docenteId`, `materiaId`, `classeId`, `tipo`, `supplenza`)
  - `PUT /api/cattedre/{id}` — modifica (campi opzionali, incl. `attiva`)
  - `DELETE /api/cattedre/{id}` — elimina
- **Controller**: `src/src/Controller/Api/ScuolaApiController.php` (sezione `// ──── CATTEDRE ────`, dalla riga 609)
- **Entità**: `src/src/Entity/Cattedra.php`
- **Vincolo unicità**: terna (docente, materia, classe) — controllata in `cattedreCreate` con `findOneBy`
