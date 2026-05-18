# Procedura — Gestione Rappresentanti ATA

Ultimo aggiornamento: 2026-04-30

URL applicazione: `/ata/rappresentanti`

## A chi serve

Personale di segreteria, dirigenti o staff con permessi di gestione anagrafica ATA, che deve registrare o aggiornare gli incarichi di rappresentanza del personale tecnico-amministrativo.

## Cosa permette di fare

Assegnare o revocare i **ruoli di rappresentanza** alle persone gia presenti nell'anagrafica ATA. La pagina **non crea nuove anagrafiche**: per inserire una persona nuova si usa prima `/ata/modifica` (anagrafica singola) oppure `/ata/importa` (import massivo da file).

## Ruoli disponibili

| Codice | Etichetta | Significato |
|---|---|---|
| `I` | Istituto | Rappresentante d'Istituto |
| `R` | RSU | Rappresentanza Sindacale Unitaria |

Una persona puo avere **entrambi i ruoli, uno solo o nessuno**. I ruoli sono indipendenti tra loro.

## Procedura passo-passo

### 1. Aprire la pagina

Vai su `/ata/rappresentanti`. Vedi una tabella con tutto il personale ATA gia in anagrafica:

| Colonna | Contenuto |
|---|---|
| Cognome | Cognome della persona |
| Nome | Nome della persona |
| Tipo | Tipologia ATA (es. amministrativo, tecnico, collaboratore) |
| Ruoli Rappresentante | Badge dei ruoli attualmente assegnati (`Istituto`, `RSU` o trattino se nessuno) |
| (azione) | Icona matita per modificare |

Se la tabella e' vuota: non ci sono persone in anagrafica ATA. Vedi sezione [Persona non in lista](#se-la-persona-non-e-in-lista).

### 2. Aprire il dialog di modifica

Hai due modi equivalenti:

- **Click sulla riga** della persona (l'intera riga e' cliccabile)
- **Click sull'icona matita** a destra della riga

Si apre il dialog **"Ruoli Rappresentante"** con il nome e tipo della persona nella descrizione (es. "Rossi Mario - Amministrativo").

### 3. Selezionare i ruoli

Il dialog mostra due switch (toggle):

- **Istituto** — attivo se la persona e' rappresentante d'Istituto
- **RSU** — attivo se e' rappresentante sindacale

Per ciascuno switch:

- **Sposta verso destra** (attivo) per assegnare il ruolo
- **Sposta verso sinistra** (inattivo) per non assegnarlo

Se vuoi solo aggiungere un ruolo senza toccare l'altro, modifica solo lo switch del ruolo che ti interessa: lo stato dell'altro switch rispecchia gia il valore corrente.

### 4. Salvare

Click su **"Salva"**.

- Durante il salvataggio il pulsante mostra "Salvataggio..." ed e' disabilitato.
- A successo: toast verde "Ruoli rappresentante aggiornati con successo", il dialog si chiude e la tabella si aggiorna automaticamente.
- A errore: toast rosso con il messaggio d'errore. Il dialog resta aperto cosi puoi correggere e riprovare.

Per **annullare** senza salvare: click su "Annulla" o chiudi il dialog (click esterno o tasto Esc). Le modifiche fatte sugli switch nel dialog vengono scartate.

## Casi d'uso ricorrenti

### Aggiungere un rappresentante d'Istituto

1. Apri `/ata/rappresentanti`
2. Click sulla riga della persona
3. Attiva lo switch **Istituto**
4. Salva

### Aggiungere un rappresentante RSU mantenendo l'Istituto

1. Apri `/ata/rappresentanti`
2. Click sulla riga della persona (lo switch **Istituto** e' gia attivo)
3. Attiva lo switch **RSU** (lasci attivo anche **Istituto**)
4. Salva

### Revocare tutti i ruoli a una persona

1. Apri `/ata/rappresentanti`
2. Click sulla riga della persona
3. Disattiva entrambi gli switch
4. Salva

Dopo il salvataggio la colonna "Ruoli Rappresentante" mostrera un trattino lungo (`—`) per quella persona.

### Cambiare il ruolo (es. da Istituto a RSU)

1. Apri `/ata/rappresentanti`
2. Click sulla riga della persona
3. Disattiva **Istituto** e attiva **RSU**
4. Salva

## Se la persona non e' in lista

Significa che non e' ancora registrata nell'anagrafica ATA. Va aggiunta prima:

- **Inserimento singolo** — vai su `/ata/modifica`, compila l'anagrafica della persona
- **Inserimento massivo** — vai su `/ata/importa`, carica il file di import seguendo il formato richiesto dalla pagina

Una volta inserita l'anagrafica, la persona appare automaticamente in `/ata/rappresentanti` (puo essere necessario un refresh della pagina) e puoi assegnarle i ruoli.

## Verifica e troubleshooting

### Come verifico che il salvataggio sia andato a buon fine

Dopo il salvataggio:

1. Il toast verde di conferma compare in basso a destra
2. La tabella si aggiorna automaticamente: la colonna "Ruoli Rappresentante" della persona modificata mostra i badge dei ruoli attivi
3. Riaprire il dialog mostra gli switch nello stato salvato

Se ricarichi la pagina (F5) e i ruoli sono ancora corretti, la modifica e' effettivamente persistita su database.

### Errore al salvataggio

Cause piu comuni:

- **Sessione scaduta** — il toast riporta un errore di autorizzazione. Soluzione: rifare login e riprovare.
- **Permessi insufficienti** — il tuo utente non ha il diritto di modificare l'anagrafica ATA. Soluzione: chiedere a chi gestisce i permessi (dirigente o staff con role admin) di abilitarti.
- **Errore di rete** — il toast riporta un messaggio generico. Soluzione: riprovare dopo qualche secondo. Se persiste, verificare la connettivita.

### La tabella non si aggiorna

Soluzioni in ordine:

1. Click sull'icona di refresh del browser o premi F5
2. Logout e re-login
3. Se ancora non funziona, segnalare il problema con uno screenshot del toast e dei log della console browser (F12 → Console)

## Note tecniche per chi sviluppa

- Endpoint chiamato dal frontend: `PUT /api/ata/{id}/rappresentante` con body `{rappresentante: ["I", "R"]}` (lista dei ruoli attivi)
- Codice frontend: [refactor/src/app/(app)/ata/rappresentanti/page.tsx](../../refactor/src/app/(app)/ata/rappresentanti/page.tsx)
- Client API: `api.ata.setRappresentante(token, id, roles)` in [refactor/src/lib/api/client.ts](../../refactor/src/lib/api/client.ts)
- Backend: `AtaApiController` in [src/src/Controller/Api/AtaApiController.php](../../src/src/Controller/Api/AtaApiController.php)

Le costanti dei ruoli sono definite in `RAPPRESENTANTE_LABELS` nel file frontend e devono restare allineate con i codici accettati dal backend.

## Storico modifiche

| Data | Cambiamento |
|---|---|
| 2026-04-30 | Versione iniziale della procedura |
