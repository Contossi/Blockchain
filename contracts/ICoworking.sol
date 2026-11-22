// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Sučelje ugovora CoworkingBodovi (ERC-20, CWB)
/// @notice Token zajednice, administratori (zajednički popis za oba ugovora) i vlasništvo.
/// @dev Događaji: samo standardni ERC-20 `Transfer` i `Approval` (naslijeđeni iz IERC20).
///      Poruke pada navedene su u docs/SPEC.md, odjeljak Funkcije.
interface ICoworkingToken is IERC20Metadata {
    // ------------------------------------------------------------------
    // ERC-20 čitanje
    // ------------------------------------------------------------------

    /// Poziva: bilo tko. Vraća "Coworking Bodovi".
    /// SPEC: K4
    function name() external view override returns (string memory);

    /// Poziva: bilo tko. Vraća "CWB".
    /// SPEC: K4
    function symbol() external view override returns (string memory);

    /// Poziva: bilo tko. Vraća 0.
    /// SPEC: K4
    function decimals() external view override returns (uint8);

    /// Poziva: bilo tko.
    /// SPEC: K1, K8, K12, K13, K68
    function totalSupply() external view override returns (uint256);

    /// Poziva: bilo tko.
    /// SPEC: K1, K5, K6, K10, K12, K57, K64
    function balanceOf(address account) external view override returns (uint256);

    /// Poziva: bilo tko. Uvijek 0 jer je approve zabranjen.
    /// SPEC: K58
    function allowance(address holder, address spender) external view override returns (uint256);

    // ------------------------------------------------------------------
    // ERC-20 prijenos (uz odstupanja od standarda)
    // ------------------------------------------------------------------

    /// Poziva: bilo koji imatelj bodova; iznos 0 bilo tko.
    /// SPEC: K5, K6, K57, K64
    function transfer(address to, uint256 amount) external override returns (bool);

    /// Poziva: nitko (uvijek pada: "transferFrom nije dozvoljen").
    /// SPEC: K7
    function transferFrom(address from, address to, uint256 amount) external override returns (bool);

    /// Poziva: nitko (uvijek pada: "approve nije dozvoljen").
    /// SPEC: K58
    function approve(address spender, uint256 amount) external override returns (bool);

    // ------------------------------------------------------------------
    // Izdavanje, spaljivanje i oporavak bodova
    // ------------------------------------------------------------------

    /// Poziva: vlasnik CWB, administrator.
    /// SPEC: K1, K2, K3, K20, K53, K56, K67
    function mint(address to, uint256 amount) external;

    /// Poziva: bilo koji imatelj bodova (spaljuje vlastite bodove).
    /// SPEC: K8, K9
    function burn(uint256 amount) external;

    /// Poziva: vlasnik CWB, administrator (uključujući ugovor iskaznice pri opozivu).
    /// SPEC: K10, K11, K47, K63
    function adminBurn(address account, uint256 amount) external;

    /// Poziva: vlasnik CWB, administrator (uključujući ugovor iskaznice pri oporavku).
    /// SPEC: K12, K13, K14, K15, K16, K42, K62, K65, K68
    function recoverPoints(address oldAddr, address newAddr) external;

    // ------------------------------------------------------------------
    // Administratori (zajednički popis za oba ugovora)
    // ------------------------------------------------------------------

    /// Poziva: bilo tko.
    /// SPEC: K17, K20, K54
    function isAdmin(address account) external view returns (bool);

    /// Poziva: samo vlasnik CWB.
    /// SPEC: K17, K18, K19, K29, K54
    function addAdmin(address account) external;

    /// Poziva: samo vlasnik CWB.
    /// SPEC: K20, K21
    function removeAdmin(address account) external;

    // ------------------------------------------------------------------
    // Vlasništvo (vlastito za ovaj ugovor)
    // ------------------------------------------------------------------

    /// Poziva: bilo tko.
    /// SPEC: K22, K23, K23a, K23b, K27, K28, K60
    function owner() external view returns (address);

    /// Poziva: bilo tko.
    /// SPEC: K23, K23a, K24, K27
    function backupOwner() external view returns (address);

    /// Poziva: bilo tko.
    /// SPEC: K27, K28, K29, K60
    function lastOwnerActivity() external view returns (uint256);

    /// Poziva: samo vlasnik CWB.
    /// SPEC: K22, K23
    function transferOwnership(address newOwner) external;

    /// Poziva: samo vlasnik CWB.
    /// SPEC: K23a, K23b
    function renounceOwnership() external;

    /// Poziva: samo vlasnik CWB.
    /// SPEC: K24, K25, K26, K56
    function setBackupOwner(address account) external;

    /// Poziva: samo rezervni vlasnik ovog ugovora (nakon 180 dana neaktivnosti vlasnika).
    /// SPEC: K27, K28, K29, K30, K60
    function claimOwnership() external;
}

/// @title Sučelje ugovora ClanskaIskaznica (ERC-721)
/// @notice Neprenosiva članska iskaznica (najviše jedna po adresi) s datumom isteka.
/// @dev Događaji: samo standardni ERC-721 `Transfer`, `Approval` i `ApprovalForAll`
///      (naslijeđeni iz IERC721). Administratori se čitaju iz ICoworkingToken.isAdmin.
///      name() i symbol() se ne definiraju (nisu u specifikaciji).
interface ICoworkingModul is IERC721 {
    // ------------------------------------------------------------------
    // ERC-721 čitanje
    // ------------------------------------------------------------------

