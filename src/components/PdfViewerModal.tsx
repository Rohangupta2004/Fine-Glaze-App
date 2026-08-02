import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface PdfViewerModalProps {
  visible: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
}

export function PdfViewerModal({ visible, onClose, fileUrl, fileName }: PdfViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!fileUrl) return null;

  const handleShare = async () => {
    try {
      await Share.share({ message: `Fine Glaze Document (${fileName}):\n${fileUrl}` });
    } catch (e) {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top App Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleWrap}>
            <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
            <View style={styles.pdfBadge}>
              <Text style={styles.pdfBadgeText}>IN-APP PDF</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} hitSlop={10}>
            <Ionicons name="share-social-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* PDF Document Viewing Container */}
        <View style={styles.viewerWrap}>
          {Platform.OS === 'web' ? (
            <object
              data={fileUrl}
              type="application/pdf"
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#FFFFFF' }}
              onLoad={() => setLoading(false)}
            >
              <iframe
                src={fileUrl}
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#FFFFFF' }}
                title="In-App PDF Viewer"
                onLoad={() => setLoading(false)}
              />
            </object>
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{
                uri: Platform.OS === 'android'
                  ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`
                  : fileUrl
              }}
              style={{ flex: 1, backgroundColor: '#0F172A' }}
              onLoadEnd={() => setLoading(false)}
              onError={() => setLoading(false)}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              renderLoading={() => (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#B89047" />
                  <Text style={styles.loaderText}>Rendering In-App PDF Document…</Text>
                </View>
              )}
            />
          )}


          {loading && Platform.OS === 'web' && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#B89047" />
              <Text style={styles.loaderText}>Rendering In-App PDF Document…</Text>
            </View>
          )}
        </View>


        {/* Bottom Toolbar */}
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.badgeInfo}>
            <Ionicons name="document-text" size={16} color="#B89047" />
            <Text style={styles.badgeInfoText}>In-App Native View</Text>
          </View>

          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoomLevel((z) => Math.max(50, z - 25))}
            >
              <Ionicons name="remove" size={16} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.zoomText}>{zoomLevel}%</Text>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoomLevel((z) => Math.min(200, z + 25))}
            >
              <Ionicons name="add" size={16} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: spacing.md,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fileName: { fontSize: 15, fontFamily: fontFamily.bold, color: '#F8FAFC', flexShrink: 1 },
  pdfBadge: { backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  pdfBadgeText: { fontSize: 9, fontFamily: fontFamily.bold, color: '#FFFFFF' },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  viewerWrap: { flex: 1, position: 'relative', backgroundColor: '#1E293B' },
  loaderWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loaderText: { fontSize: 13, fontFamily: fontFamily.medium, color: '#94A3B8' },

  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeInfoText: { fontSize: 11, fontFamily: fontFamily.medium, color: '#94A3B8' },
  zoomControls: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  zoomBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  zoomText: { fontSize: 11, fontFamily: fontFamily.bold, color: '#F8FAFC', minWidth: 36, textAlign: 'center' },
});
