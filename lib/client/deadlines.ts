// "Mijn deadlines": alleen op dit toestel (localStorage), alleen als de gebruiker op "Bewaar" drukt.
// Er wordt geen foto en geen brieftekst bewaard: alleen afzender, wat, datum en bedrag.
export interface SavedDeadline {
  id: string;
  sender: string;
  what: string;
  date: string; // YYYY-MM-DD
  amount: string | null;
  savedAt: string;
}

const KEY = "briefhulp:deadlines";

export function loadDeadlines(): SavedDeadline[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedDeadline[]) : [];
    return Array.isArray(list) ? list.sort((a, b) => a.date.localeCompare(b.date)) : [];
  } catch {
    return [];
  }
}

function store(list: SavedDeadline[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* privémodus of vol: niet erg */
  }
}

export function saveDeadline(d: Omit<SavedDeadline, "id" | "savedAt">): SavedDeadline[] {
  const list = loadDeadlines().filter((x) => !(x.sender === d.sender && x.date === d.date));
  list.push({ ...d, id: Math.random().toString(36).slice(2), savedAt: new Date().toISOString() });
  store(list);
  return loadDeadlines();
}

export function removeDeadline(id: string): SavedDeadline[] {
  store(loadDeadlines().filter((x) => x.id !== id));
  return loadDeadlines();
}
