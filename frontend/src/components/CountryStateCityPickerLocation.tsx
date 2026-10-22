// components/CountryStateCityPickerLocation.tsx
import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { GetCountries, GetState, GetCity } from 'react-country-state-city';

type Country = { id: number; name: string; iso2: string };
type State = { id: number; name: string; country_id: number };
type City = { id: number; name: string; state_id: number };

interface Props {
  onChange: (data: { country: string; state: string; city: string }) => void;
  country?: string;
  state?: string;
  city?: string;
}

/* --------------------- SEARCHABLE DROPDOWN --------------------- */
const SearchableDropdown = <T extends { id: number; name: string }>({
  placeholder,
  data,
  selected,
  onSelect,
  loading,
  disabled = false,
}: {
  placeholder: string;
  data: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  loading: boolean;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const anim = useRef(new Animated.Value(0)).current;

  const filtered = useMemo(
    () => data.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
    [data, search]
  );

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const toggle = () => !disabled && setOpen(v => !v);
  const pick = (item: T) => {
    onSelect(item);
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        disabled={disabled}
        style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled]}
        onPress={toggle}>
        <Text
          style={[
            styles.dropdownText,
            selected ? styles.selectedText : styles.placeholder,
          ]}>
          {selected?.name || placeholder}
        </Text>
        <ChevronDown size={20} color="#666" />
      </TouchableOpacity>

      {open && (
        <Animated.View
          style={[
            styles.dropdown,
            {
              opacity: anim,
              transform: [
                { scaleY: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
              ],
            },
          ]}>
          {loading ? (
            <ActivityIndicator style={styles.loader} color="#1E3A8A" />
          ) : (
            <>
              <TextInput
                placeholder={`Search ${placeholder.toLowerCase()}…`}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              <FlatList
                data={filtered}
                keyExtractor={i => i.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.item} onPress={() => pick(item)}>
                    <Text style={styles.itemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                style={styles.list}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              />
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
};

/* --------------------- MAIN PICKER --------------------- */
const CountryStateCityPicker = memo(
  ({ onChange, country = '', state = '', city = '' }: Props) => {
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);

    const [selCountry, setSelCountry] = useState<Country | null>(null);
    const [selState, setSelState] = useState<State | null>(null);
    const [selCity, setSelCity] = useState<City | null>(null);

    const [loadingC, setLoadingC] = useState(true);
    const [loadingS, setLoadingS] = useState(false);
    const [loadingCi, setLoadingCi] = useState(false);

    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => setHasMounted(true), []);

    /* ---------- 1. Load Countries + Pre-select ---------- */
    useEffect(() => {
      GetCountries()
        .then(r => {
          setCountries(r);
          const trimmed = country.trim();
          if (trimmed) {
            const found = r.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
            setSelCountry(found ?? null);
          }
          setLoadingC(false);
        })
        .catch(() => setLoadingC(false));
    }, [country]); // <-- CRITICAL

    /* ---------- 2. Load States WHEN country OR state prop changes ---------- */
    useEffect(() => {
      if (!selCountry) {
        setStates([]);
        setSelState(null);
        return;
      }

      setLoadingS(true);
      GetState(selCountry.id)
        .then(r => {
          const arr = r as State[];
          setStates(arr);

          const trimmed = state.trim();
          if (trimmed) {
            const found = arr.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
            if (found) setSelState(found);
          }
          setLoadingS(false);
        })
        .catch(() => setLoadingS(false));
    }, [selCountry, state]); // <-- DEPENDS ON `state` PROP

    /* ---------- 3. Load Cities WHEN state OR city prop changes ---------- */
    useEffect(() => {
      if (!selState || !selCountry) {
        setCities([]);
        setSelCity(null);
        return;
      }

      setLoadingCi(true);
      GetCity(selCountry.id, selState.id)
        .then(r => {
          const arr = r as City[];
          setCities(arr);

          const trimmed = city.trim();
          if (trimmed) {
            const found = arr.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
            if (found) setSelCity(found);
          }
          setLoadingCi(false);
        })
        .catch(() => setLoadingCi(false));
    }, [selState, selCountry, city]); // <-- DEPENDS ON `city` PROP

    /* ---------- 4. Emit only after mount ---------- */
    const emit = useCallback(() => {
      if (!hasMounted) return;
      onChange({
        country: selCountry?.name ?? '',
        state: selState?.name ?? '',
        city: selCity?.name ?? '',
      });
    }, [selCountry, selState, selCity, onChange, hasMounted]);

    useEffect(() => {
      emit();
    }, [emit]);

    return (
      <View>
        <Text style={styles.label}>Country *</Text>
        <SearchableDropdown
          placeholder="Select Country"
          data={countries}
          selected={selCountry}
          onSelect={c => {
            setSelCountry(c);
            setSelState(null);
            setSelCity(null);
          }}
          loading={loadingC}
        />

        {selCountry && (
          <>
            <Text style={styles.label}>State / Province *</Text>
            <SearchableDropdown
              placeholder="Select State"
              data={states}
              selected={selState}
              onSelect={s => {
                setSelState(s);
                setSelCity(null);
              }}
              loading={loadingS}
            />
          </>
        )}

        {selState && (
          <>
            <Text style={styles.label}>City</Text>
            <SearchableDropdown
              placeholder="Select City"
              data={cities}
              selected={selCity}
              onSelect={setSelCity}
              loading={loadingCi}
            />
          </>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: '600', color: '#1E3A8A', marginBottom: 8 },
  dropdownWrapper: { marginBottom: 16 },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  dropdownButtonDisabled: { backgroundColor: '#f0f0f0', opacity: 0.6 },
  dropdownText: { fontSize: 16 },
  placeholder: { color: '#999' },
  selectedText: { color: '#333' },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 12,
    fontSize: 16,
  },
  list: { maxHeight: 240 },
  item: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemText: { fontSize: 16, color: '#333' },
  loader: { marginVertical: 12 },
});

export default CountryStateCityPicker;