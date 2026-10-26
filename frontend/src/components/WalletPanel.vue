<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { formatEther } from 'ethers'
import { useWalletStore, EXPLORER_URL } from '../stores/wallet'

const wallet = useWalletStore()

const recipient = ref('')
const amount = ref('')
const formError = ref('')
const preparing = ref(false)
const review = ref(null) // pripremljeni prijenos za pregled prije slanja

const statusLabels = {
  awaiting: 'Čeka potvrdu korisnika',
  pending: 'Poslana',
  confirmed: 'Potvrđena',
  failed: 'Neuspjela',
}

const canEdit = computed(() => wallet.account && wallet.isSepolia && !wallet.busy && !preparing.value)

onMounted(() => wallet.init())

// Promjena računa ili mreže poništava pregled — naknada i stanje više ne vrijede.
watch(() => [wallet.account, wallet.chainId], () => {
  review.value = null
  formError.value = ''
})

// Svaka izmjena obrasca traži novi pregled.
watch([recipient, amount], () => {
  review.value = null
})

async function onReview() {
  formError.value = ''
  wallet.resetTx()
  const err = wallet.validateInput(recipient.value, amount.value)
  if (err) {
    formError.value = err
    return
  }
  preparing.value = true
  try {
    const prepared = await wallet.prepareTransfer(recipient.value, amount.value)
    if (!prepared.enough) {
      formError.value = `Nedovoljno sredstava: potrebno ${formatEther(prepared.total)} SepoliaETH (iznos + naknada).`
      return
    }
    review.value = prepared
  } catch (e) {
    formError.value = 'Procjena naknade nije uspjela: ' + (e?.shortMessage || e?.message)
  } finally {
    preparing.value = false
  }
}

async function onConfirm() {
  const prepared = review.value
  review.value = null
  await wallet.sendTransfer(prepared)
  if (wallet.tx.status === 'confirmed') {
    recipient.value = ''
    amount.value = ''
  }
}

const historyLabels = { ...statusLabels, pending: 'Čeka potvrdu u bloku', replaced: 'Zamijenjena' }

function onClearHistory() {
  if (confirm('Obrisati povijest transakcija za ovaj račun? (Transakcije ostaju na blockchainu.)')) {
    wallet.clearHistory()
  }
}

function short(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}
</script>

