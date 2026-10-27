<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import FridgeIcon from "../components/FridgeIcon.vue";
import { parseShoppingList, reconcileShoppingLines, SHOPPING_STORAGE_KEY } from "../utils/shopping";

const text = ref("");
const items = ref([]);
const editing = ref(false);
const errorMessage = ref("");
const loadFailed = ref(false);
const editor = ref(null);
const confirmation = ref(null);
const completed = computed(() => items.value.filter((item) => item.done).length);

function persist() {
  try {
    window.localStorage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify({ text: text.value, items: items.value }));
    errorMessage.value = "";
  } catch {
    errorMessage.value = "La liste n’a pas pu être enregistrée sur cet appareil. Gardez cette page ouverte pour ne pas la perdre.";
  }
}

function updateText(value) {
  text.value = value;
  items.value = reconcileShoppingLines(value, items.value);
  persist();
}

function toggleItem(index) {
  items.value[index].done = !items.value[index].done;
  persist();
}

async function editList() {
  editing.value = true;
  await nextTick();
  editor.value?.focus();
}

function clearList() {
  text.value = "";
  items.value = [];
  persist();
  confirmation.value.close();
  editList();
}

onMounted(() => {
  try {
    const stored = parseShoppingList(window.localStorage.getItem(SHOPPING_STORAGE_KEY));
    text.value = stored.text;
    items.value = stored.items;
    editing.value = items.value.length === 0;
  } catch {
    loadFailed.value = true;
    errorMessage.value = "Impossible de lire la liste enregistrée. Les données existantes sont conservées ; rechargez la page pour réessayer.";
  }
});
</script>

<template>
  <section class="panel panel--memo" aria-labelledby="shopping-title">
    <div class="memo-card shopping-card">
      <div class="shopping-heading">
        <h2 id="shopping-title"><FridgeIcon /> Késkon mange ?</h2>
        <button class="icon-button shopping-clear" type="button" title="Vider la liste" aria-label="Vider la liste de courses" :disabled="loadFailed || !text" @click="confirmation.showModal()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
          </svg>
        </button>
      </div>
      <p class="hint">La liste de courses de Florette</p>
      <p class="status" role="status">Enregistrée sur ce navigateur, sur cet appareil.</p>
      <p v-if="errorMessage" class="status status--error" role="alert">{{ errorMessage }}</p>

      <template v-if="!loadFailed">
        <div v-if="editing">
          <label for="shopping-text">Un article par ligne</label>
          <textarea id="shopping-text" ref="editor" class="memo-textarea" :value="text" placeholder="Tomates&#10;Pain&#10;Lait" @input="updateText($event.target.value)" />
          <button class="primary-button" type="button" @click="editing = false">Terminer la liste</button>
        </div>
        <div v-else class="shopping-content">
          <p v-if="items.length" class="status" aria-live="polite">{{ completed }} / {{ items.length }} article{{ items.length > 1 ? 's' : '' }} coché{{ completed > 1 ? 's' : '' }}</p>
          <p v-else class="empty-state">La liste est vide. Ajoutez vos courses !</p>
          <ul class="shopping-list" aria-label="Liste de courses">
            <li v-for="(item, index) in items" :key="index">
              <label class="shopping-line" :class="{ 'shopping-line--done': item.done }">
                <input type="checkbox" :checked="item.done" @change="toggleItem(index)" />
                <span>{{ item.label }}</span>
                <small v-if="item.done">C’est fait !</small>
              </label>
            </li>
          </ul>
          <button class="ghost-link" type="button" @click="editList">Modifier la liste</button>
        </div>
      </template>

      <dialog ref="confirmation" class="shopping-confirm" aria-labelledby="shopping-confirm-title">
        <h2 id="shopping-confirm-title">Vider la liste ?</h2>
        <form method="dialog" class="shopping-confirm__actions">
          <button class="ghost-link" autofocus>Non</button>
          <button class="primary-button" type="button" @click="clearList">Oui</button>
        </form>
      </dialog>
    </div>
  </section>
</template>

<style scoped>
.shopping-heading, .shopping-heading h2, .shopping-nav, .shopping-confirm__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.shopping-heading { justify-content: space-between; margin-bottom: 16px; }
.shopping-heading h2 { margin: 0; font-family: var(--font-display); font-size: clamp(1.35rem, 4vw, 2rem); }
.fridge-icon { flex-shrink: 0; }
.shopping-clear { display: inline-flex; justify-content: center; align-items: center; min-width: 44px; min-height: 44px; padding: 10px; flex-shrink: 0; }
.shopping-clear:disabled { opacity: .4; cursor: default; }
.shopping-list { list-style: none; padding: 0; margin: 16px 0; display: grid; gap: 10px; }
.shopping-line { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 12px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel-bg); cursor: pointer; }
.shopping-line input { width: 21px; height: 21px; flex-shrink: 0; accent-color: var(--accent-strong); }
.shopping-line span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.shopping-line small { color: var(--accent-strong); }
.shopping-line--done span { text-decoration: line-through; color: var(--text-soft); }
.shopping-line:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.shopping-confirm { width: min(360px, calc(100% - 32px)); padding: 24px; border: 1px solid var(--panel-border); border-radius: 24px; background: var(--panel-bg); color: var(--text-main); box-shadow: var(--shadow); }
.shopping-confirm::backdrop { background: rgb(0 0 0 / 45%); }
.shopping-confirm h2 { margin: 0 0 24px; text-align: center; }
.shopping-confirm__actions { justify-content: center; }
.shopping-confirm__actions button { flex: 1; }
@media (max-width: 430px) {
  .shopping-heading { gap: 8px; }
  .shopping-line { flex-wrap: wrap; }
  .shopping-line small { margin-left: 33px; }
}
</style>
