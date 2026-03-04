import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { countryNews } from '../../data/countryNews';
import { countryGeoConfigs, usConfig } from '../../data/countryGeoConfig';
import type { CountryKey, CountryNewsItem } from '../../types/country';
import styles from './TimelineModal.module.css';

interface Props {
  country: CountryKey | null;
  onClose: () => void;
}

export function TimelineModal({ country, onClose }: Props) {
  const events = country ? (countryNews[country] ?? []) : [];
  const countryName = country ? (countryGeoConfigs.find((c) => c.key === country)?.hebrewName ?? usConfig.hebrewName) : '';
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Detail popup state ────────────────────────────────────────────────
  const [selectedEvent, setSelectedEvent] = useState<CountryNewsItem | null>(null);

  // Reset detail when the country changes (modal closes / switches)
  useEffect(() => { setSelectedEvent(null); }, [country]);

  // ESC closes the detail FIRST (capture phase runs before InteractiveMap's bubble handler)
  useEffect(() => {
    if (!selectedEvent) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setSelectedEvent(null);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [selectedEvent]);

  // Mouse-wheel → horizontal scroll with RAF momentum (RTL: down = left)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let pending = 0;
    let rafId: number | null = null;
    const tick = () => {
      const step = pending * 0.18;
      if (Math.abs(step) < 0.5) { pending = 0; rafId = null; return; }
      el.scrollLeft += step;
      pending -= step;
      rafId = requestAnimationFrame(tick);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      pending += -e.deltaY * 1.2;
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [country]);

  // Auto-scroll to the rightmost (newest) event after the modal opens
  useEffect(() => {
    if (scrollRef.current && country) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
        }
      }, 500);
    }
  }, [country]);

  return (
    <AnimatePresence>
      {country && (
        <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={onClose}>
          <motion.div className={styles.modal} initial={{ opacity: 0, scale: 0.9, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 24 }} transition={{ duration: 0.35, ease: 'easeOut' as const }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerInfo}>
                <h2 className={styles.countryName}>{countryName}</h2>
                <span className={styles.badge}>{events.length} עדכונים · 03.03.2026</span>
              </div>
              <button className={styles.closeBtn} onClick={onClose} aria-label="סגור">
                ✕
              </button>
            </div>

            {/* Horizontal Timeline */}
            <div className={styles.scrollArea} ref={scrollRef}>
              {events.length === 0 ? (
                <div className={styles.emptyState}>אין עדכונים עבור {countryName}</div>
              ) : (
                <div className={styles.track}>
                  {/* Central horizontal line */}
                  <div className={styles.line}>
                    <motion.div className={styles.lineAccent} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' as const }} />
                  </div>

                  {events.map((event, idx) => {
                    const isAbove = idx % 2 === 0;
                    return (
                      <motion.div
                        key={`${country}-${idx}`}
                        className={`${styles.eventItem} ${isAbove ? styles.eventAbove : styles.eventBelow}`}
                        initial={{ opacity: 0, y: isAbove ? -14 : 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.08 * idx + 0.3,
                          duration: 0.4,
                          ease: 'easeOut' as const,
                        }}
                      >
                        <div
                          className={styles.dot}
                          onClick={() => setSelectedEvent(event)}
                        />
                        <div className={styles.connectorV} />
                        <div
                          className={styles.card}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className={styles.cardMeta}>
                            <span className={styles.time}>{event.time}</span>
                            <span className={styles.date}>{event.date}</span>
                          </div>
                          <h3 className={styles.title}>{event.title}</h3>
                          <p className={styles.desc}>{event.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Event Detail Popup ── */}
          <AnimatePresence>
            {selectedEvent && (
              <motion.div
                className={styles.detailBackdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => { e.stopPropagation(); setSelectedEvent(null); }}
              >
                <motion.div
                  className={styles.detailPopup}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={styles.detailClose}
                    onClick={() => setSelectedEvent(null)}
                    aria-label="סגור"
                  >
                    ✕
                  </button>

                  <div className={styles.detailMeta}>
                    <span className={styles.detailDate}>{selectedEvent.date}</span>
                    <span className={styles.detailSep}>|</span>
                    <span className={styles.detailTime}>{selectedEvent.time}</span>
                  </div>

                  <h2 className={styles.detailTitle}>{selectedEvent.title}</h2>
                  <p className={styles.detailDesc}>{selectedEvent.description}</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
