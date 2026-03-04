import { motion } from 'framer-motion';
import styles from './Hero.module.css';

interface Props {
  onEnter: () => void;
}

const containerVariants = {
  exit: {
    opacity: 0,
    scale: 1.05,
    filter: 'blur(10px)',
    transition: { duration: 0.8, ease: 'easeInOut' as const },
  },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' as const },
  },
};

export function Hero({ onEnter }: Props) {
  return (
    <motion.div
      className={styles.hero}
      onClick={onEnter}
      variants={containerVariants}
      exit="exit"
    >
      <div className={styles.gridBg} />
      <div className={styles.scanLine} />

      {/* Corner decorations */}
      <div className={`${styles.cornerDecor} ${styles.cornerTL}`} />
      <div className={`${styles.cornerDecor} ${styles.cornerTR}`} />
      <div className={`${styles.cornerDecor} ${styles.cornerBL}`} />
      <div className={`${styles.cornerDecor} ${styles.cornerBR}`} />

      <motion.div
        className={styles.content}
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        <motion.div className={styles.topLabel} variants={fadeUp}>
          SITUATION ROOM — LIVE BRIEFING
        </motion.div>

        <motion.div className={styles.dateBadge} variants={fadeUp}>
          04.03.2026 — עדכון מצב
        </motion.div>

        <motion.h1 className={styles.title} variants={fadeUp}>
          <span className={styles.titleAccent}>איראן</span> — ישראל
        </motion.h1>

        <motion.p className={styles.subtitle} variants={fadeUp}>
          ציר הזמן האינטראקטיבי של העימות
        </motion.p>

        <motion.div className={styles.enterHint} variants={fadeUp}>
          לחץ בכל מקום להמשך
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
