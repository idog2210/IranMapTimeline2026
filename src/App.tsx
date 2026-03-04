import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppStateContext, type ViewMode } from './hooks/useAppState';
import type { CountryKey } from './types/country';
import { InteractiveMap } from './components/InteractiveMap/InteractiveMap';
import { Header } from './components/UI/Header';
import { Hero } from './components/UI/Hero';
import styles from './App.module.css';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('hero');
  const [selectedCountry, setSelectedCountry] = useState<CountryKey | null>(null);

  const selectCountry = useCallback((key: CountryKey | null) => {
    setSelectedCountry(key);
  }, []);

  const handleEnterFromHero = useCallback(() => {
    setViewMode('main');
  }, []);

  const contextValue = useMemo(
    () => ({ viewMode, setViewMode, selectedCountry, selectCountry }),
    [viewMode, selectedCountry, selectCountry],
  );

  return (
    <AppStateContext.Provider value={contextValue}>
      <AnimatePresence>
        {viewMode === 'hero' && <Hero onEnter={handleEnterFromHero} />}
      </AnimatePresence>

      {viewMode === 'main' && (
        <motion.div
          className={styles.layout}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Header />
          <div className={styles.mapSection}>
            <InteractiveMap />
          </div>
        </motion.div>
      )}
    </AppStateContext.Provider>
  );
}

export default App;
