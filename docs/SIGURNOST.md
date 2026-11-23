# Sigurnosni pregled: Coworking Bodovi
| # | Provjera | Rezultat | Napomena |
|---|---|---|---|
| P1 | Za svaku funkciju koja mijenja stanje: tko je smije pozvati? Odgovara
li to matrici ovlasti u SPEC-u?
|u redu |ne odnosi se | / |

| P2 | Postoji li funkcija koja mijenja stanje, a nema nikakvu provjeru
pozivatelja? Je li to namjerno?
|u redu |ne odnosi se | / |

| P3 | Koristi li ugovor igdje tx.origin?
|u redu |ne odnosi se | / |

| P4 | Provjeravaju li se svi ulazi: nulta adresa, 0, najveći iznos, duljina
teksta?
|u redu |ne odnosi se | / |

| P5 | Može li netko zaobići pravilo preko naslijeđene funkcije (npr.
transfer, transferFrom, approve, renounceOwnership)?
|u redu |ne odnosi se | / |

| P6 | Ima li blok unchecked ili verziju Solidityja ispod 0.8?
|u redu |ne odnosi se | / |

| P7 | Ima li petlju preko niza koji raste?
|u redu |ne odnosi se | / |

| P8 | Ima li ugovor tajnu ili osobni podatak u varijabli?
|u redu |ne odnosi se | / |

| P9 | Emitira li svaka promjena ovlasti događaj?
|u redu |ne odnosi se | / |

| P10 | Što se dogodi ako vlasnik izgubi ključ ili pozove renounceOwnership?
u redu | transferownership / backupowner | 160


## Nalazi AI pregledavača
| # | Nalaz | Ozbiljnost (AI) | Odluka | Razlog | Test |
|---|---|---|---|---|---|
|1.| Preljev pri izračunu gubitka blokira oporavak bodova |niska| Odbijen |

|2.| Odricanje od vlasništva ostavlja zastarjelo vrijeme aktivnosti |informativno| Odbijen |

|3.| Pozitivni saldo na odredištu može blokirati oporavak|niska| Odbijen |
