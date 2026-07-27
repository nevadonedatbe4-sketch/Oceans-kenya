import { useState, useCallback, useEffect } from 'react';

export interface CompareProperty {
  id: string;
  slug: string;
  title: string;
  location: string;
  type: 'sale' | 'rent';
  category: string;
  beds: number;
  baths: number;
  parking: number;
  rawPrice: number;
  currency: string;
  image: string;
}

const STORAGE_KEY = 'compare_selected_properties';
const MAX_COMPARE = 3;

function loadFromStorage(): CompareProperty[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(properties: CompareProperty[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

export function useCompareToolbar() {
  const [selected, setSelected] = useState<CompareProperty[]>(loadFromStorage);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveToStorage(selected);
  }, [selected]);

  const addToCompare = useCallback((property: CompareProperty) => {
    setSelected((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some((p) => p.id === property.id)) return prev;
      return [...prev, property];
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const isSelected = useCallback((id: string) => {
    return selected.some((p) => p.id === id);
  }, [selected]);

  const toggleCompare = useCallback((property: CompareProperty) => {
    if (isSelected(property.id)) {
      removeFromCompare(property.id);
    } else {
      addToCompare(property);
    }
  }, [isSelected, addToCompare, removeFromCompare]);

  const clearAll = useCallback(() => {
    setSelected([]);
    setIsOpen(false);
  }, []);

  return {
    selected,
    addToCompare,
    removeFromCompare,
    isSelected,
    toggleCompare,
    clearAll,
    isOpen,
    setIsOpen,
    maxReached: selected.length >= MAX_COMPARE,
  };
}