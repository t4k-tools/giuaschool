# Checklist E2E Registro Voti

Ultimo aggiornamento: 2026-04-29

Scopo: validare il modulo `/registro/voti` su dati reali per decidere il passaggio da `Parziale` a `Migrato`.

## Criterio di uscita

Il modulo puo' essere considerato `Migrato` quando:

- tutti i casi `P0` sotto risultano superati
- il flusso standard e il flusso sostegno sono entrambi stabili
- non emergono differenze funzionali critiche rispetto al legacy
- viene chiarito se il limite attuale sul contesto `classe/sostituzione` e' un vincolo accettato o un gap da chiudere

## Preconditions

- ambiente `registro` avviato e funzionante
- utente docente con almeno:
  - una `cattedra` curricolare attiva
  - una `cattedra` di sostegno attiva, se disponibile
- dati reali o realistici per:
  - almeno una classe con studenti e voti esistenti
  - almeno uno studente assente in una lezione
  - almeno un periodo aperto/modificabile
  - almeno un caso di docente sostegno con materia selezionabile
- accesso sia al refactor sia al legacy per confronto

## Vincolo attuale da validare

Il refactor dei voti usa oggi una `cattedra` reale come contesto di accesso. Il contesto `classe/sostituzione` non e' supportato nel worktree attuale.

Prima di promuovere il modulo a `Migrato`, decidere esplicitamente se:

- questo limite e' accettato per design
- oppure il supporto `classe/sostituzione` deve essere implementato

## Casi P0

### 1. Contesto lezioni

- Aprire `/lezioni` e selezionare una `cattedra`.
- Aprire `/registro/voti` e verificare caricamento corretto.
- Aprire `/registro/voti` senza contesto salvato.
- Provare ad arrivare con contesto `classe`, se riproducibile.

Esito atteso:
- con `cattedra` il quadro si carica correttamente
- senza contesto il refactor blocca il flusso con messaggio chiaro
- con `classe` il comportamento e' coerente con la decisione di prodotto attesa

### 2. Quadro voti standard

- Entrare con una `cattedra` curricolare.
- Verificare:
  - classe
  - materia
  - periodo selezionato
  - medie per studente
  - voti scritti/orali/pratici

Esito atteso:
- i dati coincidono con il legacy sullo stesso perimetro
- nessuna anomalia su numero voti, medie o visibilita

### 3. Creazione voto standard

- Scegliere uno studente della classe.
- Creare un voto:
  - con valore numerico
  - con giudizio
  - con `visibile` acceso/spento
  - con `media` acceso/spento

Esito atteso:
- il voto viene salvato correttamente
- compare subito nel quadro
- visibilita e flag media coerenti

### 4. Modifica voto standard

- Aprire un voto esistente.
- Modificare almeno:
  - data
  - voto o giudizio
  - argomento
  - visibilita/media

Esito atteso:
- aggiornamento persistito correttamente
- ordine e visualizzazione coerenti dopo il salvataggio

### 5. Cancellazione voto standard

- Eliminare un voto esistente.

Esito atteso:
- il voto scompare dal quadro
- medie e conteggi si riallineano correttamente
- nessun errore residuo

### 6. Studente assente

- Tentare inserimento/modifica di un voto per studente assente nella lezione.
- Verificare il blocco senza `Conferma studente assente`.
- Ripetere con conferma attiva.

Esito atteso:
- senza conferma il backend blocca l'operazione con messaggio esplicito
- con conferma l'operazione procede

### 7. Regole data e permessi

- Provare create/edit/delete in:
  - giorno festivo
  - data futura
  - periodo bloccato, se disponibile

Esito atteso:
- il backend rifiuta le operazioni non consentite
- messaggi coerenti e comprensibili
- stesso comportamento atteso del legacy

### 8. Quadro sostegno

- Entrare con una `cattedra` di sostegno.
- Verificare:
  - modalita `support`
  - studente supportato
  - lista materie disponibili
  - medie classe
  - dettaglio per materia selezionata

Esito atteso:
- il quadro si carica correttamente
- le medie mostrate sono coerenti con il legacy
- il filtro materia aggiorna il dettaglio nel modo atteso

### 9. Creazione voto sostegno

- In modalita sostegno, selezionare una materia.
- Creare un voto scritto/orale/pratico.

Esito atteso:
- il voto viene salvato sulla materia corretta
- il voto compare nel dettaglio dello studente supportato
- nessuna associazione errata a materia/cattedra

### 10. Modifica voto sostegno

- Modificare un voto gia presente in modalita sostegno.

Esito atteso:
- update riuscito
- nessuna perdita del collegamento con la materia corretta
- nessuna regressione sul fallback sostegno

### 11. Cancellazione voto sostegno

- Eliminare un voto in modalita sostegno.

Esito atteso:
- delete riuscita
- quadro aggiornato correttamente
- medie riallineate

## Casi P1

### 12. Periodi e filtri

- Cambiare `periodo`.
- Cambiare `materia` in supporto.

Esito atteso:
- query string, dati mostrati e statistiche restano coerenti

### 13. Voti solo con giudizio

- Creare un voto senza valore numerico ma con solo giudizio.

Esito atteso:
- il backend lo accetta quando previsto
- la UI lo rappresenta correttamente

### 14. Range voto e normalizzazione

- Inserire valori limite:
  - `1`
  - `10`
  - decimali
  - valore vuoto

Esito atteso:
- normalizzazione coerente
- nessuna accettazione di valori fuori regola

## Confronto finale con legacy

Per ogni caso `P0`, annotare:

- caso testato
- risultato refactor
- risultato legacy
- differenze rilevate
- severita: `bloccante`, `media`, `bassa`

## Template esito

```md
### Caso X - titolo

- Stato: OK | KO | OK con note
- Dati usati:
- Risultato refactor:
- Risultato legacy:
- Differenze:
- Azione richiesta:
```

## Decisione finale

- `Promuovere a Migrato`
  solo se tutti i casi `P0` sono `OK` o `OK con note` non bloccanti, e il limite di contesto e' stato accettato o chiuso

- `Restare Parziale`
  se fallisce anche un solo caso `P0`, o se il limite di contesto resta ambiguo, o se emergono differenze critiche rispetto al legacy
