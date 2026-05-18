# Checklist E2E Registro Firme

Ultimo aggiornamento: 2026-04-29

Scopo: validare il modulo `/registro/firme` su dati reali per decidere il passaggio da `Parziale` a `Migrato`.

## Criterio di uscita

Il modulo puo' essere considerato `Migrato` quando:

- tutti i casi `P0` sotto risultano superati
- non emergono deviazioni funzionali dal legacy sui flussi principali
- i messaggi di errore/blocco risultano coerenti e comprensibili
- non compaiono regressioni su assenze, firme condivise, sostegno o voti collegati

## Preconditions

- ambiente `registro` avviato e funzionante
- utente docente con almeno:
  - una `cattedra` curricolare attiva
  - una `cattedra` di sostegno attiva, se disponibile
  - una classe con orario e lezioni realistiche
- dati reali o realistici per:
  - slot vuoto
  - slot con lezione gia presente
  - slot con compresenza
  - almeno un caso con gruppo/classe
  - almeno un caso con alunno assente
- accesso sia al refactor sia al legacy per confronto puntuale

## Casi P0

### 1. Contesto lezioni

- Aprire `/lezioni` e selezionare una `cattedra`.
- Aprire `/registro/firme` e verificare caricamento corretto del quadro.
- Ripetere con contesto `classe` se previsto per sostituzione.
- Verificare che senza contesto il refactor blocchi il flusso con rimando corretto a `/lezioni`.

Esito atteso:
- nessun caricamento errato o ambiguo del contesto
- classe, materia, data e vista coerenti con il contesto scelto

### 2. Nuova lezione semplice

- Trovare uno slot vuoto.
- Creare una nuova lezione standard da `/registro/firme`.
- Compilare `argomento`, `attivita`, `ora fine`, eventuale `modulo formativo`.
- Salvare.

Esito atteso:
- la lezione compare subito nel quadro
- dati mostrati coerenti con quanto inserito
- nessuna anomalia su assenze o ore della lezione
- comportamento coerente col legacy sullo stesso caso

### 3. Sostituzione da contesto classe

- Selezionare un contesto `classe`.
- Creare una lezione di sostituzione in uno slot compatibile.
- Verificare eventuale scelta `materia` e `tipo sostituzione`.

Esito atteso:
- creazione riuscita senza deviare al legacy
- materia e tipo gruppo coerenti con il caso scelto
- messaggi UI chiari sul tipo di operazione

### 4. Compresenza

- Usare uno slot con lezione gia presente ma compatibile.
- Aprire il dialog di creazione.
- Verificare che il refactor segnali azione `Firma in compresenza`.
- Completare il salvataggio.

Esito atteso:
- viene aggiunta la firma senza duplicazioni errate
- la lezione condivisa mostra i docenti corretti
- argomento/attivita coerenti con le regole attese

### 5. Trasformazione slot

- Usare uno slot gia occupato che richiede trasformazione.
- Aprire il dialog di creazione.
- Verificare che il refactor segnali azione `Trasformazione slot`.
- Completare il salvataggio.

Esito atteso:
- la trasformazione avviene senza perdita di dati
- gruppi, materia e firme finali risultano coerenti
- nessuna incoerenza su assenze o ore ricalcolate

### 6. Modifica lezione semplice

- Aprire una lezione del docente non condivisa.
- Modificare `argomento`, `attivita`, eventuale `modulo formativo`.

Esito atteso:
- modifica salvata correttamente
- dati aggiornati subito nel quadro
- nessun side effect inatteso su altre firme

### 7. Modifica lezione condivisa

- Aprire una lezione condivisa tra piu' docenti.
- Verificare il messaggio che avvisa che la modifica agisce sulla lezione comune.
- Salvare una modifica.

Esito atteso:
- comportamento coerente con la regola di condivisione
- nessuna perdita della firma degli altri docenti
- risultato coerente col legacy

### 8. Cancellazione firma in lezione condivisa

- Selezionare una lezione condivisa.
- Aprire delete e leggere il messaggio di contesto.
- Confermare cancellazione.

Esito atteso:
- viene rimossa solo la firma del docente corrente
- la lezione resta attiva per gli altri docenti
- messaggio finale coerente con il caso

### 9. Cancellazione lezione semplice

- Selezionare una lezione non condivisa e senza dipendenze bloccanti.
- Confermare delete.

Esito atteso:
- lezione eliminata
- assenze collegate rimosse o ricalcolate correttamente
- nessun residuo visibile nel quadro

### 10. Cancellazione con voti collegati

- Selezionare una lezione con voti collegati al docente.
- Provare la cancellazione.

Esito atteso:
- se esiste lezione alternativa valida, i voti vengono riallineati senza perdita dati
- se non esiste, il refactor blocca la cancellazione con messaggio esplicito
- nessun voto resta orfano

## Casi P1

### 11. Lezione di sostegno

- Creare o modificare una lezione di sostegno.
- Verificare differenze attese tra `Firma` e `FirmaSostegno`.

Esito atteso:
- argomento/attivita gestiti correttamente
- alunno associato coerente
- nessuna regressione sui casi misti con firme non sostegno

### 12. Blocchi data

- Provare create/edit/delete in:
  - giorno festivo
  - data futura
  - data bloccata da scrutinio o regola analoga, se disponibile

Esito atteso:
- blocco coerente e messaggio comprensibile
- stesso comportamento atteso rispetto al legacy

### 13. Vista giornaliera e mensile

- Verificare navigazione `G` e `M`.
- Controllare coerenza dei dati mostrati cambiando data e vista.

Esito atteso:
- nessun disallineamento tra viste
- slot e gruppi coerenti in entrambe

## Confronto finale con legacy

Per ogni caso `P0`, annotare:

- URL/caso testato
- risultato refactor
- risultato legacy
- differenza rilevata
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
  solo se tutti i casi `P0` sono `OK` o `OK con note` non bloccanti

- `Restare Parziale`
  se anche un solo caso `P0` fallisce o se emerge una differenza funzionale critica dal legacy
