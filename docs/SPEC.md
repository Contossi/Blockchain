# Specifikacija: Studentski coworking (radni naziv)

## Opis
Aplikacija za studentski coworking prostor u kojoj članovi dobivaju NFT člansku iskaznicu kao digitalni ključ za ulaz u prostor, a za aktivnost dobivaju bodove u tokenu zajednice Coworking Bodovi (CWB). Mreža: Sepolia (chainId 11155111).

Sustav čine dva ugovora:
- **CoworkingBodovi**: ERC-20 token zajednice (CWB),
- **ClanskaIskaznica**: ERC-721 članska iskaznica.

## Korisnici i uloge
| Uloga | Opis |
|---|---|
| Vlasnik CWB | Vlasnik ugovora CoworkingBodovi (jedna adresa). Upravlja administratorima, svojim rezervnim vlasnikom i vlasništvom ugovora CoworkingBodovi. U tom ugovoru ima sve ovlasti administratora (`mint`, `adminBurn`, `recoverPoints`). U ugovoru ClanskaIskaznica nema ovlasti, osim ako je dodan kao administrator. |
| Vlasnik iskaznice | Vlasnik ugovora ClanskaIskaznica (jedna adresa). Upravlja svojim rezervnim vlasnikom i vlasništvom ugovora ClanskaIskaznica. U tom ugovoru ima sve ovlasti administratora (`issue`, `extend`, `recover`) i jedini opoziva iskaznice. Ne upravlja administratorima. U ugovoru CoworkingBodovi nema ovlasti, osim ako je dodan kao administrator. Napomena: administrator preko `recover` i `adminBurn` može postići učinak sličan opozivu. Administratori se smatraju povjerljivima i taj je rizik prihvaćen. |
| Rezervni vlasnik | Adresa koju vlasnik pojedinog ugovora postavlja za taj ugovor. Može preuzeti vlasništvo tog ugovora tek nakon 180 dana neaktivnosti njegova vlasnika. Kao rezervni vlasnik nema drugih ovlasti; može biti i administrator. |
| Administrator | Adresa koju dodaje vlasnik CWB. Popis administratora je zajednički za oba ugovora i vodi se u ugovoru CoworkingBodovi. Administrator izdaje i spaljuje bodove, izdaje i produljuje iskaznice te oporavlja bodove i iskaznice. Ne može mijenjati vlasnike ni administratore. |
| Član | Adresa koja drži iskaznicu i/ili bodove. Šalje svoje bodove izravno (`transfer`) i spaljuje svoje bodove. |
| Bilo tko | Čita javne podatke (salda, valjanost iskaznice, metapodatke). |
| Ugovor iskaznice | Ugovor ClanskaIskaznica. Vlasnik CWB ga dodaje kao administratora u ugovoru CoworkingBodovi kako bi pri oporavku i opozivu iskaznice mogao premještati i spaljivati bodove. |

U odjeljku *Funkcije* „vlasnik" u porukama pada (`Samo vlasnik`, `Samo vlasnik ili administrator`) znači vlasnika onog ugovora u kojem je funkcija.

## Odluke o tokenu
| Odluka | Odgovor |
|---|---|
| Naziv, oznaka, decimale | Coworking Bodovi, `CWB`, 0 decimala (samo cijeli bodovi). |
| Izdavanje | Vlasnik CWB i administratori. Nema granice po izdavanju ni ukupne gornje granice (cap). |
| Prenosivost | `transfer` je dopušten svakom imatelju bodova; `transfer` iznosa 0 uspijeva bez promjene salda (prema ERC-20 standardu). `transferFrom` i `approve` uvijek su zabranjeni. |
| Trošenje | Spaljivanje je dopušteno: član spaljuje svoje bodove, a vlasnik CWB i administratori bodove bilo koje adrese. |
| Administratori | Dodaje ih i uklanja samo vlasnik CWB. Popis je zajednički za oba ugovora. Administrator ne može ukloniti ni zamijeniti vlasnika. Vlasništvo pojedinog ugovora prenosi samo njegov vlasnik, a vlasnik se smije i odreći vlasništva. |
| Gubitak ključa (vlasnik) | Vlasnik postavlja i mijenja rezervnog vlasnika. Rezervni vlasnik preuzima vlasništvo tek nakon 180 dana neaktivnosti vlasnika. Prihvaćeno je da vlasnik koji 180 dana ne pošalje nijednu transakciju ugovoru može izgubiti vlasništvo, iako nije izgubio novčanik. |
| Gubitak ključa (član) | Vlasnik CWB ili administrator premješta cijeli saldo sa stare na novu adresu. Gubitak je 30 % i spaljuje se: `gubitak = floor(saldo * 30 / 100)`, a nova adresa dobiva `saldo - gubitak`. |

