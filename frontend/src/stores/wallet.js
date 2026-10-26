import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { BrowserProvider, formatEther, getAddress, parseEther } from 'ethers'

export const SEPOLIA_CHAIN_ID = 11155111n
const SEPOLIA_HEX = '0xaa36a7'
export const EXPLORER_URL = 'https://sepolia.etherscan.io'

// Provider se drži izvan reaktivnog stanja (Vue proxy smeta ethers objektima).
// 'any' dopušta promjenu mreže bez rušenja providera.
let provider = null
function getProvider() {
  if (!provider) provider = new BrowserProvider(window.ethereum, 'any')
  return provider
}

function isRejected(e) {
  return e?.code === 'ACTION_REJECTED' || e?.code === 4001 || e?.info?.error?.code === 4001
}

function isInsufficientFunds(e) {
  return e?.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(e?.message ?? '')
}

// Povijest se čuva u localStorageu ovog preglednika; bigint vrijednosti spremaju se kao stringovi.
const HISTORY_KEY = 'sepolia-tx-history'

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? []
  } catch {
    return []
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  } catch {
    // localStorage nedostupan (privatni prozor i sl.) — povijest ostaje samo u memoriji.
  }
}

// Izvlači podatke iz receipta koje želimo trajno zapisati.
function receiptFields(receipt) {
  const gasPrice = receipt.gasPrice ?? 0n
  return {
    status: receipt.status === 1 ? 'confirmed' : 'failed',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: gasPrice.toString(),
    fee: (receipt.gasUsed * gasPrice).toString(),
  }
}

function errorMessage(e) {
  if (isRejected(e)) return 'Zahtjev je odbijen u MetaMasku.'
  if (isInsufficientFunds(e)) return 'Nedovoljno sredstava za iznos i naknadu.'
  return e?.shortMessage || e?.message || 'Nepoznata greška.'
}

