/**
 * ImageViewer — Full-screen image viewer with pinch-to-zoom and swipe.
 * Shows images like a phone gallery, not as file downloads.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing } from '../theme/spacing';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ImageItem {
  uri: string;
  caption?: string;
}

interface ImageViewerProps {
  images: ImageItem[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewer({ images, visible, initialIndex = 0, onClose }: ImageViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);

  const onShare = async () => {
    const img = images[currentIndex];
    if (!img) return;
    try {
      await Share.share({ url: img.uri, message: img.caption || 'Shared from Fine Glaze COS' });
    } catch {}
  };

  if (!images.length) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
          <TouchableOpacity onPress={onShare} style={styles.headerBtn} hitSlop={12}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Image carousel */}
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setCurrentIndex(idx);
          }}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.imageContainer}>
              {loading && (
                <ActivityIndicator
                  size="large"
                  color="#fff"
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Image
                source={{ uri: item.uri }}
                style={styles.image}
                resizeMode="contain"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
              />
            </View>
          )}
        />

        {/* Caption */}
        {images[currentIndex]?.caption && (
          <View style={[styles.captionBar, { paddingBottom: insets.bottom + spacing.md }]}>
            <Text style={styles.captionText}>{images[currentIndex].caption}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

/** Thumbnail grid — for showing photos that open into ImageViewer */
interface PhotoGridProps {
  images: ImageItem[];
  onViewImage?: (index: number) => void;
}

export function PhotoGrid({ images, onViewImage }: PhotoGridProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (index: number) => {
    if (onViewImage) {
      onViewImage(index);
    } else {
      setViewerIndex(index);
      setViewerOpen(true);
    }
  };

  return (
    <>
      <View style={styles.grid}>
        {images.slice(0, 4).map((img, i) => (
          <TouchableOpacity
            key={i}
            style={styles.gridItem}
            onPress={() => openViewer(i)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: img.uri }} style={styles.gridImage} />
            {i === 3 && images.length > 4 && (
              <View style={styles.gridMore}>
                <Text style={styles.gridMoreText}>+{images.length - 4}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <ImageViewer
        images={images}
        visible={viewerOpen}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  counter: { ...typography.bodySmall, color: '#fff', fontFamily: fontFamily.medium },
  imageContainer: {
    width: SCREEN_W,
    height: SCREEN_H * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: SCREEN_W, height: SCREEN_H * 0.7 },
  captionBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  captionText: { ...typography.bodySmall, color: '#ccc', textAlign: 'center' },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gridItem: {
    width: '48%' as any,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  gridImage: { width: '100%', height: '100%' },
  gridMore: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridMoreText: { ...typography.h3, color: '#fff', fontFamily: fontFamily.bold },
});
