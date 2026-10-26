# AI dnevnik

## T1 — Postavljanje projekta (datum)
- Cilj termina: Dodati mogučnost spajanja na MetaMask račun, slanja Sepolia ETH preko web aplikacije i provjera Receipta.
- Najkorisniji prompt (kopiran u cijelosti): 
-------------------------------------------------------------------
"Nadogradi moj postojeći JavaScript frontend koji trenutačno ima click counter. Prvo pregledaj projekt, zadrži postojeću funkcionalnost i koristi postojeći framework i stil.

Dodaj povezivanje s MetaMaskom i mogućnost slanja testnog SepoliaETH-a kolegama:

- Gumb „Poveži MetaMask”, uz prikaz povezane adrese i stanja SepoliaETH-a.
- Provjeri koristi li korisnik Sepolia mrežu. Ako ne, ponudi prebacivanje uz njegovu potvrdu. Onemogući slanje na drugim mrežama.
- Obrazac za unos Ethereum adrese primatelja i iznosa u SepoliaETH-u.
- Validaciju adrese, pozitivnog iznosa i raspoloživog stanja, uključujući naknadu za transakciju.
- Prije slanja prikaži pregled adrese primatelja i iznosa. Transakciju korisnik mora osobno potvrditi u MetaMasku.
- Prikaz statusa transakcije: čeka potvrdu korisnika, poslana, potvrđena ili neuspjela. Dodaj poveznicu na transakciju u Sepolia exploreru.

* Obradi slučajeve kada MetaMask nije instaliran, korisnik odbije zahtjev, nema dovoljno sredstava ili promijeni račun odnosno mrežu.
* Tijekom obrade onemogući ponovljeno slanje i nakon potvrde osvježi stanje.



Koristi ethers.js i MetaMaskov provider. Za običan prijenos SepoliaETH-a nemoj izrađivati smart contract ni backend. Nikada ne traži niti pohranjuj seed phrase ili privatni ključ. 

Implementiraj promjene izravno u projekt, bez simuliranih transakcija. Na kraju kratko objasni što si promijenio, kako pokrenuti aplikaciju i kako isprobati slanje između dva računa."
-------------------------------------------------------------------
- Što je AI napravio dobro:Inicijalizirao je frontend 
- Što je AI napravio drugačije nego što sam očekivao: napravio je slanje Sepolia ETH ali nije dodao povijest Receipta.
- Što sam dodao u AGENTS.md: / 
- Provjera: Manualna provjera svake novosti, šta je napravljeno i je li napravljeno.
- Commit: 26.10.2026.
