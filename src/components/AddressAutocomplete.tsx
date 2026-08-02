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
import * as Location from 'expo-location';
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

function safeFetchJson(url: string): Promise<any> {
  return new Promise((resolve) => {
    try {
      if (typeof XMLHttpRequest === 'undefined') return resolve(null);
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 4000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      xhr.onerror = function () {
        resolve(null);
      };
      xhr.ontimeout = function () {
        resolve(null);
      };
      xhr.send();
    } catch {
      resolve(null);
    }
  });
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onLocationSelected,
  city = '',
  placeholder = 'Type site address, paste Google Maps link or Lat, Lng...',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const parseAndExtractCoordinates = (text: string): { lat: string; lng: string } | null => {
    if (!text) return null;

    // 1. Google Maps @lat,lng (e.g. @19.0968032,72.8404112)
    const atMatch = text.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    if (atMatch) {
      return { lat: atMatch[1], lng: atMatch[2] };
    }

    // 2. Query param q=lat,lng or ll=lat,lng or destination=lat,lng or point=lat,lng
    const qMatch = text.match(/(?:q|ll|destination|center|point|query)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/i);
    if (qMatch) {
      return { lat: qMatch[1], lng: qMatch[2] };
    }

    // 3. Decimal coordinates "19.0968, 72.8404" or "19.0968,72.8404" or "19.0968 72.8404"
    const decMatch = text.match(/(-?\d{1,2}\.\d+)\s*[\s,]\s*(-?\d{1,3}\.\d+)/);
    if (decMatch) {
      const lat = parseFloat(decMatch[1]);
      const lng = parseFloat(decMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat: decMatch[1], lng: decMatch[2] };
      }
    }

    // 4. DMS format: 19°05'48.5"N 72°50'25.5"E
    const dmsMatch = text.match(/(\d+)[°\s]\s*(\d+)['\s]\s*([\d.]+)"?\s*([NS])\s*(\d+)[°\s]\s*(\d+)['\s]\s*([\d.]+)"?\s*([EW])/i);
    if (dmsMatch) {
      let lat = Number(dmsMatch[1]) + Number(dmsMatch[2]) / 60 + Number(dmsMatch[3]) / 3600;
      if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
      let lng = Number(dmsMatch[5]) + Number(dmsMatch[6]) / 60 + Number(dmsMatch[7]) / 3600;
      if (dmsMatch[8].toUpperCase() === 'W') lng = -lng;
      return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
    }

    return null;
  };

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

    // 1. Direct coordinate match (@lat,lng or lat,lng or q=lat,lng)
    const directCoords = parseAndExtractCoordinates(text);
    if (directCoords) {
      onLocationSelected(directCoords.lat, directCoords.lng, text);
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    // 2. If short Google Share link pasted without embedded coordinates, auto show manual coords helper
    if (text.includes('share.google') || text.includes('goo.gl') || text.includes('maps.app')) {
      setShowManualCoords(true);
    }

    setLoading(true);

    debounceTimer.current = setTimeout(async () => {
      // 3. Clean search input if text contained a link + place name
      let cleanQuery = text.replace(/https?:\/\/[^\s]+/g, '').trim();
      const searchInput = city && cleanQuery ? `${cleanQuery}, ${city}` : (cleanQuery || text);

      let mapped: any[] = [];

      // Try Photon API safely
      const json1 = await safeFetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchInput)}&limit=5`);
      if (json1?.features?.length > 0) {
        mapped = json1.features.map((f: any) => {
          const props = f.properties;
          const c = f.geometry.coordinates; // [lon, lat]
          const parts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
          return {
            place_id: props.osm_id || Math.random().toString(),
            display_name: Array.from(new Set(parts)).join(', '),
            lat: c[1].toString(),
            lon: c[0].toString(),
          };
        });
      }

      // Fallback to Nominatim API safely
      if (mapped.length === 0) {
        const json2 = await safeFetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=5`);
        if (Array.isArray(json2) && json2.length > 0) {
          mapped = json2.map((item: any) => ({
            place_id: item.place_id || Math.random().toString(),
            display_name: item.display_name,
            lat: item.lat.toString(),
            lon: item.lon.toString(),
          }));
        }
      }

      if (mapped.length > 0) {
        setPredictions(mapped);
        setShowDropdown(true);
        onLocationSelected(mapped[0].lat, mapped[0].lon, text);
      } else {
        setPredictions([]);
      }
      setLoading(false);
    }, 400);
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

  const useGPSLocation = async () => {
    try {
      setLocatingGPS(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission Denied: Location access is required to capture current GPS coordinates.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude.toString();
      const lon = loc.coords.longitude.toString();

      let addrName = query || `Lat: ${lat.slice(0, 7)}, Lng: ${lon.slice(0, 7)}`;
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (rev && rev[0]) {
          const r = rev[0];
          const parts = [r.name, r.street, r.district, r.city, r.region, r.postalCode].filter(Boolean);
          if (parts.length > 0) addrName = parts.join(', ');
        }
      } catch (revErr) {
        console.warn('Reverse geocode fallback:', revErr);
      }

      setQuery(addrName);
      onChangeText(addrName);
      onLocationSelected(lat, lon, addrName);
    } catch (e: any) {
      alert('Could not fetch GPS location: ' + (e.message || 'Please check device location settings.'));
    } finally {
      setLocatingGPS(false);
    }
  };

  const applyManualCoords = () => {
    if (!manualLat || !manualLng) {
      alert('Please enter valid numeric Latitude and Longitude values.');
      return;
    }
    const latNum = Number(manualLat);
    const lngNum = Number(manualLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Latitude and Longitude must be valid numbers.');
      return;
    }
    const addr = query || `Custom Coordinates (${manualLat}, ${manualLng})`;
    onLocationSelected(manualLat.trim(), manualLng.trim(), addr);
    alert('Geofence location coordinates set manually.');
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
        <Text style={styles.label}>Full Site Address *</Text>
        <TouchableOpacity onPress={useGPSLocation} disabled={locatingGPS} style={styles.gpsBtn}>
          {locatingGPS ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <>
              <Ionicons name="navigate-circle" size={16} color="#2563EB" />
              <Text style={styles.gpsBtnText}>Use My GPS Location</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

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

      {/* Manual Coordinates Toggle Link */}
      <TouchableOpacity
        onPress={() => setShowManualCoords(!showManualCoords)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
      >
        <Ionicons name={showManualCoords ? 'chevron-down' : 'add-circle-outline'} size={14} color="#695030" />
        <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: '#695030' }}>
          {showManualCoords ? 'Hide Manual Coordinates' : 'Location not found? Enter Manual Lat & Lng / Paste Google Maps link'}
        </Text>
      </TouchableOpacity>

      {/* Manual Coordinates Fields */}
      {showManualCoords && (
        <View style={{ marginTop: 8, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
          <Text style={{ fontSize: 11, color: '#64748B', fontFamily: fontFamily.medium }}>
            Copy coordinates from Google Maps (e.g. 19.0968, 72.8404) or paste them below:
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: '#475569', marginBottom: 2 }}>Latitude (Lat)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 6, backgroundColor: '#FFF', fontSize: 12 }}
                placeholder="19.096803"
                value={manualLat}
                onChangeText={setManualLat}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: '#475569', marginBottom: 2 }}>Longitude (Lng)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 6, backgroundColor: '#FFF', fontSize: 12 }}
                placeholder="72.840411"
                value={manualLng}
                onChangeText={setManualLng}
                keyboardType="numeric"
              />
            </View>
          </View>
          <TouchableOpacity onPress={applyManualCoords} style={{ backgroundColor: '#695030', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontSize: 12, fontFamily: fontFamily.bold }}>Set Geofence Coordinates</Text>
          </TouchableOpacity>
        </View>
      )}

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
          style={{ width: '100%', height: 170, border: 'none' }}
          title="OpenStreetMap Location"
        />
      ) : (
        <WebView
          source={{ uri: embedUrl }}
          style={{ width: '100%', height: 170 }}
        />
      )}
      <View style={styles.mapOverlay}>
        <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
        <Text style={styles.mapOverlayText}>Geofence Center: {lat.slice(0, 8)}, {lng.slice(0, 8)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    zIndex: 10,
  },
  label: {
    ...typography.label,
    color: colors.ink,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  gpsBtnText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: '#2563EB',
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
    minHeight: 80,
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
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  mapOverlayText: {
    ...typography.caption,
    color: colors.neutral[700],
    fontFamily: fontFamily.medium,
  },
});
