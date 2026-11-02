# AI dnevnik

## T1 — Postavljanje projekta (datum)
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
