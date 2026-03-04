import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>מפת המצב</h1>
      <p className={styles.subtitle}>איראן — ישראל</p>
    </header>
  );
}
