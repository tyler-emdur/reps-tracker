'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

interface Item {
  id: string;
  name: string;
  category: string;
  image: string;
  price: string;
  url: string;
  savedAt: string;
}

type SortKey = 'newest' | 'oldest' | 'name' | 'price';

const ADMIN_PASSWORD = 'tyleriscool';

function buildAffiliateUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete('ref');
    u.searchParams.set('ref', '200934539');
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function formatPrice(price: string): string {
  if (!price) return '—';
  return price.replace(/¥/g, '$').replace(/CNY/gi, 'USD');
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsAdmin(localStorage.getItem('adminMode') === 'true');
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleLockClick = () => {
    if (isAdmin) {
      localStorage.removeItem('adminMode');
      setIsAdmin(false);
    } else {
      const pw = prompt('Enter admin password:');
      if (pw === ADMIN_PASSWORD) {
        localStorage.setItem('adminMode', 'true');
        setIsAdmin(true);
      }
    }
  };

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort()];

  const parsePrice = (p: string) => {
    const n = parseFloat((p ?? '').replace(/[^\d.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const filtered = items
    .filter((i) => selectedCategory === 'All' || i.category === selectedCategory)
    .filter((i) =>
      !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      if (sortBy === 'oldest') return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
      if (sortBy === 'price')  return parsePrice(a.price) - parsePrice(b.price);
      return (a.name ?? '').localeCompare(b.name ?? '');
    });

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch('/api/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const updateCategory = async (id: string, category: string) => {
    await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, category }),
    });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, category } : i));
  };

  return (
    <main className={styles.main}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Rep Tracker</h1>
          <div className={styles.stats}>
            <span className={styles.stat}>{items.length} items</span>
          </div>
          <button
            className={`${styles.lockBtn} ${isAdmin ? styles.lockBtnActive : ''}`}
            onClick={handleLockClick}
            title={isAdmin ? 'Exit admin mode' : 'Admin login'}
            aria-label={isAdmin ? 'Exit admin mode' : 'Admin login'}
          >
            {isAdmin ? '🔓' : '🔒'}
          </button>
        </div>

        <div className={styles.controls}>
          <input
            className={styles.search}
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="price">Price low–high</option>
          </select>
        </div>

        <div className={styles.catBar}>
          {categories.map((cat) => {
            const count = cat === 'All' ? items.length : items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                className={`${styles.catChip} ${selectedCategory === cat ? styles.catChipActive : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
                <span className={styles.catCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Body ── */}
      {loading ? (
        <div className={styles.loader}>
          <div className={styles.spinner} />
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {items.length === 0 ? (
            <>
              <div className={styles.emptyIcon}>📦</div>
              <p>No items saved yet.</p>
              <p className={styles.emptyHint}>
                Install the Chrome extension, browse to a mulebuy.com product page,<br />
                fill in the popup, and hit &ldquo;Save Item&rdquo;.
              </p>
            </>
          ) : (
            <p>No items match your filters.</p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.imgWrap}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.name}
                    className={styles.img}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className={styles.noImg}>No image</div>
                )}
                {isAdmin && (
                  <button
                    className={styles.delBtn}
                    onClick={() => deleteItem(item.id)}
                    disabled={deletingId === item.id}
                    title="Remove"
                    aria-label="Remove item"
                  >
                    {deletingId === item.id ? '…' : '×'}
                  </button>
                )}
              </div>

              <div className={styles.body}>
                {isAdmin ? (
                  <input
                    className={styles.categoryInput}
                    value={editingCategory[item.id] ?? item.category}
                    onChange={(e) =>
                      setEditingCategory((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    onBlur={async (e) => {
                      const val = e.target.value.trim() || 'Uncategorized';
                      await updateCategory(item.id, val);
                      setEditingCategory((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                  />
                ) : (
                  <span className={styles.categoryTag}>{item.category}</span>
                )}
                <p className={styles.name}>{item.name}</p>
                <div className={styles.footer}>
                  <span className={styles.price}>{formatPrice(item.price)}</span>
                  {item.url && (
                    <a
                      href={buildAffiliateUrl(item.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.buyBtn}
                    >
                      Buy
                    </a>
                  )}
                </div>
                <time className={styles.date}>
                  {new Date(item.savedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