## Odluke o modulu
| Odluka | Odgovor |
|---|---|
| Više iskaznica po adresi | Ne. Najviše jedna iskaznica po adresi. |
| Tko izdaje | Vlasnik iskaznice i administratori. |
| Trajanje | Jedna akademska godina, do 30. 9. Vlasnik iskaznice ili administrator produljuje je svake godine ako je osoba i dalje student. Status studenta provjerava se izvan lanca. |
| Prenosivost | Nije prenosiva. Kod gubitka novčanika vlasnik iskaznice ili administrator premješta iskaznicu cijelu na novu adresu, a bodovi CWB stare adrese premještaju se uz gubitak od 30 % (isto pravilo kao kod oporavka bodova). Nova adresa mora biti prazna (bez iskaznice i bez bodova CWB), pa se oporavak ne može koristiti za prijenos iskaznice između postojećih članova. |
| Metapodaci | Samo `tokenId`. |
| Opoziv | Samo vlasnik iskaznice. Iskaznica se spaljuje, a svi bodovi CWB te adrese također se spaljuju. Adresa kasnije može dobiti novu iskaznicu (s novim `tokenId`). |

## Funkcije

### Ugovor CoworkingBodovi (ERC-20)

**`mint(to, amount)`**
- Poziva: vlasnik CWB, administrator.
- Ulaz: adresa primatelja, broj bodova.
- Radi: izdaje `amount` CWB na `to`.
- Pada:
  - pozivatelj nije vlasnik ni administrator → `Samo vlasnik ili administrator`
  - `to` je nulta adresa → `Neispravna adresa`
  - `amount` je 0 → `Iznos mora biti veci od 0`

**`transfer(to, amount)`**
- Poziva: bilo koji imatelj bodova.
- Ulaz: adresa primatelja, broj bodova.
- Radi: prenosi `amount` CWB s pozivatelja na `to`.
- Pada:
  - `to` je nulta adresa → `Neispravna adresa`
  - saldo pozivatelja manji je od `amount` → `Nedovoljno bodova`
- Napomena: `amount` 0 ne pada; salda se ne mijenjaju (prema ERC-20 standardu).

**`transferFrom(from, to, amount)`**
- Poziva: nitko.
- Radi: ništa, uvijek pada.
- Pada: uvijek → `transferFrom nije dozvoljen`

**`approve(spender, amount)`**
- Poziva: nitko.
- Radi: ništa, uvijek pada (odobrenja nemaju smisla jer je `transferFrom` zabranjen).
- Pada: uvijek → `approve nije dozvoljen`

**`burn(amount)`**
- Poziva: bilo koji imatelj bodova.
- Ulaz: broj bodova.
- Radi: spaljuje `amount` CWB s adrese pozivatelja.
- Pada:
  - `amount` je 0 → `Iznos mora biti veci od 0`
  - saldo pozivatelja manji je od `amount` → `Nedovoljno bodova`

**`adminBurn(account, amount)`**
- Poziva: vlasnik CWB, administrator.
- Ulaz: adresa, broj bodova.
- Radi: spaljuje `amount` CWB s adrese `account`.
- Pada:
  - pozivatelj nije vlasnik ni administrator → `Samo vlasnik ili administrator`
  - `amount` je 0 → `Iznos mora biti veci od 0`
  - saldo adrese `account` manji je od `amount` → `Nedovoljno bodova`

**`recoverPoints(oldAddr, newAddr)`**
- Poziva: vlasnik CWB, administrator (uključujući ugovor iskaznice).
- Ulaz: stara (izgubljena) adresa, nova adresa.
- Radi: računa `gubitak = floor(saldo * 30 / 100)`, spaljuje `gubitak` sa stare adrese, a ostatak (`saldo - gubitak`) prenosi na novu adresu. Stara adresa ostaje s 0 CWB.
- Pada:
  - pozivatelj nije vlasnik ni administrator → `Samo vlasnik ili administrator`
  - `newAddr` je nulta adresa → `Neispravna adresa`
  - `oldAddr` i `newAddr` su iste → `Adrese moraju biti razlicite`
  - saldo stare adrese je 0 → `Nema bodova za premjestanje`

### Ugovor ClanskaIskaznica (ERC-721)

**`issue(to, expiresAt)`**
- Poziva: vlasnik iskaznice, administrator.
- Ulaz: adresa člana, datum isteka (Unix vrijeme; frontend šalje 30. 9. tekuće akademske godine).
- Radi: izdaje novu iskaznicu sa sljedećim `tokenId` i pamti datum isteka.
- Pada:
  - pozivatelj nije vlasnik ni administrator → `Samo vlasnik ili administrator`
  - `to` je nulta adresa → `Neispravna adresa`
  - `to` već ima iskaznicu → `Adresa vec ima iskaznicu`
  - `expiresAt` nije u budućnosti → `Datum isteka mora biti u buducnosti`

**`extend(tokenId, newExpiresAt)`**
- Poziva: vlasnik iskaznice, administrator.
- Ulaz: `tokenId`, novi datum isteka (30. 9. sljedeće akademske godine).
- Radi: postavlja novi datum isteka. Može se produljiti i iskaznica koja je već istekla.
- Pada:
  - pozivatelj nije vlasnik ni administrator → `Samo vlasnik ili administrator`
  - iskaznica ne postoji → `Iskaznica ne postoji`
  - `newExpiresAt` nije u budućnosti → `Datum isteka mora biti u buducnosti`
  - `newExpiresAt` nije nakon trenutnog datuma isteka → `Novi datum mora biti nakon trenutnog`

