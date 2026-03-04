import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '../../hooks/useAppState';
import { countryNews } from '../../data/countryNews';
import { countryGeoConfigs, usConfig } from '../../data/countryGeoConfig';
import type { CountryNewsItem } from '../../types/country';
import styles from './HorizontalTimeline.module.css';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 * i + 0.3, duration: 0.5, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

export function HorizontalTimeline() {
  const { selectedCountry } = useAppState();
  const scrollRef = useRef<HTMLDivElement>(null);

  const events: CountryNewsItem[] = selectedCountry
    ? (countryNews[selectedCountry] ?? [])
    : [];

  const countryName = selectedCountry
    ? (countryGeoConfigs.find(c => c.key === selectedCountry)?.hebrewName ?? usConfig.hebrewName)
    : null;

  // Auto-scroll to start when country changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  }, [selectedCountry]);

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
  }, [selectedCountry]);

  if (!selectedCountry) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          בחר מדינה מהמפה לצפייה בציר הזמן
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          אין עדכונים עבור {countryName}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCountry}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.countryLabel}>{countryName}</div>
          <div className={styles.trackWrapper} ref={scrollRef}>
            <div className={styles.track}>
              <div className={styles.line}>
                <motion.div
                  className={styles.lineAccent}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' as const }}
                  style={{ width: '100%' }}
                />
              </div>
              {events.map((event, i) => (
                <motion.div
                  className={styles.eventCard}
                  key={`${selectedCountry}-${i}`}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className={styles.dot} />
                  <div className={styles.connector} />
                  <div className={styles.card}>
                    <span className={styles.time}>{event.time}</span>
                    <span className={styles.date}> · {event.date}</span>
                    <h3 className={styles.title}>{event.title}</h3>
                    <p className={styles.description}>{event.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
