import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as XLSX from 'xlsx';

import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';
import { Button, SearchBar, Card } from '../../src/components';
import { useMaterialMaster, useImportBOQ, MaterialMasterItem } from '../../src/hooks/useBOQ';
import { useProjects } from '../../src/hooks/useProjects';

interface ParsedBOQRow {
  index: number;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  matchedId: string | null;
  matchedName: string | null;
  confidence: number;
  matchType: string;
  learnAlias: boolean;
}

export default function ImportBOQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();

  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');

  const { data: projects = [] } = useProjects();
  const { data: masterMaterials = [] } = useMaterialMaster();
  const selectedProj = projects.find((p) => p.id === selectedProjectId);
  const importBOQMutation = useImportBOQ();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedBOQRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [masterSearch, setMasterSearch] = useState('');

  // 1. Detect column mapping based on keywords
  const detectColumns = (row: any[]) => {
    let itemCol = -1;
    let descCol = -1;
    let qtyCol = -1;
    let unitCol = -1;
    let rateCol = -1;
    let amtCol = -1;

    row.forEach((cell, idx) => {
      if (cell === null || cell === undefined) return;
      const txt = String(cell).toLowerCase().trim();
      if (
        txt.includes('item') ||
        txt.includes('particular') ||
        txt.includes('name') ||
        txt.includes('material') ||
        txt.match(/^desc$/)
      ) {
        if (itemCol === -1) itemCol = idx;
      } else if (
        txt.includes('desc') ||
        txt.includes('spec') ||
        txt.includes('detail')
      ) {
        if (descCol === -1) descCol = idx;
      } else if (
        txt.includes('qty') ||
        txt.includes('quantity') ||
        txt.includes('vol')
      ) {
        if (qtyCol === -1) qtyCol = idx;
      } else if (
        txt.includes('unit') ||
        txt.includes('uom') ||
        txt.includes('measure')
      ) {
        if (unitCol === -1) unitCol = idx;
      } else if (
        txt.includes('rate') ||
        txt.includes('price') ||
        txt.includes('cost')
      ) {
        if (rateCol === -1) rateCol = idx;
      } else if (
        txt.includes('amount') ||
        txt.includes('total') ||
        txt.includes('value')
      ) {
        if (amtCol === -1) amtCol = idx;
      }
    });

    return { itemCol, descCol, qtyCol, unitCol, rateCol, amtCol };
  };

  // 2. Matching algorithm
  const findBestMatch = (itemName: string, materials: MaterialMasterItem[]) => {
    const cleanItem = itemName.toLowerCase().trim();
    if (!cleanItem) return { material: null, score: 0, type: 'none' };

    // exact match
    for (const m of materials) {
      if (m.name.toLowerCase().trim() === cleanItem) {
        return { material: m, score: 100, type: 'exact' };
      }
    }

    // alias match
    for (const m of materials) {
      for (const alias of m.aliases || []) {
        if (alias.toLowerCase().trim() === cleanItem) {
          return { material: m, score: 95, type: 'alias' };
        }
      }
    }

    // substring match
    let bestMatch: MaterialMasterItem | null = null;
    let bestScore = 0;
    let matchType = '';

    for (const m of materials) {
      const mName = m.name.toLowerCase().trim();
      if (cleanItem.includes(mName) || mName.includes(cleanItem)) {
        const score = Math.round(
          (Math.min(mName.length, cleanItem.length) / Math.max(mName.length, cleanItem.length)) * 90
        );
        if (score > bestScore) {
          bestScore = score;
          bestMatch = m;
          matchType = 'fuzzy';
        }
      }

      for (const alias of m.aliases || []) {
        const cleanAlias = alias.toLowerCase().trim();
        if (cleanItem.includes(cleanAlias) || cleanAlias.includes(cleanItem)) {
          const score = Math.round(
            (Math.min(cleanAlias.length, cleanItem.length) / Math.max(cleanAlias.length, cleanItem.length)) * 85
          );
          if (score > bestScore) {
            bestScore = score;
            bestMatch = m;
            matchType = 'fuzzy-alias';
          }
        }
      }
    }

    if (bestScore >= 40 && bestMatch) {
      return { material: bestMatch, score: bestScore, type: matchType };
    }

    return { material: null, score: 0, type: 'none' };
  };

  // 3. Web file picker handler
  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (!jsonData || jsonData.length === 0) {
          throw new Error('Excel sheet is empty');
        }

        // Scan first 15 rows to find the row with the most matching headers
        let bestHeaderIndex = 0;
        let bestCols = { itemCol: -1, descCol: -1, qtyCol: -1, unitCol: -1, rateCol: -1, amtCol: -1 };
        let maxMatchedCount = 0;

        for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
          const row = jsonData[r];
          if (!Array.isArray(row)) continue;
          const cols = detectColumns(row);
          let matchedCount = 0;
          if (cols.itemCol !== -1) matchedCount++;
          if (cols.qtyCol !== -1) matchedCount++;
          if (cols.unitCol !== -1) matchedCount++;

          if (matchedCount > maxMatchedCount) {
            maxMatchedCount = matchedCount;
            bestHeaderIndex = r;
            bestCols = cols;
          }
        }

        if (bestCols.itemCol === -1 || bestCols.qtyCol === -1) {
          throw new Error('Could not identify Item Name or Quantity columns in Excel sheet.');
        }

        const rows: ParsedBOQRow[] = [];
        for (let i = bestHeaderIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!Array.isArray(row)) continue;

          const itemName = row[bestCols.itemCol] ? String(row[bestCols.itemCol]).trim() : '';
          const quantity = parseFloat(row[bestCols.qtyCol]);
          if (!itemName || isNaN(quantity)) continue;

          const description = bestCols.descCol !== -1 && row[bestCols.descCol] ? String(row[bestCols.descCol]).trim() : '';
          const unit = bestCols.unitCol !== -1 && row[bestCols.unitCol] ? String(row[bestCols.unitCol]).trim() : 'nos';
          const rate = bestCols.rateCol !== -1 && !isNaN(parseFloat(row[bestCols.rateCol])) ? parseFloat(row[bestCols.rateCol]) : 0;
          const amount = bestCols.amtCol !== -1 && !isNaN(parseFloat(row[bestCols.amtCol])) ? parseFloat(row[bestCols.amtCol]) : rate * quantity;

          const matchResult = findBestMatch(itemName, masterMaterials);

          rows.push({
            index: i,
            itemName,
            description,
            quantity,
            unit,
            rate,
            amount,
            matchedId: matchResult.material?.id || null,
            matchedName: matchResult.material?.name || null,
            confidence: matchResult.score,
            matchType: matchResult.type,
            learnAlias: matchResult.score > 0 && matchResult.score < 100,
          });
        }

        if (rows.length === 0) {
          throw new Error('No valid rows found (rows require Item Name and Quantity).');
        }

        setParsedRows(rows);
      } catch (err: any) {
        setError(err.message || 'Failed to read Excel file');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading Excel file');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const triggerWebFileInput = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx, .xls';
      input.onchange = handleFileChange;
      input.click();
    }
  };

  const openReassignModal = (rowIndex: number) => {
    setActiveRowIndex(rowIndex);
    setMasterSearch('');
    setIsModalOpen(true);
  };

  const handleSelectMaterial = (material: MaterialMasterItem | null) => {
    if (activeRowIndex === null) return;
    const updated = [...parsedRows];
    const row = updated[activeRowIndex];

    if (material) {
      row.matchedId = material.id;
      row.matchedName = material.name;
      row.confidence = 100;
      row.matchType = 'exact';
      row.learnAlias = true;
    } else {
      row.matchedId = null;
      row.matchedName = null;
      row.confidence = 0;
      row.matchType = 'none';
      row.learnAlias = false;
    }

    setParsedRows(updated);
    setIsModalOpen(false);
    setActiveRowIndex(null);
  };

  const handleImportSubmit = async () => {
    if (!selectedProjectId) {
      setError('Please select a project first.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const items = parsedRows.map((row) => ({
        material_master_id: row.matchedId,
        item_name: row.itemName,
        description: row.description,
        quantity: row.quantity,
        unit: row.unit,
        rate: row.rate,
        amount: row.amount,
        excel_row: row.index,
        learn_alias: row.learnAlias && row.matchedId ? row.itemName : null,
      }));

      await importBOQMutation.mutateAsync({ projectId: selectedProjectId, items });
      router.replace(`/(admin)/project-workspace?id=${selectedProjectId}` as any);
    } catch (err: any) {
      setError(err.message || 'Failed to import BOQ data.');
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (parsedRows.length === 0) return { total: 0, autoMatched: 0, needsReview: 0, accuracy: 0 };
    const total = parsedRows.length;
    const autoMatched = parsedRows.filter((r) => r.confidence >= 90).length;
    const needsReview = total - autoMatched;
    const accuracy = Math.round((autoMatched / total) * 100);
    return { total, autoMatched, needsReview, accuracy };
  }, [parsedRows]);

  const filteredMaster = useMemo(() => {
    if (!masterSearch) return masterMaterials;
    return masterMaterials.filter((m) =>
      m.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(masterSearch.toLowerCase()))
    );
  }, [masterMaterials, masterSearch]);

  const matchedRows = parsedRows.filter((r) => r.confidence >= 90);
  const reviewRows = parsedRows.filter((r) => r.confidence < 90);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#695030', '#7E6144', '#918050']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.xl }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>{selectedProj?.name || projectName || 'Project'}</Text>
            <Text style={styles.headerTitle}>Import BOQ</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {parsedRows.length === 0 ? (
          <View style={{ gap: spacing.lg }}>
            {!projectId && (
              <Card style={styles.projectSelectorCard}>
                <Text style={styles.projectSelectorLabel}>Select Project for BOQ Import *</Text>
                <View style={styles.pickerBorder}>
                  <Picker
                    selectedValue={selectedProjectId}
                    onValueChange={(val) => {
                      setSelectedProjectId(val);
                      setError('');
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="-- Select a Project --" value="" />
                    {projects.map((p: any) => (
                      <Picker.Item key={p.id} label={`${p.name} (${p.city || ''})`} value={p.id} />
                    ))}
                  </Picker>
                </View>
              </Card>
            )}

            <View style={styles.uploadCard}>
              <Ionicons name="cloud-upload" size={60} color={colors.neutral[300]} style={styles.uploadIcon} />
              <Text style={styles.uploadTitle}>Upload BOQ or Quotation Sheet</Text>
              <Text style={styles.uploadDesc}>Select any Excel (.xlsx, .xls) spreadsheet. The system will automatically map description, quantities, units, and rates.</Text>
              
              {isLoading ? (
                <ActivityIndicator size="large" color="#7E6144" style={{ marginTop: spacing.xl }} />
              ) : (
                <Button
                  title="Select Excel File"
                  onPress={() => {
                    if (!selectedProjectId) {
                      setError('Please select a project first.');
                      return;
                    }
                    triggerWebFileInput();
                  }}
                  variant={selectedProjectId ? "primary" : "secondary"}
                  style={StyleSheet.flatten([styles.uploadButton, !selectedProjectId ? { opacity: 0.5 } : {}])}
                />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.reviewContainer}>
            {/* Stats Dashboard */}
            <View style={styles.dashboardCard}>
              <View style={styles.dashboardHeader}>
                <Ionicons name="bar-chart" size={20} color="#7E6144" />
                <Text style={styles.dashboardTitle}>Import Dashboard</Text>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total Materials</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: colors.success }]}>{stats.autoMatched}</Text>
                  <Text style={styles.statLabel}>Auto Matched</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: stats.needsReview > 0 ? colors.warning : colors.success }]}>
                    {stats.needsReview}
                  </Text>
                  <Text style={styles.statLabel}>Needs Review</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: stats.accuracy >= 90 ? colors.success : '#7E6144' }]}>
                    {stats.accuracy}%
                  </Text>
                  <Text style={styles.statLabel}>Accuracy Rate</Text>
                </View>
              </View>
            </View>

            {/* Section: Needs Confirmation */}
            {reviewRows.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="warning-outline" size={18} color={colors.warning} />
                  <Text style={[styles.sectionTitle, { color: colors.warning }]}>
                    Needs Confirmation ({reviewRows.length})
                  </Text>
                </View>
                {reviewRows.map((row) => {
                  const globalIdx = parsedRows.findIndex((r) => r.index === row.index);
                  return (
                    <View key={row.index} style={styles.rowCard}>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowName}>{row.itemName}</Text>
                        {row.description ? <Text style={styles.rowDesc}>{row.description}</Text> : null}
                        <Text style={styles.rowQty}>
                          Qty: <Text style={styles.bold}>{row.quantity} {row.unit}</Text> · Rate: <Text style={styles.bold}>₹{row.rate}</Text>
                        </Text>
                      </View>
                      
                      <View style={styles.mappingBox}>
                        <Text style={styles.mapLabel}>Suggested Master Match:</Text>
                        {row.matchedName ? (
                          <View style={styles.matchPill}>
                            <Text style={styles.matchText}>{row.matchedName}</Text>
                            <Text style={styles.confidenceText}>{row.confidence}% match</Text>
                          </View>
                        ) : (
                          <Text style={styles.noMatchText}>No match found</Text>
                        )}

                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            onPress={() => openReassignModal(globalIdx)}
                            style={styles.reassignButton}
                          >
                            <Ionicons name="search" size={14} color="#7E6144" />
                            <Text style={styles.reassignText}>Search Master</Text>
                          </TouchableOpacity>

                          {row.matchedId && (
                            <View style={styles.learnRow}>
                              <Text style={styles.learnText}>Save alias</Text>
                              <Switch
                                value={row.learnAlias}
                                onValueChange={(val) => {
                                  const updated = [...parsedRows];
                                  updated[globalIdx].learnAlias = val;
                                  setParsedRows(updated);
                                }}
                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                trackColor={{ true: '#7E6144', false: colors.neutral[300] }}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Section: Matched Automatically */}
            {matchedRows.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                  <Text style={[styles.sectionTitle, { color: colors.success }]}>
                    Matched Automatically ({matchedRows.length})
                  </Text>
                </View>
                {matchedRows.map((row) => {
                  const globalIdx = parsedRows.findIndex((r) => r.index === row.index);
                  return (
                    <View key={row.index} style={styles.rowCard}>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowName}>{row.itemName}</Text>
                        <Text style={styles.rowQty}>
                          Qty: {row.quantity} {row.unit} · Rate: ₹{row.rate}
                        </Text>
                      </View>
                      <View style={styles.mappingBox}>
                        <View style={styles.matchPillSuccess}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.matchTextSuccess}>{row.matchedName}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => openReassignModal(globalIdx)}
                          style={[styles.reassignButton, { alignSelf: 'flex-start', marginTop: spacing.sm }]}
                        >
                          <Text style={styles.reassignText}>Change Match</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <Button
              title="Import BOQ to Project"
              onPress={handleImportSubmit}
              variant="primary"
              style={styles.importButton}
              disabled={isLoading}
            />
          </View>
        )}
      </ScrollView>

      {/* Modal: Searchable Master Material Selection */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Master Material</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearch}>
              <SearchBar
                value={masterSearch}
                onChangeText={setMasterSearch}
                placeholder="Search master list..."
              />
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              <TouchableOpacity
                onPress={() => handleSelectMaterial(null)}
                style={styles.modalItemUnmatched}
              >
                <Ionicons name="alert-circle-outline" size={20} color={colors.neutral[500]} />
                <Text style={styles.unmatchedItemText}>Keep as Custom / Unmatched</Text>
              </TouchableOpacity>

              {filteredMaster.map((material) => (
                <TouchableOpacity
                  key={material.id}
                  onPress={() => handleSelectMaterial(material)}
                  style={styles.modalItem}
                >
                  <View>
                    <Text style={styles.itemMatName}>{material.name}</Text>
                    <Text style={styles.itemMatCategory}>{material.category || 'General'} · unit: {material.unit}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
                </TouchableOpacity>
              ))}

              {filteredMaster.length === 0 && (
                <Text style={styles.emptySearchText}>No materials match your search.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fontFamily.medium,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#fff',
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FDF2F2',
    borderColor: '#FDE8E8',
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    flex: 1,
  },
  projectSelectorCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  projectSelectorLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  pickerBorder: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    backgroundColor: '#FAF9F6',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    width: '100%',
    color: colors.ink,
    fontFamily: fontFamily.medium,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  uploadCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  uploadIcon: {
    marginBottom: spacing.xl,
  },
  uploadTitle: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  uploadDesc: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  uploadButton: {
    width: '100%',
    backgroundColor: '#7E6144',
  },
  reviewContainer: {
    gap: spacing.xl,
  },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dashboardTitle: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#FAF9F6',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: colors.neutral[800],
    marginBottom: 2,
  },
  statBoxLabel: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  rowInfo: {
    marginBottom: spacing.md,
  },
  rowName: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.neutral[400],
    marginBottom: spacing.sm,
  },
  rowQty: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.neutral[500],
  },
  bold: {
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[700],
  },
  mappingBox: {
    backgroundColor: '#FAF9F6',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  mapLabel: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
    marginBottom: spacing.xs,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(235, 175, 52, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(235, 175, 52, 0.25)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  matchText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: '#B08010',
  },
  confidenceText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: '#B08010',
  },
  matchPillSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  matchTextSuccess: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: '#fff',
  },
  noMatchText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing.sm,
  },
  reassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(126, 97, 68, 0.3)',
  },
  reassignText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: '#7E6144',
  },
  learnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  learnText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.neutral[500],
  },
  importButton: {
    backgroundColor: '#7E6144',
    marginTop: spacing.xl,
    marginBottom: spacing['3xl'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
  },
  modalSearch: {
    marginBottom: spacing.lg,
  },
  modalList: {
    gap: spacing.sm,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  modalItemUnmatched: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  unmatchedItemText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[500],
  },
  itemMatName: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[800],
  },
  itemMatCategory: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.neutral[400],
    marginTop: 2,
  },
  emptySearchText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