**`isValid(tokenId)`** (čitanje)
- Poziva: bilo tko.
- Radi: vraća `true` ako iskaznica postoji i `block.timestamp <= expiresAt`, inače `false`. Iskaznica vrijedi zaključno s trenutkom `expiresAt`. Služi kao provjera digitalnog ključa za ulaz.
- Pada: ne pada.

**`transferFrom` / `safeTransferFrom`**
- Poziva: nitko.
- Radi: ništa, uvijek pada.
- Pada: uvijek → `Iskaznica nije prenosiva`

**`recover(oldAddr, newAddr)`**
- Poziva: vlasnik iskaznice, administrator.
- Ulaz: stara (izgubljena) adresa, nova adresa.
- Radi: premješta iskaznicu (isti `tokenId`, isti datum isteka) sa stare na novu adresu. Ako stara adresa ima bodova CWB, u istoj transakciji poziva `recoverPoints(oldAddr, newAddr)` (gubitak 30 %). Ako ih nema, bodovi se preskaču. Ako poziv `recoverPoints` padne, pada cijela transakcija i iskaznica ostaje na staroj adresi.
- Pada:
  - pozivatelj nije vlasnik ni administrator → `Samo vlasnik ili administrator`
  - `newAddr` je nulta adresa → `Neispravna adresa`
  - `oldAddr` i `newAddr` su iste → `Adrese moraju biti razlicite`
  - stara adresa nema iskaznicu → `Stara adresa nema iskaznicu`
  - nova adresa već ima iskaznicu → `Adresa vec ima iskaznicu`
  - nova adresa ima bodova CWB → `Nova adresa mora biti prazna`
  - stara adresa ima bodova CWB, a ugovor iskaznice nije administrator u CoworkingBodovi → `Samo vlasnik ili administrator` (poruka iz CoworkingBodovi)

**`revoke(tokenId)`**
- Poziva: samo vlasnik iskaznice.
- Ulaz: `tokenId`.
- Radi: spaljuje iskaznicu. Ako imatelj ima bodova CWB, u istoj transakciji poziva `adminBurn(imatelj, saldo)` i tako spaljuje sve njegove bodove. Ako ih nema, bodovi se preskaču. Ako poziv `adminBurn` padne, pada cijela transakcija i iskaznica ostaje.
- Pada:
  - pozivatelj nije vlasnik → `Samo vlasnik`
  - iskaznica ne postoji → `Iskaznica ne postoji`
  - imatelj ima bodova CWB, a ugovor iskaznice nije administrator u CoworkingBodovi → `Samo vlasnik ili administrator` (poruka iz CoworkingBodovi)

**`tokenURI(tokenId)`** (čitanje)
- Poziva: bilo tko.
- Radi: vraća točno niz `data:application/json,{"tokenId":"<id>"}`, gdje je `<id>` decimalni zapis `tokenId` (npr. za `tokenId` 1: `data:application/json,{"tokenId":"1"}`).
- Pada: iskaznica ne postoji → `Iskaznica ne postoji`

### Administratori (samo u ugovoru CoworkingBodovi, zajednički popis)

ClanskaIskaznica nema vlastiti popis administratora. Pri svakoj provjeri ovlasti čita `isAdmin` iz ugovora CoworkingBodovi.

**`addAdmin(account)`**
- Poziva: samo vlasnik CWB.
- Radi: dodaje administratora za oba ugovora.
- Pada:
  - pozivatelj nije vlasnik → `Samo vlasnik`
  - `account` je nulta adresa → `Neispravna adresa`
  - `account` je već administrator → `Adresa je vec administrator`

**`removeAdmin(account)`**
- Poziva: samo vlasnik CWB.
- Radi: uklanja administratora iz oba ugovora.
- Pada:
  - pozivatelj nije vlasnik → `Samo vlasnik`
  - `account` nije administrator → `Adresa nije administrator`

### Vlasništvo (vrijedi za oba ugovora, svaki ugovor ima svoje)

**`transferOwnership(newOwner)`**
- Poziva: samo vlasnik tog ugovora.
- Radi: prenosi vlasništvo na `newOwner`, briše rezervnog vlasnika i postavlja vrijeme zadnje aktivnosti vlasnika na trenutno.
- Pada:
  - pozivatelj nije vlasnik → `Samo vlasnik`
  - `newOwner` je nulta adresa → `Neispravna adresa`

**`renounceOwnership()`**
- Poziva: samo vlasnik tog ugovora.
- Radi: vlasnik postaje nulta adresa, a rezervni vlasnik se briše (isto pravilo kao kod `transferOwnership`). Nakon toga funkcije koje traže vlasnika više nitko ne može pozvati.
- Pada: pozivatelj nije vlasnik → `Samo vlasnik`

**`setBackupOwner(account)`**
- Poziva: samo vlasnik tog ugovora.
- Radi: postavlja ili mijenja rezervnog vlasnika.
- Pada:
  - pozivatelj nije vlasnik → `Samo vlasnik`
  - `account` je nulta adresa → `Neispravna adresa`
  - `account` je trenutni vlasnik → `Rezervni vlasnik ne moze biti vlasnik`

