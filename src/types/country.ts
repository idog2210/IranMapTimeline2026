export type CountryKey = 'iran' | 'israel' | 'lebanon' | 'syria' | 'turkey' | 'cyprus' | 'usa' | 'egypt' | 'jordan' | 'saudi' | 'iraq' | 'uae' | 'bahrain' | 'kuwait' | 'qatar' | 'yemen' | 'oman';

export interface CountryNewsItem {
  title: string;
  time: string;
  date: string;
  description: string;
}

export type CountryNewsMap = Partial<Record<CountryKey, CountryNewsItem[]>>;

export interface CountryGeoConfig {
  key: CountryKey;
  name: string;
  hebrewName: string;
  center: [number, number];
  zoomLevel: number;
  fillColor: string;
  highlightColor: string;
}
