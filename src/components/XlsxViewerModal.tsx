import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';

import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface XlsxViewerModalProps {
  visible: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
}

function getColumnLetter(colIndex: number): string {
  let temp = 0;
  let letter = '';
  let idx = colIndex;
  while (idx >= 0) {
    temp = idx % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    idx = Math.floor((idx - temp) / 26) - 1;
  }
  return letter;
}

export function XlsxViewerModal({ visible, onClose, fileUrl, fileName }: XlsxViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!visible || !fileUrl) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    async function loadSpreadsheet() {
      try {
        const response = await fetch(fileUrl!);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });

        if (!isMounted) return;

        setWorkbook(wb);
        if (wb.SheetNames && wb.SheetNames.length > 0) {
          setSheetNames(wb.SheetNames);
          const firstSheet = wb.SheetNames[0];
          setActiveSheet(firstSheet);

          const ws = wb.Sheets[firstSheet];
          const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          setSheetData(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to parse Excel file.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSpreadsheet();

    return () => {
      isMounted = false;
    };
  }, [visible, fileUrl]);

  const handleSelectSheet = (name: string) => {
    if (!workbook) return;
    setActiveSheet(name);
    const ws = workbook.Sheets[name];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    setSheetData(data);
  };

  const handleShare = async () => {
    try {
      if (fileUrl) {
        await Share.share({ message: `Fine Glaze Spreadsheet (${fileName}):\n${fileUrl}` });
      }
    } catch (e) {}
  };

  // Filter rows based on search
  const filteredRows = sheetData.filter((row) => {
    if (!searchQuery.trim()) return true;
    return row.some((cell) =>
      String(cell || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  });

  // Determine total columns count for A, B, C... header
  const maxCols = Math.max(0, ...sheetData.map(r => (Array.isArray(r) ? r.length : 0)));

  if (!fileUrl) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
            <View style={styles.xlsxBadge}>
              <Text style={styles.xlsxBadgeText}>EXCEL / CSV</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} hitSlop={10}>
            <Ionicons name="share-social-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* Toolbar with Search */}
        <View style={styles.toolbarRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter spreadsheet cells..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Sheet Tabs Header (Compact Horizontal Pills) */}
        {sheetNames.length > 1 && (
          <View style={styles.sheetTabBarWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md, alignItems: 'center' }}
            >
              {sheetNames.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sheetTabPill, activeSheet === s && styles.sheetTabPillActive]}
                  onPress={() => handleSelectSheet(s)}
                >
                  <Ionicons name="grid-outline" size={13} color={activeSheet === s ? '#FFF' : '#94A3B8'} />
                  <Text style={[styles.sheetTabText, activeSheet === s && styles.sheetTabTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Main Grid View */}
        <View style={styles.gridWrap}>
          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={styles.loaderText}>Parsing Excel Spreadsheet Data…</Text>
            </View>
          ) : errorMsg ? (
            <View style={styles.errorWrap}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : filteredRows.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={40} color="#64748B" />
              <Text style={styles.emptyText}>No matching rows found in sheet</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator showsHorizontalScrollIndicator>
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
                <View style={styles.table}>
                  {/* Excel Column Headers Row (A, B, C, D, E...) */}
                  <View style={styles.excelColHeaderRow}>
                    <View style={styles.rowIdxCell}>
                      <Text style={styles.rowIdxText}>#</Text>
                    </View>
                    {Array.from({ length: maxCols }).map((_, cIdx) => (
                      <View key={cIdx} style={styles.excelColHeaderCell}>
                        <Text style={styles.excelColHeaderText}>{getColumnLetter(cIdx)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Data Rows */}
                  {filteredRows.map((row, rIdx) => {
                    const isFirstRow = rIdx === 0;
                    return (
                      <View key={rIdx} style={[styles.tr, isFirstRow && styles.thRow]}>
                        {/* Row Number */}
                        <View style={styles.rowIdxCell}>
                          <Text style={styles.rowIdxText}>{rIdx + 1}</Text>
                        </View>

                        {/* Cell Values */}
                        {Array.from({ length: maxCols }).map((_, cIdx) => {
                          const cell = row[cIdx];
                          const cellStr = cell !== undefined && cell !== null ? String(cell) : '';
                          return (
                            <View key={cIdx} style={[styles.td, isFirstRow && styles.th]}>
                              <Text
                                style={[styles.tdText, isFirstRow && styles.thText]}
                                numberOfLines={3}
                              >
                                {cellStr}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </ScrollView>
          )}
        </View>

        {/* Footer info */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Text style={styles.footerText}>
            Sheet: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{activeSheet || 'Sheet1'}</Text> · {filteredRows.length} Rows Loaded
          </Text>
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
  xlsxBadge: { backgroundColor: '#16A34A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  xlsxBadgeText: { fontSize: 9, fontFamily: fontFamily.bold, color: '#FFFFFF' },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  toolbarRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 13 },

  sheetTabBarWrap: { height: 44, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155', justifyContent: 'center' },
  sheetTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    height: 32,
  },
  sheetTabPillActive: { backgroundColor: '#16A34A', borderColor: '#22C55E' },
  sheetTabText: { fontSize: 12, fontFamily: fontFamily.medium, color: '#94A3B8' },
  sheetTabTextActive: { color: '#FFF', fontFamily: fontFamily.bold },

  gridWrap: { flex: 1, backgroundColor: '#020617' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loaderText: { fontSize: 13, fontFamily: fontFamily.medium, color: '#94A3B8' },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: 13, color: '#64748B' },

  // Excel Column & Table Styling
  table: { backgroundColor: '#0F172A' },
  excelColHeaderRow: { flexDirection: 'row', backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: '#334155' },
  excelColHeaderCell: {
    width: 140,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
  },
  excelColHeaderText: { fontSize: 11, fontWeight: '800', color: '#B89047' },

  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  thRow: { backgroundColor: '#1E293B', borderBottomWidth: 2, borderBottomColor: '#334155' },
  rowIdxCell: {
    width: 40,
    padding: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
  },
  rowIdxText: { fontSize: 10, color: '#64748B', fontFamily: fontFamily.medium },
  td: {
    width: 140,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    justifyContent: 'center',
  },
  th: { backgroundColor: '#1E293B' },
  tdText: { fontSize: 12, color: '#E2E8F0', fontFamily: fontFamily.regular },
  thText: { fontSize: 12, color: '#F8FAFC', fontFamily: fontFamily.bold },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  footerText: { fontSize: 11, color: '#94A3B8' },
});