**`claimOwnership()`**
- Poziva: samo rezervni vlasnik.
- Radi: rezervni vlasnik postaje vlasnik, rezervni vlasnik se briše, a vrijeme zadnje aktivnosti vlasnika postavlja se na trenutno.
- Pada:
  - pozivatelj nije rezervni vlasnik → `Samo rezervni vlasnik`
  - `block.timestamp < lastOwnerActivity + 180 dana` (180 × 86 400 = 15 552 000 s) → `Vlasnik nije neaktivan 180 dana`. U trenutku točno `lastOwnerActivity + 15 552 000` preuzimanje je dopušteno.

**Aktivnost vlasnika:** svaka uspješna transakcija koju vlasnik pošalje tom ugovoru postavlja vrijeme zadnje aktivnosti vlasnika na vrijeme tog bloka. Pri objavi ugovora to je vrijeme objave.

## Matrica ovlasti
| Funkcija | Vlasnik CWB | Vlasnik iskaznice | Rezervni vlasnik | Administrator | Član | Bilo tko |
|---|---|---|---|---|---|---|
| `mint` (CWB) | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `transfer` (vlastiti CWB) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `transferFrom`, `approve` (CWB) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `burn` (vlastiti CWB) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `adminBurn` (CWB) | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `recoverPoints` (CWB) | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `issue` (iskaznica) | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `extend` (iskaznica) | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `recover` (iskaznica) | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `revoke` (iskaznica) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| prijenos iskaznice | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `isValid`, `tokenURI`, salda | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `addAdmin`, `removeAdmin` (samo CWB ugovor) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `transferOwnership`, `renounceOwnership`, `setBackupOwner` | ✅ (CWB) | ✅ (iskaznica) | ❌ | ❌ | ❌ | ❌ |
| `claimOwnership` | ❌ | ❌ | ✅ (nakon 180 dana, samo u ugovoru za koji je postavljen) | ❌ | ❌ | ❌ |

❌ u stupcima vlasnika i rezervnog vlasnika znači da ta uloga sama po sebi nema ovlast; adresa je dobiva ako je ujedno na popisu administratora. „Bilo tko" označava adresu bez bodova i bez ikakve uloge; adresa koja ima bodove smatra se članom.

Ugovor ClanskaIskaznica ima ulogu administratora u ugovoru CoworkingBodovi. Administrator s popisa u CoworkingBodovi automatski je administrator i u ClanskaIskaznica.

## Model podataka na lancu
**CoworkingBodovi**
- salda CWB po adresi (standardni ERC-20),
- `owner`: adresa vlasnika CWB,
- `backupOwner`: adresa rezervnog vlasnika ovog ugovora (ili nulta adresa),
- `lastOwnerActivity`: vrijeme zadnje aktivnosti vlasnika,
- `isAdmin`: adresa → da/ne.

**ClanskaIskaznica**
- vlasnik svakog `tokenId` (standardni ERC-721),
- `expiresAt`: `tokenId` → datum isteka (Unix vrijeme),
- `cardOf`: adresa → `tokenId` (za pravilo jedne iskaznice po adresi),
- `nextTokenId`: brojač koji kreće od 1; spaljeni `tokenId` se ne koristi ponovno. `tokenId` 0 nikad se ne izdaje, pa `cardOf(adresa) == 0` znači da adresa nema iskaznicu,
- `points`: adresa ugovora CoworkingBodovi (postavlja se pri objavi); iz njega se čita `isAdmin`,
- `owner` (vlasnik iskaznice), `backupOwner`, `lastOwnerActivity`: kao gore, ali vlastiti za ovaj ugovor (vlastiti popis administratora ne postoji).

## Što se NE sprema na blockchain
- ime, prezime, JMBAG, OIB, e-pošta, broj mobitela, fotografija člana,
- dokazi o statusu studenta (potvrde o upisu, indeksi); provjeravaju se izvan lanca,
- povezanost adrese novčanika sa stvarnom osobom,
- razlog opoziva iskaznice,
- privatni ključevi i fraze za oporavak (nikad, nigdje).

## Kriteriji prihvaćanja

### Token CWB
**K1: Izdavanje bodova (uspjeh)**
Zadano: administrator A i adresa C sa saldom 0 CWB.
Kada: A pozove `mint(C, 10)`.
Tada: saldo adrese C je 10 CWB, a ukupna količina CWB povećana je za 10.

**K2: Izdavanje bodova bez ovlasti**
Zadano: član C koji nije ni vlasnik ni administrator.
Kada: C pozove `mint(C, 10)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`, a salda se ne mijenjaju.

**K3: Izdavanje nultog iznosa**
Zadano: vlasnik CWB V.
Kada: V pozove `mint(C, 0)`.
Tada: transakcija pada s porukom `Iznos mora biti veci od 0`.

**K4: Decimale**
Zadano: objavljen ugovor CoworkingBodovi.
Kada: bilo tko pročita `name`, `symbol` i `decimals`.
Tada: dobiva `Coworking Bodovi`, `CWB` i `0`.

**K5: Slanje bodova (uspjeh)**
Zadano: član C1 sa saldom 10 CWB i član C2 sa saldom 0 CWB.
Kada: C1 pozove `transfer(C2, 4)`.
Tada: saldo C1 je 6 CWB, a saldo C2 je 4 CWB.