export const useWalletStore = defineStore('wallet', () => {
  const hasMetaMask = ref(false)
  const account = ref(null)
  const chainId = ref(null)
  const balance = ref(null) // bigint, u weiju
  const connecting = ref(false)
  const error = ref('')

  // status: idle | awaiting | pending | confirmed | failed
  const tx = ref({ status: 'idle', hash: null, message: '' })

  // Povijest svih transakcija poslanih iz aplikacije (najnovije prve).
  const history = ref(loadHistory())
  const accountHistory = computed(() =>
    history.value.filter((h) => h.from === account.value),
  )

  function addHistory(entry) {
    history.value = [entry, ...history.value.filter((h) => h.hash !== entry.hash)]
    saveHistory(history.value)
  }

  function updateHistory(hash, fields) {
    history.value = history.value.map((h) => (h.hash === hash ? { ...h, ...fields } : h))
    saveHistory(history.value)
  }

  function clearHistory() {
    history.value = history.value.filter((h) => h.from !== account.value)
    saveHistory(history.value)
  }

  // Za transakcije koje su ostale "pending" (npr. stranica zatvorena prije potvrde)
  // ponovno dohvaća receipt s mreže.
  async function syncPendingHistory() {
    if (!isSepolia.value) return
    const pending = history.value.filter((h) => h.status === 'pending')
    for (const h of pending) {
      try {
        const receipt = await getProvider().getTransactionReceipt(h.hash)
        if (receipt) updateHistory(h.hash, receiptFields(receipt))
      } catch {
        // Pokušat će se ponovno pri sljedećem učitavanju ili promjeni mreže.
      }
    }
  }

  const isSepolia = computed(() => chainId.value === SEPOLIA_CHAIN_ID)
  const busy = computed(() => tx.value.status === 'awaiting' || tx.value.status === 'pending')
  const balanceEth = computed(() => (balance.value === null ? null : formatEther(balance.value)))

  let initialized = false
  function init() {
    if (initialized) return
    initialized = true
    hasMetaMask.value = typeof window !== 'undefined' && !!window.ethereum
    if (!hasMetaMask.value) return

    window.ethereum.on('accountsChanged', (accounts) => {
      account.value = accounts.length ? getAddress(accounts[0]) : null
      balance.value = null
      refreshBalance()
    })
    window.ethereum.on('chainChanged', (hexId) => {
      chainId.value = BigInt(hexId)
      balance.value = null
      refreshBalance()
      syncPendingHistory()
    })

    // Tiho vrati prethodno odobrenu vezu, bez skočnog prozora.
    window.ethereum
      .request({ method: 'eth_accounts' })
      .then(async (accounts) => {
        if (accounts.length) {
          account.value = getAddress(accounts[0])
          await loadChain()
          await refreshBalance()
          await syncPendingHistory()
        }
      })
      .catch(() => {})
  }

  async function loadChain() {
    const hexId = await window.ethereum.request({ method: 'eth_chainId' })
    chainId.value = BigInt(hexId)
  }

  async function connect() {
    error.value = ''
    if (!hasMetaMask.value) {
      error.value = 'MetaMask nije instaliran.'
      return
    }
    connecting.value = true
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      account.value = accounts.length ? getAddress(accounts[0]) : null
      await loadChain()
      await refreshBalance()
      await syncPendingHistory()
    } catch (e) {
      error.value = e?.code === -32002
        ? 'Zahtjev je već otvoren u MetaMasku — otvori proširenje.'
        : errorMessage(e)
    } finally {
      connecting.value = false
    }
  }

  async function switchToSepolia() {
    error.value = ''
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_HEX }],
      })
    } catch (e) {
      if (e?.code === 4902) {
        // Mreža nije dodana u MetaMask — korisnik je potvrđuje.
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_HEX,
              chainName: 'Sepolia',
              nativeCurrency: { name: 'Sepolia Ether', symbol: 'SepoliaETH', decimals: 18 },
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
              blockExplorerUrls: [EXPLORER_URL],
            }],
          })
        } catch (e2) {
          error.value = errorMessage(e2)
        }
      } else {
        error.value = errorMessage(e)
      }
    }
  }

  async function refreshBalance() {
    if (!account.value || !isSepolia.value) return
    const requestedFor = account.value
    try {
      const value = await getProvider().getBalance(requestedFor)
      // Odbaci zakašnjeli odgovor ako se račun ili mreža u međuvremenu promijenili.
      if (account.value === requestedFor && isSepolia.value) balance.value = value
    } catch (e) {
      error.value = 'Dohvat stanja nije uspio: ' + errorMessage(e)
    }
  }

  // Sinkrona provjera unosa. Vraća poruku greške ili '' ako je ispravno.
  function validateInput(to, amountText) {
    const addr = (to ?? '').trim()
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return 'Adresa mora biti oblika 0x + 40 heksadekadskih znakova.'
    try {
      getAddress(addr)
    } catch {
      return 'Neispravan checksum adrese (provjeri velika/mala slova).'
    }
    let value
    try {
      value = parseEther((amountText ?? '').trim().replace(',', '.'))
    } catch {
      return 'Iznos nije ispravan broj (najviše 18 decimala).'
    }
    if (value <= 0n) return 'Iznos mora biti veći od nule.'
    if (balance.value !== null && value > balance.value) return 'Iznos je veći od raspoloživog stanja.'
    return ''
  }

  // Procjena naknade za konkretan prijenos; vraća sve što treba za pregled i slanje.
  async function prepareTransfer(to, amountText) {
    const recipient = getAddress(to.trim())
    const value = parseEther(amountText.trim().replace(',', '.'))
    const p = getProvider()
    const [gasLimit, feeData, currentBalance] = await Promise.all([
      p.estimateGas({ from: account.value, to: recipient, value }),
      p.getFeeData(),
      p.getBalance(account.value),
    ])
    balance.value = currentBalance
    const pricePerGas = feeData.maxFeePerGas ?? feeData.gasPrice
    const fee = gasLimit * pricePerGas
    return {
      to: recipient,
      value,
      gasLimit,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      gasPrice: feeData.maxFeePerGas ? null : feeData.gasPrice,
      fee,
      total: value + fee,
      enough: value + fee <= currentBalance,
    }
  }

  async function sendTransfer(prepared) {
    if (busy.value) return
    if (!isSepolia.value) {
      tx.value = { status: 'failed', hash: null, message: 'Slanje je dopušteno samo na mreži Sepolia.' }
      return
    }
    tx.value = { status: 'awaiting', hash: null, message: 'Potvrdi transakciju u MetaMasku…' }
    try {
      const signer = await getProvider().getSigner()
      const request = { to: prepared.to, value: prepared.value, gasLimit: prepared.gasLimit }
      if (prepared.maxFeePerGas) {
        request.maxFeePerGas = prepared.maxFeePerGas
        request.maxPriorityFeePerGas = prepared.maxPriorityFeePerGas
      } else if (prepared.gasPrice) {
        request.gasPrice = prepared.gasPrice
      }
      const sent = await signer.sendTransaction(request)
      tx.value = { status: 'pending', hash: sent.hash, message: 'Transakcija je poslana, čeka se potvrda u bloku…' }
      addHistory({
        hash: sent.hash,
        from: getAddress(sent.from),
        to: prepared.to,
        value: prepared.value.toString(),
        sentAt: new Date().toISOString(),
        status: 'pending',
      })

      try {
        const receipt = await sent.wait()
        if (receipt) updateHistory(sent.hash, receiptFields(receipt))
        tx.value = receipt?.status === 1
          ? { status: 'confirmed', hash: receipt.hash, message: `Potvrđeno u bloku ${receipt.blockNumber}.` }
          : { status: 'failed', hash: sent.hash, message: 'Transakcija nije uspjela.' }
      } catch (e) {
        // Korisnik je u MetaMasku ubrzao ili otkazao transakciju.
        if (e?.code === 'TRANSACTION_REPLACED') {
          updateHistory(sent.hash, { status: 'replaced', replacedBy: e.replacement?.hash ?? null })
          if (e.replacement && e.receipt) {
            addHistory({
              hash: e.replacement.hash,
              from: getAddress(e.replacement.from),
              to: e.replacement.to,
              value: e.replacement.value.toString(),
              sentAt: new Date().toISOString(),
              ...receiptFields(e.receipt),
            })
          }
          const ok = e.reason === 'repriced' && e.receipt?.status === 1
          tx.value = ok
            ? { status: 'confirmed', hash: e.replacement.hash, message: 'Potvrđeno (transakcija je ubrzana).' }
            : { status: 'failed', hash: e.replacement?.hash ?? sent.hash, message: 'Transakcija je otkazana ili zamijenjena.' }
        } else {
          if (e?.receipt) updateHistory(sent.hash, receiptFields(e.receipt))
          tx.value = { status: 'failed', hash: sent.hash, message: errorMessage(e) }
        }
      }
    } catch (e) {
      tx.value = { status: 'failed', hash: null, message: errorMessage(e) }
    } finally {
      await refreshBalance()
    }
  }

  function resetTx() {
    if (!busy.value) tx.value = { status: 'idle', hash: null, message: '' }
  }

  return {
    hasMetaMask, account, chainId, balance, balanceEth, connecting, error, tx,
    isSepolia, busy, history, accountHistory, clearHistory, syncPendingHistory,
    init, connect, switchToSepolia, refreshBalance,
    validateInput, prepareTransfer, sendTransfer, resetTx,
  }
})
