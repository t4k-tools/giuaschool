# Import orario settimanale da CSV

Questa cartella contiene i file per compilare manualmente l'orario settimanale e poi usarlo per un caricamento automatico.

## File

- `orario_settimanale_template.csv`: template da compilare. Contiene una riga per ogni combinazione `classe + giorno + ora`.
- `cattedre_riferimento.csv`: elenco delle cattedre attive presenti nel DB. Serve per copiare il `cattedra_id` corretto.

## Come compilare il template

Nel file `orario_settimanale_template.csv` non modificare queste colonne:

- `orario_id`
- `classe_id`
- `classe`
- `corso`
- `gruppo`
- `sede`
- `giorno_numero`
- `giorno`
- `ora`
- `inizio`
- `fine`

Compilare invece almeno:

- `cattedra_id`: valore preso da `cattedre_riferimento.csv`

Le colonne seguenti sono opzionali e servono soprattutto per controllo umano:

- `docente_username`
- `docente_cognome`
- `docente_nome`
- `materia`
- `tipo`
- `note`

## Regole

- Una cella oraria vuota va lasciata con `cattedra_id` vuoto.
- Per una compresenza, duplicare la riga dello stesso `orario_id + classe_id + giorno_numero + ora` e indicare un secondo `cattedra_id`.
- Usare sempre `classe_id` e `cattedra_id`: le sigle classe non bastano, perche' esistono piu classi con la stessa sigla in corsi diversi.
- Le classi della sede `ACIIEF` usano `orario_id=4`, fascia `08:00-14:00`.
- Le classi della sede `ACIIEF SER` usano `orario_id=5`, fascia `14:30-20:30`.

## Stato attuale dati

Il template e' stato generato dal database locale il 2026-05-04:

- 18 classi
- 6 giorni
- 6 ore al giorno
- 648 righe compilabili
- 60 cattedre attive di riferimento

Nota: al momento le cattedre presenti nel DB risultano concentrate sulle classi quinte. Prima di importare l'orario delle altre classi, creare anche le relative cattedre.