**K6: Slanje više bodova nego što član ima**
Zadano: član C1 sa saldom 3 CWB.
Kada: C1 pozove `transfer(C2, 5)`.
Tada: transakcija pada s porukom `Nedovoljno bodova`, a salda se ne mijenjaju.

**K7: transferFrom je zabranjen**
Zadano: član C1 sa saldom 10 CWB i adresa X.
Kada: X pozove `transferFrom(C1, X, 1)`.
Tada: transakcija pada s porukom `transferFrom nije dozvoljen`, a salda se ne mijenjaju.

**K8: Član spaljuje svoje bodove (uspjeh)**
Zadano: član C sa saldom 10 CWB.
Kada: C pozove `burn(4)`.
Tada: saldo C je 6 CWB, a ukupna količina CWB smanjena je za 4.

**K9: Član spaljuje više bodova nego što ima**
Zadano: član C sa saldom 2 CWB.
Kada: C pozove `burn(5)`.
Tada: transakcija pada s porukom `Nedovoljno bodova`.

**K10: Administrator spaljuje tuđe bodove (uspjeh)**
Zadano: administrator A i član C sa saldom 10 CWB.
Kada: A pozove `adminBurn(C, 10)`.
Tada: saldo C je 0 CWB.

**K11: Član pokušava spaliti tuđe bodove**
Zadano: član C1 i član C2 sa saldom 10 CWB.
Kada: C1 pozove `adminBurn(C2, 5)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`, a saldo C2 ostaje 10 CWB.

**K12: Oporavak bodova s gubitkom od 30 % (uspjeh)**
Zadano: administrator A, stara adresa S sa saldom 10 CWB i nova adresa N sa saldom 0 CWB.
Kada: A pozove `recoverPoints(S, N)`.
Tada: saldo S je 0 CWB, saldo N je 7 CWB, a ukupna količina CWB smanjena je za 3.

**K13: Zaokruživanje gubitka u korist člana**
Zadano: administrator A, stara adresa S sa saldom 5 CWB i nova adresa N sa saldom 0 CWB.
Kada: A pozove `recoverPoints(S, N)`.
Tada: saldo N je 4 CWB, a spaljen je 1 CWB.

**K14: Oporavak bodova bez ovlasti**
Zadano: član C i stara adresa S sa saldom 10 CWB.
Kada: C pozove `recoverPoints(S, C)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`.

**K15: Oporavak s prazne adrese**
Zadano: administrator A i stara adresa S sa saldom 0 CWB.
Kada: A pozove `recoverPoints(S, N)`.
Tada: transakcija pada s porukom `Nema bodova za premjestanje`.

**K16: Oporavak na istu adresu**
Zadano: administrator A i adresa S sa saldom 10 CWB.
Kada: A pozove `recoverPoints(S, S)`.
Tada: transakcija pada s porukom `Adrese moraju biti razlicite`.

### Administratori (CoworkingBodovi) i vlasništvo (oba ugovora)
U K17–K21 V je vlasnik CWB. U K22–K30 V i R su vlasnik i rezervni vlasnik istog ugovora, a svaki od tih kriterija testira se na oba ugovora.

**K17: Vlasnik dodaje administratora (uspjeh)**
Zadano: vlasnik CWB V i adresa A koja nije administrator.
Kada: V pozove `addAdmin(A)`.
Tada: A je administrator u CoworkingBodovi i A-ov poziv `issue(C, expiresAt)` u ClanskaIskaznica uspijeva.

**K18: Administrator pokušava dodati administratora**
Zadano: administrator A1 i adresa A2.
Kada: A1 pozove `addAdmin(A2)`.
Tada: transakcija pada s porukom `Samo vlasnik`.

**K19: Dvostruko dodavanje administratora**
Zadano: vlasnik V i administrator A.
Kada: V pozove `addAdmin(A)`.
Tada: transakcija pada s porukom `Adresa je vec administrator`.

**K20: Vlasnik uklanja administratora (uspjeh)**
Zadano: vlasnik V i administrator A.
Kada: V pozove `removeAdmin(A)`.
Tada: A više nije administrator, a njegovi pozivi `mint(C, 1)` u CoworkingBodovi i `issue(C, expiresAt)` u ClanskaIskaznica padaju s porukom `Samo vlasnik ili administrator`.

**K21: Uklanjanje adrese koja nije administrator**
Zadano: vlasnik V i adresa X koja nije administrator.
Kada: V pozove `removeAdmin(X)`.
Tada: transakcija pada s porukom `Adresa nije administrator`.

**K22: Administrator pokušava preuzeti vlasništvo**
Zadano: administrator A.
Kada: A pozove `transferOwnership(A)`.
Tada: transakcija pada s porukom `Samo vlasnik`, a vlasnik se ne mijenja.

**K23: Vlasnik prenosi vlasništvo (uspjeh)**
Zadano: vlasnik V, rezervni vlasnik R i adresa N.
Kada: V pozove `transferOwnership(N)`.
Tada: N je vlasnik, rezervni vlasnik je nulta adresa, a V više nema vlasničke ovlasti.