<template>
  <section class="wallet">
    <div class="card">
      <header class="card-head">
        <h2>Novčanik</h2>
        <span v-if="wallet.account" class="badge" :class="wallet.isSepolia ? 'ok' : 'warn'">
          <span class="dot"></span>{{ wallet.isSepolia ? 'Sepolia' : 'Kriva mreža' }}
        </span>
      </header>

      <div v-if="!wallet.hasMetaMask" class="notice error">
        MetaMask nije instaliran.
        <a href="https://metamask.io/download/" target="_blank" rel="noopener">Instaliraj MetaMask</a>
        pa osvježi stranicu.
      </div>

      <template v-else>
        <div v-if="!wallet.account" class="connect">
          <p class="muted">Poveži MetaMask za slanje testnog SepoliaETH-a kolegama.</p>
          <button class="primary" :disabled="wallet.connecting" @click="wallet.connect">
            {{ wallet.connecting ? 'Povezivanje…' : 'Poveži MetaMask' }}
          </button>
        </div>

        <div v-else class="account">
          <div class="balance">
            <span class="label">Stanje</span>
            <span class="amount">
              {{ wallet.isSepolia ? (wallet.balanceEth ?? '…') : '—' }}
              <small>SepoliaETH</small>
            </span>
          </div>
          <div class="account-row">
            <code class="chip" :title="wallet.account">{{ short(wallet.account) }}</code>
            <button v-if="wallet.isSepolia" class="ghost" :disabled="wallet.busy" @click="wallet.refreshBalance">
              ↻ Osvježi
            </button>
          </div>

          <div v-if="!wallet.isSepolia" class="notice warn">
            <span>Nisi na mreži Sepolia. Slanje je onemogućeno.</span>
            <button class="primary" @click="wallet.switchToSepolia">Prebaci na Sepoliu</button>
          </div>
        </div>

        <p v-if="wallet.error" class="notice error">{{ wallet.error }}</p>
      </template>
    </div>

    <form v-if="wallet.hasMetaMask && wallet.account" class="card" @submit.prevent="onReview">
      <h3>Pošalji SepoliaETH</h3>
      <label>
        <span class="label">Adresa primatelja</span>
        <input v-model="recipient" class="mono" placeholder="0x…" autocomplete="off" spellcheck="false" :disabled="!canEdit" />
      </label>
      <label>
        <span class="label">Iznos (SepoliaETH)</span>
        <input v-model="amount" inputmode="decimal" placeholder="0.01" autocomplete="off" :disabled="!canEdit" />
      </label>
      <p v-if="formError" class="notice error">{{ formError }}</p>
      <button type="submit" class="primary wide" :disabled="!canEdit || !!review">
        {{ preparing ? 'Procjena naknade…' : 'Pregledaj' }}
      </button>
    </form>

    <div v-if="review" class="card review">
      <h3>Pregled transakcije</h3>
      <dl>
        <dt>Primatelj</dt><dd><code>{{ review.to }}</code></dd>
        <dt>Iznos</dt><dd>{{ formatEther(review.value) }} SepoliaETH</dd>
        <dt>Najveća naknada (proc.)</dt><dd>{{ formatEther(review.fee) }} SepoliaETH</dd>
        <dt class="total">Ukupno najviše</dt><dd class="total">{{ formatEther(review.total) }} SepoliaETH</dd>
      </dl>
      <div class="actions">
        <button class="secondary" @click="review = null">Odustani</button>
        <button class="primary" :disabled="!wallet.isSepolia || wallet.busy" @click="onConfirm">
          Potvrdi i pošalji u MetaMasku
        </button>
      </div>
    </div>

    <div v-if="wallet.tx.status !== 'idle'" class="card status" :class="wallet.tx.status">
      <span class="badge" :class="wallet.tx.status">
        <span class="dot"></span>{{ statusLabels[wallet.tx.status] }}
      </span>
      <p>{{ wallet.tx.message }}</p>
      <a v-if="wallet.tx.hash" :href="`${EXPLORER_URL}/tx/${wallet.tx.hash}`" target="_blank" rel="noopener">
        Pogledaj transakciju na Sepolia Etherscanu ↗
      </a>
    </div>

    <div v-if="wallet.account && wallet.accountHistory.length" class="card history">
      <header class="card-head">
        <h3>Povijest transakcija</h3>
        <div class="actions">
          <button class="ghost" :disabled="!wallet.isSepolia" @click="wallet.syncPendingHistory">Provjeri čekajuće</button>
          <button class="ghost danger" :disabled="wallet.busy" @click="onClearHistory">Obriši</button>
        </div>
      </header>
      <ul>
        <li v-for="h in wallet.accountHistory" :key="h.hash">
          <div class="row">
            <span class="badge" :class="h.status"><span class="dot"></span>{{ historyLabels[h.status] }}</span>
            <span class="muted small">{{ new Date(h.sentAt).toLocaleString() }}</span>
          </div>
          <div class="row">
            <strong>{{ formatEther(BigInt(h.value)) }} SepoliaETH</strong>
            <span class="muted">→ <code :title="h.to">{{ short(h.to) }}</code></span>
          </div>
          <div v-if="h.blockNumber" class="muted small">
            Blok {{ h.blockNumber }} · gas {{ h.gasUsed }} · naknada {{ formatEther(BigInt(h.fee)) }} SepoliaETH
          </div>
          <a class="small" :href="`${EXPLORER_URL}/tx/${h.hash}`" target="_blank" rel="noopener">
            {{ short(h.hash) }} na Etherscanu ↗
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
