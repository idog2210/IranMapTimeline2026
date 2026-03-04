import { Line } from 'react-simple-maps';
import styles from './AttackVectors.module.css';

interface AttackVector {
  from: [number, number];
  to: [number, number];
  id: string;
}

const vectors: AttackVector[] = [
  { id: 'iran-israel-1', from: [51, 32.5], to: [35.2, 31.5] },
  { id: 'iran-israel-2', from: [48, 34], to: [35.5, 33] },
  { id: 'iran-israel-3', from: [50, 33], to: [35, 32.5] },
];

export function AttackVectors() {
  return (
    <g className={styles.vectorGroup}>
      {vectors.map((v) => (
        <g key={v.id}>
          <Line
            from={v.from}
            to={v.to}
            stroke="#cc3333"
            strokeWidth={3}
            strokeOpacity={0.08}
            className={styles.attackLineGlow}
          />
          <Line
            from={v.from}
            to={v.to}
            stroke="#cc3333"
            strokeWidth={1.2}
            strokeLinecap="round"
            className={styles.attackLine}
          />
        </g>
      ))}
    </g>
  );
}