**K23a: Vlasnik se odriče vlasništva (uspjeh)**
Zadano: vlasnik V i rezervni vlasnik R.
Kada: V pozove `renounceOwnership()`.
Tada: vlasnik je nulta adresa, rezervni vlasnik je nulta adresa, a V-ov poziv `setBackupOwner(R)` pada s porukom `Samo vlasnik`.

**K23b: Netko drugi se odriče vlasništva**
Zadano: administrator A.
Kada: A pozove `renounceOwnership()`.
Tada: transakcija pada s porukom `Samo vlasnik`, a vlasnik se ne mijenja.

**K24: Vlasnik postavlja rezervnog vlasnika (uspjeh)**
Zadano: vlasnik V i adresa R.
Kada: V pozove `setBackupOwner(R)`.
Tada: R je rezervni vlasnik.

**K25: Netko drugi postavlja rezervnog vlasnika**
Zadano: administrator A.
Kada: A pozove `setBackupOwner(A)`.
Tada: transakcija pada s porukom `Samo vlasnik`.

**K26: Vlasnik kao vlastiti rezervni vlasnik**
Zadano: vlasnik V.
Kada: V pozove `setBackupOwner(V)`.
Tada: transakcija pada s porukom `Rezervni vlasnik ne moze biti vlasnik`.

**K27: Rezervni vlasnik preuzima nakon 180 dana (uspjeh)**
Zadano: vlasnik V, rezervni vlasnik R, `lastOwnerActivity = T` i nakon toga nijedna transakcija vlasnika V prema ugovoru.
Kada: R u vremenu bloka `T + 15 552 000` (180 dana) pozove `claimOwnership()`.
Tada: R je vlasnik, a rezervni vlasnik je nulta adresa.

**K28: Rezervni vlasnik prerano preuzima**
Zadano: rezervni vlasnik R, vlasnik V i `lastOwnerActivity = T`.
Kada: R u vremenu bloka `T + 15 465 600` (179 dana) pozove `claimOwnership()`.
Tada: transakcija pada s porukom `Vlasnik nije neaktivan 180 dana`, a vlasnik ostaje V.

**K29: Aktivnost vlasnika poništava odbrojavanje**
Zadano: rezervni vlasnik R, vlasnik V i `lastOwnerActivity = T`. U vremenu bloka `T + 15 465 600` (179 dana) V pošalje uspješnu transakciju (u CoworkingBodovi `addAdmin(A)`, u ClanskaIskaznica `extend`).
Kada: R u vremenu bloka `T + 15 638 400` (181 dan od T, 2 dana od aktivnosti) pozove `claimOwnership()`.
Tada: transakcija pada s porukom `Vlasnik nije neaktivan 180 dana`, a `lastOwnerActivity` jednak je vremenu bloka V-ove transakcije.

**K30: Netko tko nije rezervni vlasnik preuzima**
Zadano: administrator A i vlasnik neaktivan 200 dana.
Kada: A pozove `claimOwnership()`.
Tada: transakcija pada s porukom `Samo rezervni vlasnik`.

### Članska iskaznica
**K31: Izdavanje iskaznice (uspjeh)**
Zadano: administrator A, adresa C bez iskaznice i datum isteka 30. 9. sljedeće godine.
Kada: A pozove `issue(C, expiresAt)`.
Tada: C posjeduje iskaznicu s novim `tokenId`, a `expiresAt` za taj `tokenId` jednak je zadanom datumu.

**K32: Druga iskaznica za istu adresu**
Zadano: adresa C koja već ima iskaznicu.
Kada: administrator A pozove `issue(C, expiresAt)`.
Tada: transakcija pada s porukom `Adresa vec ima iskaznicu`.

**K33: Izdavanje bez ovlasti**
Zadano: član C.
Kada: C pozove `issue(C, expiresAt)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`.

**K34: Izdavanje s datumom u prošlosti**
Zadano: administrator A.
Kada: A pozove `issue(C, expiresAt)` s datumom isteka prije trenutnog vremena bloka.
Tada: transakcija pada s porukom `Datum isteka mora biti u buducnosti`.

**K35: Valjana iskaznica otvara ulaz**
Zadano: iskaznica `tokenId` čiji datum isteka još nije prošao.
Kada: bilo tko pozove `isValid(tokenId)`.
Tada: dobiva `true`.

**K36: Istekla iskaznica ne otvara ulaz**
Zadano: iskaznica `tokenId` s datumom isteka 30. 9. i vrijeme bloka 1. 10. iste godine.
Kada: bilo tko pozove `isValid(tokenId)`.
Tada: dobiva `false`.

**K37: Produljenje iskaznice (uspjeh)**
Zadano: administrator A i iskaznica `tokenId` s datumom isteka 30. 9. ove godine.
Kada: A pozove `extend(tokenId, 30. 9. sljedeće godine)`.
Tada: `expiresAt` za `tokenId` je 30. 9. sljedeće godine, a `isValid(tokenId)` vraća `true`.

**K38: Produljenje na raniji datum**
Zadano: iskaznica `tokenId` s datumom isteka 30. 9. sljedeće godine.
Kada: administrator A pozove `extend(tokenId, datum prije trenutnog datuma isteka, ali u budućnosti)`.
Tada: transakcija pada s porukom `Novi datum mora biti nakon trenutnog`.

