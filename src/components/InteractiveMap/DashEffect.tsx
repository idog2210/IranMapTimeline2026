import { motion, AnimatePresence } from 'framer-motion';
import styles from './DashEffect.module.css';

interface Props {
  active: boolean;
  x: number;
  y: number;
}

const LINES = 12;

export function DashEffect({ active, x, y }: Props) {
  const lines = Array.from({ length: LINES }, (_, i) => {
    const angle = (360 / LINES) * i;
    const length = 60 + Math.random() * 80;
    const color = i % 3 === 0 ? '#c9a84c' : i % 3 === 1 ? '#ffffff' : '#ffdd66';
    return { angle, length, color, delay: Math.random() * 0.05 };
  });

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {active &&
          lines.map((line, i) => (
            <motion.div
              key={i}
              className={styles.line}
              style={{
                left: x,
                top: y,
                width: line.length,
                background: `linear-gradient(90deg, ${line.color}, transparent)`,
                rotate: `${line.angle}deg`,
              }}
              initial={{ opacity: 1, scaleX: 0, x: 0, y: 0 }}
              animate={{ opacity: 0, scaleX: 1, x: Math.cos((line.angle * Math.PI) / 180) * 120, y: Math.sin((line.angle * Math.PI) / 180) * 120 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: line.delay, ease: 'easeOut' }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
