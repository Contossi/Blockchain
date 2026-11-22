// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICoworkingToken} from "./ICoworking.sol";

/// @title CoworkingBodovi (CWB)
/// @notice ERC-20 token zajednice: 0 decimala, bez transferFrom i approve,
///         zajednički popis administratora i rezervni vlasnik (docs/SPEC.md).
contract CoworkingBodovi is ERC20, Ownable, ICoworkingToken {
    /// Razdoblje neaktivnosti vlasnika nakon kojeg rezervni vlasnik smije preuzeti vlasništvo.
    uint256 private constant INACTIVITY_PERIOD = 180 days; // 15 552 000 s

    /// Gubitak pri oporavku bodova, u postocima.
    uint256 private constant RECOVERY_LOSS_PERCENT = 30;

    /// @inheritdoc ICoworkingToken
    mapping(address => bool) public isAdmin;

    /// @inheritdoc ICoworkingToken
    address public backupOwner;

    /// @inheritdoc ICoworkingToken
    uint256 public lastOwnerActivity;

    constructor() ERC20("Coworking Bodovi", "CWB") Ownable(msg.sender) {
        lastOwnerActivity = block.timestamp;
    }

    // ------------------------------------------------------------------
    // Modifikatori
    // ------------------------------------------------------------------

    /// Svaka uspješna transakcija vlasnika postavlja vrijeme zadnje aktivnosti.
    /// Ako transakcija padne, promjena se poništava zajedno s njom.
    modifier recordsOwnerActivity() {
        if (msg.sender == owner()) {
            lastOwnerActivity = block.timestamp;
        }
        _;
    }

    modifier onlyOwnerOrAdmin() {
         require(msg.sender == owner() || isAdmin[msg.sender], "Samo vlasnik ili administrator");
        _;
    }

    // ------------------------------------------------------------------
    // ERC-20 čitanje
    // ------------------------------------------------------------------

    function name() public view override(ERC20, ICoworkingToken) returns (string memory) {
        return super.name();
    }

    function symbol() public view override(ERC20, ICoworkingToken) returns (string memory) {
        return super.symbol();
    }

    /// Samo cijeli bodovi.
    function decimals() public pure override(ERC20, ICoworkingToken) returns (uint8) {
        return 0;
    }

    function totalSupply() public view override(ERC20, ICoworkingToken) returns (uint256) {
        return super.totalSupply();
    }

    function balanceOf(address account) public view override(ERC20, ICoworkingToken) returns (uint256) {
        return super.balanceOf(account);
    }

    /// Uvijek 0 jer approve nikad ne uspijeva.
    function allowance(address holder, address spender)
        public
        view
        override(ERC20, ICoworkingToken)
        returns (uint256)
    {
        return super.allowance(holder, spender);
    }

    // ------------------------------------------------------------------
    // ERC-20 prijenos
    // ------------------------------------------------------------------

    function transfer(address to, uint256 amount)
        public
        override(ERC20, ICoworkingToken)
        recordsOwnerActivity
        returns (bool)
    {
        require(to != address(0), "Neispravna adresa");
        require(balanceOf(msg.sender) >= amount, "Nedovoljno bodova");
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address, address, uint256) public pure override(ERC20, ICoworkingToken) returns (bool) {
        revert("transferFrom nije dozvoljen");
    }

    function approve(address, uint256) public pure override(ERC20, ICoworkingToken) returns (bool) {
        revert("approve nije dozvoljen");
    }

    // ------------------------------------------------------------------
    // Izdavanje, spaljivanje i oporavak bodova
    // ------------------------------------------------------------------

    function mint(address to, uint256 amount) external onlyOwnerOrAdmin recordsOwnerActivity {
        require(to != address(0), "Neispravna adresa");
        require(amount > 0, "Iznos mora biti veci od 0");
        _mint(to, amount);
    }

    function burn(uint256 amount) external recordsOwnerActivity {
        require(amount > 0, "Iznos mora biti veci od 0");
        require(balanceOf(msg.sender) >= amount, "Nedovoljno bodova");
        _burn(msg.sender, amount);
    }

    function adminBurn(address account, uint256 amount) external onlyOwnerOrAdmin recordsOwnerActivity {
        require(amount > 0, "Iznos mora biti veci od 0");
        require(balanceOf(account) >= amount, "Nedovoljno bodova");
        _burn(account, amount);
    }

    function recoverPoints(address oldAddr, address newAddr) external onlyOwnerOrAdmin recordsOwnerActivity {
        require(newAddr != address(0), "Neispravna adresa");
        require(oldAddr != newAddr, "Adrese moraju biti razlicite");
        require(balanceOf(newAddr) == 0, "Nova adresa mora biti prazna");
        uint256 balance = balanceOf(oldAddr);
        require(balance > 0, "Nema bodova za premjestanje");

        uint256 loss = (balance * RECOVERY_LOSS_PERCENT) / 100; // floor
        if (loss > 0) {
            _burn(oldAddr, loss);
        }
        _transfer(oldAddr, newAddr, balance - loss);
    }

    // ------------------------------------------------------------------
    // Administratori
    // ------------------------------------------------------------------

    function addAdmin(address account) external onlyOwner recordsOwnerActivity {
        require(account != address(0), "Neispravna adresa");
        require(!isAdmin[account], "Adresa je vec administrator");
        isAdmin[account] = true;
    }

    function removeAdmin(address account) external onlyOwner recordsOwnerActivity {
        require(isAdmin[account], "Adresa nije administrator");
        isAdmin[account] = false;
    }

    // ------------------------------------------------------------------
    // Vlasništvo
    // ------------------------------------------------------------------

    function owner() public view override(Ownable, ICoworkingToken) returns (address) {
        return super.owner();
    }

    function transferOwnership(address newOwner) public override(Ownable, ICoworkingToken) onlyOwner {
        require(newOwner != address(0), "Neispravna adresa");
        backupOwner = address(0);
        lastOwnerActivity = block.timestamp;
        _transferOwnership(newOwner);
    }

    function renounceOwnership() public override(Ownable, ICoworkingToken) onlyOwner {
        backupOwner = address(0);
        _transferOwnership(address(0));
    }

    function setBackupOwner(address account) external onlyOwner recordsOwnerActivity {
        require(account != address(0), "Neispravna adresa");
        require(account != owner(), "Rezervni vlasnik ne moze biti vlasnik");
        backupOwner = account;
    }

    function claimOwnership() external {
        require(msg.sender == backupOwner, "Samo rezervni vlasnik");
        require(block.timestamp >= lastOwnerActivity + INACTIVITY_PERIOD, "Vlasnik nije neaktivan 180 dana");
        backupOwner = address(0);
        lastOwnerActivity = block.timestamp;
        _transferOwnership(msg.sender);
    }

    /// Poruka pada umjesto OpenZeppelinove custom greške.
    function _checkOwner() internal view override {
        require(owner() == msg.sender, "Samo vlasnik");
    }
}
