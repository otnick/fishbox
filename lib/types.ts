export interface FishSpecies {
  name: string
  scientificName?: string
  minSize?: number // minimum legal size in cm
  closedSeason?: {
    start: string // MM-DD
    end: string // MM-DD
  }
}

export const FISH_SPECIES_DATA: { [key: string]: FishSpecies } = {
  Hecht: {
    name: 'Hecht',
    scientificName: 'Esox lucius',
    minSize: 45,
    closedSeason: {
      start: '02-15',
      end: '04-30',
    },
  },
  Zander: {
    name: 'Zander',
    scientificName: 'Sander lucioperca',
    minSize: 45,
    closedSeason: {
      start: '02-15',
      end: '05-31',
    },
  },
  Barsch: {
    name: 'Barsch',
    scientificName: 'Perca fluviatilis',
  },
  Karpfen: {
    name: 'Karpfen',
    scientificName: 'Cyprinus carpio',
  },
  Forelle: {
    name: 'Forelle',
    scientificName: 'Salmo trutta',
    minSize: 25,
  },
  Aal: {
    name: 'Aal',
    scientificName: 'Anguilla anguilla',
    minSize: 35,
  },
  Wels: {
    name: 'Wels',
    scientificName: 'Silurus glanis',
  },
  Döbel: {
    name: 'Döbel',
    scientificName: 'Squalius cephalus',
  },
}
