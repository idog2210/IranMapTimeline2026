import { motion } from 'framer-motion';
import styles from './USCard.module.css';

interface Props {
  onClick: (e: React.MouseEvent) => void;
}

export function USCard({ onClick }: Props) {
  return (
    <motion.button
      className={styles.card}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className={styles.flagIcon}>&#127482;&#127480;</div>
      <div className={styles.info}>
        <span className={styles.label}>כוחות ארה"ב</span>
        <span className={styles.sublabel}>US CENTCOM</span>
      </div>
      <div className={styles.statusDot} />
    </motion.button>
  );
}
