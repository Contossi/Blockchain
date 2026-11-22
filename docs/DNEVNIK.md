# AI dnevnik

## T1 — Postavljanje projekta (26.10.2026.)
- Cilj termina: Specifikacija, kritike, sucelje, deploy
- Najkorisniji prompt (kopiran u cijelosti): 
-------------------------------------------------------------------
Ponašaj se kao poslovni analitičar za blockchain aplikacije. Gradim: aplikaciju za studentski coworking prostor u kojoj članovi dobivaju NFT iskaznicu kao digitalni ključ za ulaz u prostor i token bodova aktivnosti.
Aplikacija ima token zajednice (ERC-20) i modul: Članska iskaznica (NFT).
Postavljaj mi pitanja jedno po jedno (najviše 12) dok ne dobiješ odgovor na svako pitanje
iz popisa odluka u nastavku. Ne predlaži funkcionalnosti koje nisam spomenuo; ako misliš
da nešto nedostaje, pitaj me.

Token zajednice:
| Odluka | Pitanje |
|---|---|
| Naziv, oznaka, decimale | Kako se token zove i ima li decimale? |
| Izdavanje | Tko smije izdati tokene i koliko najviše odjednom? |
| Ukupna količina | Postoji li gornja granica ukupne količine? Ako ne postoji, zašto? |
| Prenosivost | Smiju li članovi slati tokene jedni drugima? Vrijedi li to i za transferFrom? |
| Trošenje | Mogu li se tokeni potrošiti ili spaliti? Tko to pokreće? |
| Administratori | Tko dodaje i uklanja administratore? Može li administrator ukloniti vlasnika? |
| Gubitak ključa | Što ako vlasnik izgubi pristup novčaniku? |

Modul Članska iskaznica (NFT):
Može li adresa imati više iskaznica? Tko izdaje? Vrijedi li za sezonu ili zauvijek? Je li prenosiva? Što je u metapodacima, a da nije osobni podatak? Može li se opozvati?

Kad završimo, popuni docs/SPEC.md prema predlošku u toj datoteci.
Kriterije prihvaćanja piši isključivo u obliku Zadano / Kada / Tada, s točnom porukom
greške za neuspješne slučajeve. Ne piši kod.
-------------------------------------------------------------------
- Što je AI napravio dobro:postavio pitanja i po tome napisao specifikaciju.
- Što je AI napravio drugačije nego što sam očekivao: /
- Što sam dodao u AGENTS.md: / 
- Provjera: Manualna provjera svake novosti, šta je napravljeno i je li napravljeno.
- Commit: 02.11.26.

## Recenzija specifikacije (2. 11. 2026.)
AI je kao strogi recenzent pregledao docs/SPEC.md (kontradikcije, nepokriveni rubni slučajevi, zloupotrebe, neprovjerljivi kriteriji). Kontradikcije su riješene posebno (vidi SPEC, K51–K58). Obrada ostalih nalaza:

