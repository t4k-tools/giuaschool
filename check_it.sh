#!/bin/bash

INPUT="triple.txt"
OUTPUT="liberi.txt"

> "$OUTPUT"

while read domain; do
    clean=$(echo "$domain" | tr -d ',' | xargs)

    echo "Controllo $clean"

    response=$(curl -s -o /dev/null -w "%{http_code}" https://rdap.nic.it/domain/$clean)

    if [ "$response" = "404" ]; then
        echo "$clean" >> "$OUTPUT"
        echo "✔ LIBERO"
    else
        echo "✘ Registrato"
    fi

    sleep 1
done < "$INPUT"

echo "Controllo completato."