**K39: Produljenje bez ovlasti**
Zadano: član C koji ima iskaznicu `tokenId`.
Kada: C pozove `extend(tokenId, noviDatum)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`.

**K40: Produljenje nepostojeće iskaznice**
Zadano: `tokenId` koji nije izdan.
Kada: administrator A pozove `extend(tokenId, noviDatum)`.
Tada: transakcija pada s porukom `Iskaznica ne postoji`.

**K41: Iskaznica nije prenosiva**
Zadano: član C1 koji ima iskaznicu `tokenId` i adresa C2.
Kada: C1 pozove `transferFrom(C1, C2, tokenId)` ili `safeTransferFrom(C1, C2, tokenId)`.
Tada: transakcija pada s porukom `Iskaznica nije prenosiva`, a vlasnik iskaznice ostaje C1.

**K42: Oporavak iskaznice s bodovima (uspjeh)**
Zadano: administrator A, stara adresa S s iskaznicom `tokenId` i 10 CWB te nova adresa N bez iskaznice i s 0 CWB.
Kada: A pozove `recover(S, N)`.
Tada: N posjeduje iskaznicu `tokenId` s nepromijenjenim datumom isteka, S nema iskaznicu, saldo S je 0 CWB, saldo N je 7 CWB, a spaljena su 3 CWB.

**K43: Oporavak iskaznice bez bodova (uspjeh)**
Zadano: administrator A, stara adresa S s iskaznicom `tokenId` i 0 CWB te nova adresa N bez iskaznice.
Kada: A pozove `recover(S, N)`.
Tada: N posjeduje iskaznicu `tokenId`, a transakcija ne pada.

**K44: Oporavak na adresu koja već ima iskaznicu**
Zadano: stara adresa S s iskaznicom i nova adresa N koja već ima iskaznicu.
Kada: administrator A pozove `recover(S, N)`.
Tada: transakcija pada s porukom `Adresa vec ima iskaznicu`, a ni iskaznice ni bodovi se ne mijenjaju.

**K45: Oporavak sa stare adrese bez iskaznice**
Zadano: adresa S bez iskaznice.
Kada: administrator A pozove `recover(S, N)`.
Tada: transakcija pada s porukom `Stara adresa nema iskaznicu`.

**K46: Oporavak iskaznice bez ovlasti**
Zadano: član C i stara adresa S s iskaznicom.
Kada: C pozove `recover(S, C)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`.

**K47: Opoziv iskaznice (uspjeh)**
Zadano: vlasnik iskaznice V i član C s iskaznicom `tokenId` i 10 CWB.
Kada: V pozove `revoke(tokenId)`.
Tada: iskaznica `tokenId` više ne postoji, `isValid(tokenId)` vraća `false`, a saldo C je 0 CWB.

**K48: Administrator pokušava opozvati iskaznicu**
Zadano: administrator A i iskaznica `tokenId`.
Kada: A pozove `revoke(tokenId)`.
Tada: transakcija pada s porukom `Samo vlasnik`, a iskaznica i bodovi ostaju nepromijenjeni.

**K49: Nova iskaznica nakon opoziva**
Zadano: adresa C čija je iskaznica `tokenId` opozvana.
Kada: administrator A pozove `issue(C, expiresAt)`.
Tada: C dobiva iskaznicu s novim `tokenId` koji je različit od opozvanog.

**K50: Metapodaci sadrže samo tokenId**
Zadano: iskaznica `tokenId`.
Kada: bilo tko pozove `tokenURI(tokenId)`.
Tada: dobiva točno `data:application/json,{"tokenId":"<id>"}` s decimalnim zapisom tog `tokenId`, bez ikakvih drugih polja.

**K51: Oporavak iskaznice na adresu s bodovima**
Zadano: administrator A, stara adresa S s iskaznicom `tokenId` i 10 CWB te nova adresa N bez iskaznice i s 5 CWB.
Kada: A pozove `recover(S, N)`.
Tada: transakcija pada s porukom `Nova adresa mora biti prazna`, S i dalje posjeduje `tokenId`, saldo S je 10 CWB, a saldo N je 5 CWB.

### Odvojeni vlasnici i uloge
U K52–K55 vlasnik CWB V1 i vlasnik iskaznice V2 različite su adrese i nijedna nije administrator.

**K52: Vlasnik CWB ne izdaje iskaznice**
Zadano: vlasnik CWB V1 i adresa C bez iskaznice.
Kada: V1 pozove `issue(C, expiresAt)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`.

**K53: Vlasnik iskaznice ne izdaje bodove**
Zadano: vlasnik iskaznice V2.
Kada: V2 pozove `mint(C, 1)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`, a salda se ne mijenjaju.

**K54: Vlasnik iskaznice ne upravlja administratorima**
Zadano: vlasnik iskaznice V2 i adresa A koja nije administrator.
Kada: V2 pozove `addAdmin(A)` u CoworkingBodovi.
Tada: transakcija pada s porukom `Samo vlasnik`, a A nije administrator.