| Nalaz | Odluka | Obrazloženje |
|---|---|---|
| `tokenId` 0 je ujedno zadana vrijednost u `cardOf`, pa se ne razlikuje „ima iskaznicu 0" od „nema iskaznicu" | prihvaćeno | Stvarna greška u modelu podataka koja bi pokvarila pravilo jedne iskaznice po adresi. `nextTokenId` kreće od 1, a 0 znači „nema iskaznice" (K59). |
| Granica od 180 dana za `claimOwnership` nije određena (`>` ili `>=`) | prihvaćeno | Bez točne granice test i implementacija mogu se razići za jednu sekundu. Preuzimanje je dopušteno od točno `lastOwnerActivity + 15 552 000 s` (K60); K27–K29 prepisani u sekundama. |
| Nije određeno što `isValid` vraća kad je `block.timestamp == expiresAt` | prihvaćeno | Ista vrsta nejasnoće kao kod 180 dana. Iskaznica vrijedi zaključno s `expiresAt` (K61). |
| Ako ugovor iskaznice nije administrator u CWB-u, `recover`/`revoke` padaju za adrese s bodovima, a ponašanje nije opisano | prihvaćeno | Vlasnik CWB to može izazvati jednim `removeAdmin`. Spec sada traži da cijela transakcija bude vraćena, bez djelomičnog stanja (K62, K63). Zabrana uklanjanja ugovora s popisa nije uvedena; to ostaje odgovornost vlasnika CWB. |
| K50 („nijedan osobni podatak") nije provjerljiv jer format `tokenURI` nije zadan | prihvaćeno | Test ne može dokazati odsutnost osobnih podataka, ali može usporediti točan niz. Format: `data:application/json,{"tokenId":"<id>"}`. |
| K27–K29 koriste „180 / 179 / dva dana" bez početne točke | prihvaćeno | Spojeno s nalazom o granici od 180 dana; kriteriji sada polaze od `lastOwnerActivity = T` i zadaju pomak u sekundama. |
| Administrator može oporavkom preusmjeriti tuđe bodove ili iskaznicu na svoju adresu; predloženi su zabrana ili događaji (`PointsRecovered`, `CardRecovered`) | odbijeno | Već je odlučeno (kontradikcija 1.3) da se administratori smatraju povjerljivima i da je rizik prihvaćen. Zajednica je mala, administratore osobno bira vlasnik CWB, a svaki je poziv ionako javno vidljiv na Sepolia exploreru. Dodatna pravila i događaji povećali bi opseg bez stvarne koristi za ovu zajednicu. |
| Administrator može izdati ili produljiti iskaznicu daleko u budućnost (npr. do 2100.), pa „jedna akademska godina" vrijedi samo u frontendu | odbijeno | Otvoreno pitanje 4 već prihvaća da datum isteka računa frontend i da ugovor ne provjerava je li to 30. 9. Gornja granica (npr. 400 dana) zahtijevala bi pravila za prijestupne godine i rubne datume, a ne štiti od administratora koji svake godine može ponovno pozvati `extend`. Rizik pokriva povjerenje u administratore (vidi prethodni redak). |

## Recenzija specifikacije, druga runda (03. 11. 2026.)
Ponovljena stroga recenzija docs/SPEC.md. Nalazi koji su već obrađeni u prvoj rundi (zabrana `removeAdmin` za ugovor iskaznice, gornja granica datuma isteka, događaji za oporavak) ovdje se ne ponavljaju.

| Nalaz | Odluka | Obrazloženje |
|---|---|---|
| Matrica ovlasti kaže da „Bilo tko" (adresa bez bodova) ne može pozvati `transfer`, a `transfer(X, 0)` uspijeva svakome (K57) | prihvaćeno | Prava kontradikcija između matrice i ERC-20 ponašanja. Ponašanje ostaje prema ERC-20 standardu; matricu treba uskladiti i dodati kriterij: adresa sa saldom 0 pozove `transfer(Y, 0)` → uspijeva, salda nepromijenjena. |
| `recoverPoints` pozvan izravno ne traži praznu novu adresu, pa se bodovi mogu prebaciti postojećem članu, suprotno pravilu iz *Odluke o modulu → Prenosivost* | prihvaćeno | Isto pravilo mora vrijediti za bodove i za iskaznicu, inače se oporavak može koristiti za spajanje bodova dvaju članova. Kriterij: N ima 5 CWB, `recoverPoints(S, N)` → pada s `Nova adresa mora biti prazna`, salda nepromijenjena. |
| `isValid(tokenId)` ne dokazuje posjed: `tokenId` je javan, pa netko može na ulazu navesti tuđi valjani `tokenId` | prihvaćeno | Iskaznica je opisana kao „digitalni ključ", a bez dokaza posjeda to nije. Ugovor se ne mijenja (čitač na vratima je izvan opsega), ali spec mora navesti da provjera ulaza traži potpis adrese `ownerOf(tokenId)` i dodati odgovarajući kriterij. |
| Nije određeno koja poruka greške se vraća kad vrijedi više uvjeta pada (npr. `mint(0x0, 0)`, `recover` gdje N ima i iskaznicu i bodove) | prihvaćeno | Bez toga test i implementacija mogu se razići. Pravilo: provjere idu redoslijedom iz liste „Pada" u svakoj funkciji; K44 dopuniti tako da N ima i bodove, a očekivana poruka je `Adresa vec ima iskaznicu`. |
| K31, K36, K37 i K38 koriste „30. 9.", „1. 10." i „ove/sljedeće godine" bez točnog vremena i zone, pa ishod ovisi o datumu pokretanja testa | prihvaćeno | Kriteriji moraju biti ponovljivi. Koristit će se fiksne vrijednosti, npr. `expiresAt = 2027-09-30T21:59:59Z`, a provjera isteka u `2027-09-30T22:00:00Z`. |
| Nema kriterija za oporavak malih salda gdje se gubitak zaokružuje na 0 (saldo 1–3 CWB) | prihvaćeno | Rubni slučaj u kojem se spaljuje 0 bodova; implementacija ne smije pasti na „spaljivanju nule". Kriterij: S ima 3 CWB → N dobiva 3 CWB, ukupna količina nepromijenjena. |
| Član može izbjeći opoziv tako da prije `revoke` pošalje sve bodove na pomoćnu adresu; predloženo zamrzavanje adrese | odbijeno | Zamrzavanje uvodi novu funkciju i novo stanje u ugovoru, a koristi je malo: bodovi nemaju novčanu vrijednost (zamjena za usluge je izvan opsega), a vlasnik iskaznice može preko administratora spaliti bodove i s pomoćne adrese ako je poznata. Rizik se prihvaća. |
| Svatko može blokirati `recover` slanjem 1 CWB na novu adresu; predloženo da `transfer` bude dopušten samo adresama s iskaznicom | odbijeno | Takvo ograničenje mijenja model tokena i suprotno je pretpostavci iz otvorenog pitanja 6 (bodovi se smiju držati bez iskaznice). Blokada je jeftino zaobilazna: administrator odabere drugu, novu adresu. |
| Lažnom prijavom gubitka član može „prodati" iskaznicu na tuđu adresu i izbjeći gubitak od 30 %; predloženo ograničenje jednog oporavka u 180 dana | odbijeno | Ugovor ne može provjeriti identitet osobe, a vremensko ograničenje kaznilo bi i stvaran ponovljeni gubitak novčanika. Zaštita je izvanlančana: administrator oporavak radi uživo, uz provjeru identiteta. |
| `saldo * 30` može se preliti ako saldo prijeđe `2^256 / 30`, jer nema gornje granice izdavanja | odbijeno | Do toga može doći samo ako administrator izda astronomski iznos, a administratori se smatraju povjerljivima. Preljev u Solidity ^0.8 ionako vraća transakciju, pa nema tihe greške ni gubitka stanja. |

## Vježba 4: testovi
- Testova: 42, prolazi: 42
- Greška AI-ja koju sam uočio: /
- Mutacijska provjera: maknuo sam require(amount > 0, "Iznos mora biti veci od 0"), pao je test "K3"

## Vježba 4: objava na lokalnoj mreži
- adresa ugovora: 0x5fbdb2315678afecb367f032d93f642f64180aa3 / hash transakcije 0xdcec0892770e7d3656089277f8ec3311a41f564d858e2edf25a144eda1d68f61 /  blok: 0xbc72ed62c8d0558fcefb70c332aaeeb492b0f7507e76eacef015cb8d0dee08e8 / gas: 
2289489 of 2289489
- Zašto objava troši gas, a čitanje salda ne?
Objava je transkacija koja mijenja stanje blockchaina

- Zašto je druga transakcija (addAdmin) potrošila puno manje
gasa od objave?
Objava plaća spremanje cijelog koda ugovora: 200gasa po bajtu a ugovor ima nekoliko kilobajta, uz to se placa i osnovna cijena stvaranja ugovora od 32000.

- Što bi se dogodilo s ugovorom da sad ugasim npx hardhat node?
ugovor bi nestao, hardhat node je lokalni testni blockchain. kada ga ugasimo nestanu svi blokovi, ugovori, salda i administratori.
