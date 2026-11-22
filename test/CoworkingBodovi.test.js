import { network } from "hardhat";
const { ethers } = await network.connect();
import { expect } from "chai";

// Testovi kriterija prihvacanja za ugovor CoworkingBodovi (docs/SPEC.md).
// Jedan it() po kriteriju; stanje se priprema u beforeEach.

const ZERO = ethers.ZeroAddress;
const DAY = 86_400n;
const PERIOD = 15_552_000n; // 180 dana
// Za transakcije koje moraju pasti u tocno zadanom bloku: s fiksnim gasLimit
// ethers ne procjenjuje gas unaprijed, pa se transakcija stvarno izvrsi u
// bloku s postavljenim vremenom i u njemu padne.
const MINED = { gasLimit: 200_000n };

async function setNextTimestamp(ts) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [Number(ts)]);
}

async function mineAt(ts) {
  await setNextTimestamp(ts);
  await ethers.provider.send("evm_mine", []);
}

describe("CoworkingBodovi: kriteriji prihvacanja", function () {
  let token;
  let V, A, C1, C2, X, R, N;

  beforeEach(async function () {
    [V, A, C1, C2, X, R, N] = await ethers.getSigners();
    token = await ethers.deployContract("CoworkingBodovi", [], V);
    await token.connect(V).addAdmin(A.address);
  });

  // ------------------------------------------------------------------
  // Token CWB
  // ------------------------------------------------------------------

  describe("K1", function () {
    it("K1: administrator izdaje bodove", async function () {
      const supplyBefore = await token.totalSupply();
      await expect(token.connect(A).mint(C1.address, 10))
        .to.emit(token, "Transfer")
        .withArgs(ZERO, C1.address, 10n);
      expect(await token.balanceOf(C1.address)).to.equal(10n);
      expect(await token.totalSupply()).to.equal(supplyBefore + 10n);
    });
  });

  describe("K2", function () {
    it("K2: clan bez ovlasti ne moze izdati bodove", async function () {
      await expect(token.connect(C1).mint(C1.address, 10)).to.be.revertedWith(
        "Samo vlasnik ili administrator",
      );
      expect(await token.balanceOf(C1.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(0n);
    });
  });

  describe("K3", function () {
    it("K3: izdavanje nultog iznosa", async function () {
      await expect(token.connect(V).mint(C1.address, 0)).to.be.revertedWith("Iznos mora biti veci od 0");
    });
  });

  describe("K4", function () {
    it("K4: naziv, oznaka i decimale", async function () {
      expect(await token.connect(X).name()).to.equal("Coworking Bodovi");
      expect(await token.connect(X).symbol()).to.equal("CWB");
      expect(await token.connect(X).decimals()).to.equal(0n);
    });
  });

  describe("K5", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C1.address, 10);
    });

    it("K5: slanje bodova", async function () {
      await expect(token.connect(C1).transfer(C2.address, 4))
        .to.emit(token, "Transfer")
        .withArgs(C1.address, C2.address, 4n);
      expect(await token.balanceOf(C1.address)).to.equal(6n);
      expect(await token.balanceOf(C2.address)).to.equal(4n);
    });
  });

  describe("K6", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C1.address, 3);
    });

    it("K6: slanje vise bodova nego sto clan ima", async function () {
      await expect(token.connect(C1).transfer(C2.address, 5)).to.be.revertedWith("Nedovoljno bodova");
      expect(await token.balanceOf(C1.address)).to.equal(3n);
      expect(await token.balanceOf(C2.address)).to.equal(0n);
    });
  });

  describe("K7", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C1.address, 10);
    });

    it("K7: transferFrom je zabranjen", async function () {
      await expect(token.connect(X).transferFrom(C1.address, X.address, 1)).to.be.revertedWith(
        "transferFrom nije dozvoljen",
      );
      expect(await token.balanceOf(C1.address)).to.equal(10n);
      expect(await token.balanceOf(X.address)).to.equal(0n);
    });
  });

  describe("K8", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C1.address, 10);
    });

    it("K8: clan spaljuje svoje bodove", async function () {
      const supplyBefore = await token.totalSupply();
      await expect(token.connect(C1).burn(4))
        .to.emit(token, "Transfer")
        .withArgs(C1.address, ZERO, 4n);
      expect(await token.balanceOf(C1.address)).to.equal(6n);
      expect(await token.totalSupply()).to.equal(supplyBefore - 4n);
    });
  });

  describe("K9", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C1.address, 2);
    });

    it("K9: clan spaljuje vise bodova nego sto ima", async function () {
      await expect(token.connect(C1).burn(5)).to.be.revertedWith("Nedovoljno bodova");
      expect(await token.balanceOf(C1.address)).to.equal(2n);
    });
  });

  describe("K10", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C1.address, 10);
    });

    it("K10: administrator spaljuje tudje bodove", async function () {
      await expect(token.connect(A).adminBurn(C1.address, 10))
        .to.emit(token, "Transfer")
        .withArgs(C1.address, ZERO, 10n);
      expect(await token.balanceOf(C1.address)).to.equal(0n);
    });
  });

  describe("K11", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C2.address, 10);
    });

    it("K11: clan pokusava spaliti tudje bodove", async function () {
      await expect(token.connect(C1).adminBurn(C2.address, 5)).to.be.revertedWith(
        "Samo vlasnik ili administrator",
      );
      expect(await token.balanceOf(C2.address)).to.equal(10n);
    });
  });

  describe("K12", function () {
    let S;
    beforeEach(async function () {
      S = C1;
      await token.connect(V).mint(S.address, 10);
    });

    it("K12: oporavak bodova s gubitkom od 30 %", async function () {
      const supplyBefore = await token.totalSupply();
      const tx = token.connect(A).recoverPoints(S.address, N.address);
      await expect(tx).to.emit(token, "Transfer").withArgs(S.address, ZERO, 3n);
      await expect(tx).to.emit(token, "Transfer").withArgs(S.address, N.address, 7n);
      expect(await token.balanceOf(S.address)).to.equal(0n);
      expect(await token.balanceOf(N.address)).to.equal(7n);
      expect(await token.totalSupply()).to.equal(supplyBefore - 3n);
    });
  });

  describe("K13", function () {
    let S;
    beforeEach(async function () {
      S = C1;
      await token.connect(V).mint(S.address, 5);
    });

    it("K13: zaokruzivanje gubitka u korist clana", async function () {
      const supplyBefore = await token.totalSupply();
      const tx = token.connect(A).recoverPoints(S.address, N.address);
      await expect(tx).to.emit(token, "Transfer").withArgs(S.address, ZERO, 1n);
      await expect(tx).to.emit(token, "Transfer").withArgs(S.address, N.address, 4n);
      expect(await token.balanceOf(N.address)).to.equal(4n);
      expect(await token.totalSupply()).to.equal(supplyBefore - 1n);
    });
  });

  describe("K14", function () {
    let S;
    beforeEach(async function () {
      S = C2;
      await token.connect(V).mint(S.address, 10);
    });

    it("K14: oporavak bodova bez ovlasti", async function () {
      await expect(token.connect(C1).recoverPoints(S.address, C1.address)).to.be.revertedWith(
        "Samo vlasnik ili administrator",
      );
      expect(await token.balanceOf(S.address)).to.equal(10n);
    });
  });

  describe("K15", function () {
    it("K15: oporavak s prazne adrese", async function () {
      const S = C1;
      await expect(token.connect(A).recoverPoints(S.address, N.address)).to.be.revertedWith(
        "Nema bodova za premjestanje",
      );
    });
  });

  describe("K16", function () {
    let S;
    beforeEach(async function () {
      S = C1;
      await token.connect(V).mint(S.address, 10);
    });

    it("K16: oporavak na istu adresu", async function () {
      await expect(token.connect(A).recoverPoints(S.address, S.address)).to.be.revertedWith(
        "Adrese moraju biti razlicite",
      );
      expect(await token.balanceOf(S.address)).to.equal(10n);
    });
  });

  describe("K65", function () {
    let S;
    beforeEach(async function () {
      S = C1;
      await token.connect(V).mint(S.address, 10);
      await token.connect(V).mint(N.address, 5);
    });

    it("K65: oporavak bodova na adresu koja vec ima bodove", async function () {
      await expect(token.connect(A).recoverPoints(S.address, N.address)).to.be.revertedWith(
        "Nova adresa mora biti prazna",
      );
      expect(await token.balanceOf(S.address)).to.equal(10n);
      expect(await token.balanceOf(N.address)).to.equal(5n);
    });
  });

  describe("K68", function () {
    let S;
    beforeEach(async function () {
      S = C1;
      await token.connect(V).mint(S.address, 3);
    });

    it("K68: oporavak malog salda bez gubitka", async function () {
      const supplyBefore = await token.totalSupply();
      const tx = await token.connect(A).recoverPoints(S.address, N.address);
      await expect(tx).to.emit(token, "Transfer").withArgs(S.address, N.address, 3n);

      // Nema spaljivanja: jedini Transfer dogadaj je prijenos S -> N.
      const receipt = await tx.wait();
      const transfers = receipt.logs
        .map((log) => token.interface.parseLog(log))
        .filter((ev) => ev && ev.name === "Transfer");
      expect(transfers.length).to.equal(1);

      expect(await token.balanceOf(S.address)).to.equal(0n);
      expect(await token.balanceOf(N.address)).to.equal(3n);
      expect(await token.totalSupply()).to.equal(supplyBefore);
    });
  });

  // ------------------------------------------------------------------
  // Administratori i vlasnistvo (na ugovoru CoworkingBodovi)
  // ------------------------------------------------------------------

  describe("K17", function () {
    it("K17: vlasnik dodaje administratora", async function () {
      await token.connect(V).addAdmin(X.address);
      expect(await token.isAdmin(X.address)).to.equal(true);
      // Nije moguce testirati: drugi dio kriterija (A-ov poziv issue(C, expiresAt)
      // u ClanskaIskaznica uspijeva) trazi ugovor ClanskaIskaznica, koji jos ne postoji.
    });
  });

  describe("K18", function () {
    it("K18: administrator pokusava dodati administratora", async function () {
      await expect(token.connect(A).addAdmin(X.address)).to.be.revertedWith("Samo vlasnik");
      expect(await token.isAdmin(X.address)).to.equal(false);
    });
  });

  describe("K19", function () {
    it("K19: dvostruko dodavanje administratora", async function () {
      await expect(token.connect(V).addAdmin(A.address)).to.be.revertedWith("Adresa je vec administrator");
    });
  });

  describe("K20", function () {
    it("K20: vlasnik uklanja administratora", async function () {
      await token.connect(V).removeAdmin(A.address);
      expect(await token.isAdmin(A.address)).to.equal(false);
      await expect(token.connect(A).mint(C1.address, 1)).to.be.revertedWith("Samo vlasnik ili administrator");
      // Nije moguce testirati: A-ov poziv issue(C, expiresAt) u ClanskaIskaznica
      // (ugovor jos ne postoji).
    });
  });

  describe("K21", function () {
    it("K21: uklanjanje adrese koja nije administrator", async function () {
      await expect(token.connect(V).removeAdmin(X.address)).to.be.revertedWith("Adresa nije administrator");
    });
  });

  describe("K22", function () {
    it("K22: administrator pokusava preuzeti vlasnistvo", async function () {
      await expect(token.connect(A).transferOwnership(A.address)).to.be.revertedWith("Samo vlasnik");
      expect(await token.owner()).to.equal(V.address);
    });
  });

  describe("K23", function () {
    beforeEach(async function () {
      await token.connect(V).setBackupOwner(R.address);
    });

    it("K23: vlasnik prenosi vlasnistvo", async function () {
      await expect(token.connect(V).transferOwnership(N.address))
        .to.emit(token, "OwnershipTransferred")
        .withArgs(V.address, N.address);
      expect(await token.owner()).to.equal(N.address);
      expect(await token.backupOwner()).to.equal(ZERO);
      await expect(token.connect(V).addAdmin(X.address)).to.be.revertedWith("Samo vlasnik");
    });
  });

  describe("K23a", function () {
    beforeEach(async function () {
      await token.connect(V).setBackupOwner(R.address);
    });

    it("K23a: vlasnik se odrice vlasnistva", async function () {
      await expect(token.connect(V).renounceOwnership())
        .to.emit(token, "OwnershipTransferred")
        .withArgs(V.address, ZERO);
      expect(await token.owner()).to.equal(ZERO);
      expect(await token.backupOwner()).to.equal(ZERO);
      await expect(token.connect(V).setBackupOwner(R.address)).to.be.revertedWith("Samo vlasnik");
    });
  });

  describe("K23b", function () {
    it("K23b: netko drugi se odrice vlasnistva", async function () {
      await expect(token.connect(A).renounceOwnership()).to.be.revertedWith("Samo vlasnik");
      expect(await token.owner()).to.equal(V.address);
    });
  });

  describe("K24", function () {
    it("K24: vlasnik postavlja rezervnog vlasnika", async function () {
      await token.connect(V).setBackupOwner(R.address);
      expect(await token.backupOwner()).to.equal(R.address);
    });
  });

  describe("K25", function () {
    it("K25: netko drugi postavlja rezervnog vlasnika", async function () {
      await expect(token.connect(A).setBackupOwner(A.address)).to.be.revertedWith("Samo vlasnik");
      expect(await token.backupOwner()).to.equal(ZERO);
    });
  });

  describe("K26", function () {
    it("K26: vlasnik kao vlastiti rezervni vlasnik", async function () {
      await expect(token.connect(V).setBackupOwner(V.address)).to.be.revertedWith(
        "Rezervni vlasnik ne moze biti vlasnik",
      );
    });
  });

  describe("K27", function () {
    let T;
    beforeEach(async function () {
      await token.connect(V).setBackupOwner(R.address);
      T = await token.lastOwnerActivity();
    });

    it("K27: rezervni vlasnik preuzima nakon 180 dana", async function () {
      await setNextTimestamp(T + PERIOD);
      await expect(token.connect(R).claimOwnership())
        .to.emit(token, "OwnershipTransferred")
        .withArgs(V.address, R.address);
      expect(await token.owner()).to.equal(R.address);
      expect(await token.backupOwner()).to.equal(ZERO);
    });
  });

  describe("K28", function () {
    let T;
    beforeEach(async function () {
      await token.connect(V).setBackupOwner(R.address);
      T = await token.lastOwnerActivity();
    });

    it("K28: rezervni vlasnik prerano preuzima", async function () {
      await setNextTimestamp(T + 15_465_600n); // 179 dana
      await expect(token.connect(R).claimOwnership(MINED)).to.be.revertedWith("Vlasnik nije neaktivan 180 dana");
      expect(await token.owner()).to.equal(V.address);
    });
  });

  describe("K29", function () {
    let T;
    beforeEach(async function () {
      await token.connect(V).setBackupOwner(R.address);
      T = await token.lastOwnerActivity();
      await setNextTimestamp(T + 15_465_600n); // 179 dana: aktivnost vlasnika
      await token.connect(V).addAdmin(X.address);
    });

    it("K29: aktivnost vlasnika ponistava odbrojavanje", async function () {
      await setNextTimestamp(T + 15_638_400n); // 181 dan od T
      await expect(token.connect(R).claimOwnership(MINED)).to.be.revertedWith("Vlasnik nije neaktivan 180 dana");
      expect(await token.lastOwnerActivity()).to.equal(T + 15_465_600n);
      expect(await token.owner()).to.equal(V.address);
    });
  });

  describe("K30", function () {
    beforeEach(async function () {
      await token.connect(V).setBackupOwner(R.address);
      const T = await token.lastOwnerActivity();
      await mineAt(T + 200n * DAY);
    });

    it("K30: netko tko nije rezervni vlasnik preuzima", async function () {
      await expect(token.connect(A).claimOwnership()).to.be.revertedWith("Samo rezervni vlasnik");
      expect(await token.owner()).to.equal(V.address);
    });
  });

  // ------------------------------------------------------------------
  // Odvojeni vlasnici i uloge
  // ------------------------------------------------------------------
  // K52 i K55 odnose se na ugovor ClanskaIskaznica i ovdje se ne testiraju.

  describe("K53", function () {
    it("K53: vlasnik iskaznice ne izdaje bodove", async function () {
      // ClanskaIskaznica jos ne postoji; vlasnika iskaznice V2 predstavlja adresa X,
      // koja nije ni vlasnik CWB ni administrator.
      const V2 = X;
      await expect(token.connect(V2).mint(C1.address, 1)).to.be.revertedWith("Samo vlasnik ili administrator");
      expect(await token.balanceOf(C1.address)).to.equal(0n);
    });
  });

  describe("K54", function () {
    it("K54: vlasnik iskaznice ne upravlja administratorima", async function () {
      // Kao u K53: V2 je adresa X bez uloge u CoworkingBodovi.
      const V2 = X;
      await expect(token.connect(V2).addAdmin(C2.address)).to.be.revertedWith("Samo vlasnik");
      expect(await token.isAdmin(C2.address)).to.equal(false);
    });
  });

  describe("K56", function () {
    beforeEach(async function () {
      await token.connect(V).setBackupOwner(A.address); // A je administrator
    });

    it("K56: rezervni vlasnik koji je i administrator izdaje bodove", async function () {
      const before = await token.balanceOf(C1.address);
      await expect(token.connect(A).mint(C1.address, 1))
        .to.emit(token, "Transfer")
        .withArgs(ZERO, C1.address, 1n);
      expect(await token.balanceOf(C1.address)).to.equal(before + 1n);
    });
  });

  // ------------------------------------------------------------------
  // Odstupanja od standarda ERC-20
  // ------------------------------------------------------------------

  describe("K57", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C1.address, 10);
    });

    it("K57: slanje nultog iznosa", async function () {
      await expect(token.connect(C1).transfer(C2.address, 0))
        .to.emit(token, "Transfer")
        .withArgs(C1.address, C2.address, 0n);
      expect(await token.balanceOf(C1.address)).to.equal(10n);
      expect(await token.balanceOf(C2.address)).to.equal(0n);
    });
  });

  describe("K58", function () {
    beforeEach(async function () {
      await token.connect(V).mint(C1.address, 10);
    });

    it("K58: approve je zabranjen", async function () {
      await expect(token.connect(C1).approve(X.address, 5)).to.be.revertedWith("approve nije dozvoljen");
      expect(await token.allowance(C1.address, X.address)).to.equal(0n);
    });
  });

  describe("K64", function () {
    it("K64: slanje nultog iznosa s adrese bez bodova", async function () {
      const Y = C2;
      await expect(token.connect(X).transfer(Y.address, 0))
        .to.emit(token, "Transfer")
        .withArgs(X.address, Y.address, 0n);
      expect(await token.balanceOf(X.address)).to.equal(0n);
      expect(await token.balanceOf(Y.address)).to.equal(0n);
    });
  });

  // ------------------------------------------------------------------
  // Granice
  // ------------------------------------------------------------------

  describe("K60", function () {
    let T;
    beforeEach(async function () {
      await token.connect(V).setBackupOwner(R.address);
      T = await token.lastOwnerActivity();
    });

    it("K60: preuzimanje vlasnistva tocno na granici", async function () {
      await setNextTimestamp(T + 15_551_999n);
      await expect(token.connect(R).claimOwnership(MINED)).to.be.revertedWith("Vlasnik nije neaktivan 180 dana");
      expect(await token.owner()).to.equal(V.address);

      await setNextTimestamp(T + PERIOD);
      await expect(token.connect(R).claimOwnership())
        .to.emit(token, "OwnershipTransferred")
        .withArgs(V.address, R.address);
      expect(await token.owner()).to.equal(R.address);
    });
  });

  describe("K67", function () {
    it("K67: redoslijed provjera pri vise uvjeta pada", async function () {
      await expect(token.connect(V).mint(ZERO, 0)).to.be.revertedWith("Neispravna adresa");
    });
  });

  // Kriteriji iz sljedivosti CoworkingBodovi koji traze ugovor ClanskaIskaznica
  // (jos ne postoji) i zato se ovdje ne testiraju:
  // - K42 (recoverPoints preko recover), K47 i K63 (adminBurn preko revoke),
  //   K62 (recoverPoints preko recover kad iskaznica nije administrator).
});
