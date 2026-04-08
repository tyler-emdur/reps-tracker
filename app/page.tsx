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

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Derived state
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

  const totalValue = items.reduce((sum, i) => sum + parsePrice(i.price), 0).toFixed(2);

  return (
    <main className={styles.main}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Rep Tracker</h1>
          <div className={styles.stats}>
            <span className={styles.stat}>{items.length} items</span>
            {parseFloat(totalValue) > 0 && (
              <span className={styles.stat}>¥{totalValue} total</span>
            )}
          </div>
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
                <button
                  className={styles.delBtn}
                  onClick={() => deleteItem(item.id)}
                  disabled={deletingId === item.id}
                  title="Remove"
                  aria-label="Remove item"
                >
                  {deletingId === item.id ? '…' : '×'}
                </button>
              </div>

              <div className={styles.body}>
                <span className={styles.categoryTag}>{item.category}</span>
                <p className={styles.name}>{item.name}</p>
                <div className={styles.footer}>
                  <span className={styles.price}>{item.price || '—'}</span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      Buy →
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
