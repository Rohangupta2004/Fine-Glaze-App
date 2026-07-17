import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { Card } from './Card';

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onLocationSelected: (lat: string, lng: string, address: string) => void;
  city?: string;
  placeholder?: string;
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onLocationSelected,
  city = '',
  placeholder = 'Search site address on OpenStreetMap...',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchAddress = async (text: string) => {
    setQuery(text);
    onChangeText(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!text.trim() || text.length < 3) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const searchInput = city ? `${text}, ${city}` : text;
        // Use Photon by Komoot, which provides much better type-ahead autocomplete on OSM data than plain Nominatim
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchInput)}&limit=5`;

        const response = await fetch(url);
        const json = await response.json();
        
        if (json.features && json.features.length > 0) {
          // Map GeoJSON features to our expected format
          const mapped = json.features.map((f: any) => {
            const props = f.properties;
            const coords = f.geometry.coordinates; // [lon, lat]
            // Build a nice display name
            const parts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
            const displayName = Array.from(new Set(parts)).join(', ');
            
            return {
              place_id: props.osm_id || Math.random().toString(),
              display_name: displayName,
              lat: coords[1].toString(),
              lon: coords[0].toString(),
            };
          });
          setPredictions(mapped);
          setShowDropdown(true);
        } else {
          setPredictions([]);
        }
      } catch (e) {
        console.error('Error fetching OSM places:', e);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce
  };

  const handleSelect = (item: any) => {
    const lat = item.lat;
    const lon = item.lon;
    const displayName = item.display_name;

    setQuery(displayName);
    onChangeText(displayName);
    setPredictions([]);
    setShowDropdown(false);
    onLocationSelected(lat, lon, displayName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Full Site Address *</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={searchAddress}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          multiline
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loader}
          />
        )}
      </View>
      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          {predictions.map((item, idx) => (
            <TouchableOpacity
              key={item.place_id || idx}
              style={styles.item}
              onPress={() => handleSelect(item)}
            >
              <Ionicons name="location-outline" size={16} color={colors.neutral[500]} style={styles.itemIcon} />
              <Text style={styles.itemText} numberOfLines={2}>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

interface StaticMapPreviewProps {
  lat: string;
  lng: string;
}

export function StaticMapPreview({ lat, lng }: StaticMapPreviewProps) {
  if (!lat || !lng) return null;

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;

  const delta = 0.003;
  const bboxLeft = (lngNum - delta).toFixed(6);
  const bboxBottom = (latNum - delta).toFixed(6);
  const bboxRight = (lngNum + delta).toFixed(6);
  const bboxTop = (latNum + delta).toFixed(6);

  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxLeft},${bboxBottom},${bboxRight},${bboxTop}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <Card style={styles.mapCard}>
      {Platform.OS === 'web' ? (
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: 160, border: 'none' }}
          title="OpenStreetMap Location"
        />
      ) : (
        <WebView
          source={{ uri: embedUrl }}
          style={{ width: '100%', height: 160 }}
        />
      )}
      <View style={styles.mapOverlay}>
        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
        <Text style={styles.mapOverlayText}>Location captured via OpenStreetMap</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    zIndex: 10,
  },
  label: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing.md,
    paddingRight: 40,
    ...typography.bodyMedium,
    color: colors.ink,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  loader: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderColor: colors.neutral[200],
    borderWidth: 1,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    maxHeight: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  itemIcon: {
    marginRight: spacing.sm,
  },
  itemText: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1,
  },
  mapCard: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 0,
  },
  mapOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.neutral[100],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  mapOverlayText: {
    ...typography.caption,
    color: colors.neutral[700],
    fontFamily: fontFamily.medium,
  },
});
