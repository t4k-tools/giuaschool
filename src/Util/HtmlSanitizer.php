<?php
/*
 * SPDX-FileCopyrightText: 2017 I.I.S. Michele Giua - Cagliari - Assemini
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */


namespace App\Util;


/**
 * HtmlSanitizer - sanifica il testo libero dei messaggi (note, provvedimenti,
 * argomenti, attività, avvisi, ...) prima della memorizzazione.
 *
 * Il valore prodotto è pensato per essere reso con il filtro Twig `|raw`: l'unico
 * HTML presente sono i link generati automaticamente dalle URL, tutto il resto è
 * testo ripulito da ogni tag.
 *
 * @author Antonello Dessì
 */
class HtmlSanitizer {

  /**
   * Rimuove ogni tag HTML dal testo e trasforma le URL http(s) in link.
   *
   * Le URL non possono contenere virgolette o parentesi angolari, così il link
   * generato non può chiudere in anticipo l'attributo href e iniettare altri
   * attributi (XSS via attributo, es. onmouseover).
   *
   * @param string|null $testo Testo libero inserito dall'utente
   *
   * @return string Testo sanificato (testo semplice + link sicuri)
   */
  public static function sanitizeMessage(?string $testo): string {
    $testoPulito = strip_tags((string) $testo);
    return preg_replace(
      '#\b(https?):(/?/?)([^,\s()<>"\']+(?:\([\w\d]+\)|([^,[:punct:]\s]|/)))#i',
      '<a href="$1://$3" target="_blank" title="Collegamento esterno">$1://$3</a>',
      $testoPulito);
  }

}