    /// Poziva: bilo tko. true za ERC-721 i ERC-165.
    /// SPEC: K73
    function supportsInterface(bytes4 interfaceId) external view override returns (bool);

    /// Poziva: bilo tko. Broj iskaznica adrese (0 ili 1).
    /// SPEC: K72
    function balanceOf(address account) external view override returns (uint256);

    /// Poziva: bilo tko. Pada ako iskaznica ne postoji (standard ERC-721).
    /// SPEC: K31, K41, K42, K43, K66
    function ownerOf(uint256 tokenId) external view override returns (address);

    /// Poziva: bilo tko. Uvijek nulta adresa jer su odobrenja zabranjena.
    /// SPEC: K69
    function getApproved(uint256 tokenId) external view override returns (address);

    /// Poziva: bilo tko. Uvijek false jer su odobrenja zabranjena.
    /// SPEC: K69
    function isApprovedForAll(address holder, address operator) external view override returns (bool);

    /// Poziva: bilo tko. Vraća točno data:application/json,{"tokenId":"<id>"}.
    /// SPEC: K50
    function tokenURI(uint256 tokenId) external view returns (string memory);

    // ------------------------------------------------------------------
    // ERC-721 prijenos i odobrenja (uvijek padaju: "Iskaznica nije prenosiva")
    // ------------------------------------------------------------------

    /// Poziva: nitko.
    /// SPEC: K41
    function transferFrom(address from, address to, uint256 tokenId) external override;

    /// Poziva: nitko.
    /// SPEC: K41
    function safeTransferFrom(address from, address to, uint256 tokenId) external override;

    /// Poziva: nitko.
    /// SPEC: K41
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external override;

    /// Poziva: nitko.
    /// SPEC: K69
    function approve(address to, uint256 tokenId) external override;

    /// Poziva: nitko.
    /// SPEC: K69
    function setApprovalForAll(address operator, bool approved) external override;

    // ------------------------------------------------------------------
    // Iskaznice
    // ------------------------------------------------------------------

    /// Poziva: vlasnik iskaznice, administrator. Vraća novi tokenId.
    /// SPEC: K17, K20, K31, K32, K33, K34, K49, K52, K59, K70
    function issue(address to, uint256 expiresAt_) external returns (uint256 tokenId);

    /// Poziva: vlasnik iskaznice, administrator.
    /// SPEC: K29, K37, K38, K39, K40
    function extend(uint256 tokenId, uint256 newExpiresAt) external;

    /// Poziva: bilo tko. true ako iskaznica postoji i block.timestamp <= expiresAt.
    /// SPEC: K35, K36, K37, K47, K61, K66
    function isValid(uint256 tokenId) external view returns (bool);

    /// Poziva: vlasnik iskaznice, administrator.
    /// SPEC: K42, K43, K44, K45, K46, K51, K62, K72
    function recover(address oldAddr, address newAddr) external;

    /// Poziva: samo vlasnik iskaznice.
    /// SPEC: K47, K48, K49, K55, K63
    function revoke(uint256 tokenId) external;

    /// Poziva: bilo tko. Datum isteka (Unix vrijeme).
    /// SPEC: K31, K37, K42
    function expiresAt(uint256 tokenId) external view returns (uint256);

    /// Poziva: bilo tko. tokenId iskaznice adrese, 0 ako je nema.
    /// SPEC: K59
    function cardOf(address account) external view returns (uint256);

    /// Poziva: bilo tko. tokenId koji će dobiti sljedeća izdana iskaznica (na početku 1).
    /// SPEC: K59, K70
    function nextTokenId() external view returns (uint256);

    /// Poziva: bilo tko. Adresa ugovora CoworkingBodovi.
    /// SPEC: K71
    function points() external view returns (address);

    // ------------------------------------------------------------------
    // Vlasništvo (vlastito za ovaj ugovor)
    // ------------------------------------------------------------------

    /// Poziva: bilo tko.
    /// SPEC: K22, K23, K23a, K23b, K27, K28, K60
    function owner() external view returns (address);

    /// Poziva: bilo tko.
    /// SPEC: K23, K23a, K24, K27
    function backupOwner() external view returns (address);

    /// Poziva: bilo tko.
    /// SPEC: K27, K28, K29, K60
    function lastOwnerActivity() external view returns (uint256);

    /// Poziva: samo vlasnik iskaznice.
    /// SPEC: K22, K23
    function transferOwnership(address newOwner) external;

    /// Poziva: samo vlasnik iskaznice.
    /// SPEC: K23a, K23b
    function renounceOwnership() external;

    /// Poziva: samo vlasnik iskaznice.
    /// SPEC: K24, K25, K26
    function setBackupOwner(address account) external;

    /// Poziva: samo rezervni vlasnik ovog ugovora (nakon 180 dana neaktivnosti vlasnika).
    /// SPEC: K27, K28, K29, K30, K60
    function claimOwnership() external;
}