**K55: Vlasnik CWB ne opoziva iskaznice**
Zadano: vlasnik CWB V1 i iskaznica `tokenId`.
Kada: V1 pozove `revoke(tokenId)`.
Tada: transakcija pada s porukom `Samo vlasnik`, a iskaznica i bodovi ostaju nepromijenjeni.

**K56: Rezervni vlasnik koji je i administrator**
Zadano: vlasnik CWB V, adresa R koja je administrator i koju V postavi kao rezervnog vlasnika (`setBackupOwner(R)` uspijeva).
Kada: R pozove `mint(C, 1)`.
Tada: saldo C povećan je za 1 CWB.

### Odstupanja od standarda ERC-20
**K57: Slanje nultog iznosa**
Zadano: član C1 sa saldom 10 CWB i član C2 sa saldom 0 CWB.
Kada: C1 pozove `transfer(C2, 0)`.
Tada: transakcija uspijeva, saldo C1 je 10 CWB, a saldo C2 je 0 CWB.

**K58: approve je zabranjen**
Zadano: član C sa saldom 10 CWB i adresa X.
Kada: C pozove `approve(X, 5)`.
Tada: transakcija pada s porukom `approve nije dozvoljen`, a `allowance(C, X)` je 0.

### Granice i povezanost ugovora
**K59: Prva iskaznica ima tokenId 1**
Zadano: tek objavljen ugovor ClanskaIskaznica i adrese C1 i C2 bez iskaznice.
Kada: administrator A pozove `issue(C1, expiresAt)`, zatim `issue(C1, expiresAt)` pa `issue(C2, expiresAt)`.
Tada: C1 posjeduje iskaznicu `tokenId` 1 i `cardOf(C1) == 1`, drugi poziv pada s porukom `Adresa vec ima iskaznicu`, a C2 posjeduje iskaznicu `tokenId` 2.

**K60: Preuzimanje vlasništva točno na granici**
Zadano: vlasnik V, rezervni vlasnik R i `lastOwnerActivity = T`.
Kada: R pozove `claimOwnership()` u vremenu bloka `T + 15 551 999`, a zatim u `T + 15 552 000`.
Tada: prvi poziv pada s porukom `Vlasnik nije neaktivan 180 dana`, a drugi uspijeva i R je vlasnik.

**K61: Valjanost iskaznice točno na granici**
Zadano: iskaznica `tokenId` s `expiresAt = E`.
Kada: bilo tko pozove `isValid(tokenId)` u vremenu bloka `E`, a zatim u `E + 1`.
Tada: prvi poziv vraća `true`, a drugi `false`.

**K62: Oporavak kad ugovor iskaznice nije administrator**
Zadano: ugovor ClanskaIskaznica nije na popisu administratora u CoworkingBodovi, administrator A, stara adresa S s iskaznicom `tokenId` i 10 CWB te prazna nova adresa N.
Kada: A pozove `recover(S, N)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`, S i dalje posjeduje `tokenId`, saldo S je 10 CWB, a saldo N je 0 CWB.

**K63: Opoziv kad ugovor iskaznice nije administrator**
Zadano: ugovor ClanskaIskaznica nije na popisu administratora u CoworkingBodovi, vlasnik iskaznice V i član C s iskaznicom `tokenId` i 10 CWB.
Kada: V pozove `revoke(tokenId)`.
Tada: transakcija pada s porukom `Samo vlasnik ili administrator`, C i dalje posjeduje `tokenId`, a saldo C je 10 CWB.

## Izvan opsega
- ukupna gornja granica (cap) i granica po jednom izdavanju bodova,
- zamjena bodova za usluge ili nagrade,
- `transferFrom` za bodove i bilo kakav prijenos iskaznice među članovima,
- višepotpisni novčanik (multisig) za vlasnika,
- više vrsta članstva, slika iskaznice i ostali metapodaci osim `tokenId`,
- fizički uređaj ili čitač na vratima prostora (aplikacija samo pruža `isValid`),
- automatska provjera statusa studenta.

## Otvorena pitanja
1. **Naziv aplikacije:** u specifikaciji je radni naziv „Studentski coworking”.
2. **Zajednički vlasnik:** riješeno. Vlasnici ostaju odvojeni kao dvije uloge (vlasnik CWB i vlasnik iskaznice), svaka sa svojim rezervnim vlasnikom.
3. **Povezivanje ugovora:** pretpostavka je da vlasnik CWB ugovor ClanskaIskaznica dodaje kao administratora u CoworkingBodovi kako bi oporavak i opoziv bili jedna transakcija. Treba potvrditi.
4. **Vremenska zona isteka:** pretpostavka je da je istek 30. 9. u 23:59:59 po zagrebačkom vremenu, a izračunava ga frontend. Ugovor ne provjerava je li datum zaista 30. 9.
5. **Oporavak bodova adrese s iskaznicom:** smije li se pozvati samo `recoverPoints` za adresu koja ima iskaznicu (bodovi bi se premjestili, a iskaznica ostala na staroj adresi)?
6. **Bodovi bez iskaznice:** smiju li se bodovi izdavati adresi koja nema iskaznicu (ili ima isteklu)? (Pretpostavka: smiju, jer nije zadano ograničenje.)

## Sljedivost
(popunjava se u Dijelu 4)
