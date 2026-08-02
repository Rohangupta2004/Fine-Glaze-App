/**
 * DatePickerField — pure-JS calendar date picker (no native dependency).
 * Shows a labelled field; tapping opens a month-view modal.
 * Value format: YYYY-MM-DD.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface DatePickerFieldProps {
  label: string;
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]?.slice(0, 3)} ${y}`;
}

export function DatePickerField({ label, value, onChange, placeholder = 'Select date', minDate }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const initial = value ? new Date(value) : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Monday-first offset
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (d: number) => {
    const iso = toISO(viewYear, viewMonth, d);
    if (minDate && iso < minDate) return;
    onChange(iso);
    setOpen(false);
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.neutral[400]} />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.header}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.ink} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => <Text key={w} style={styles.weekday}>{w}</Text>)}
            </View>
            <View style={styles.grid}>
              {grid.map((d, i) => {
                const iso = d ? toISO(viewYear, viewMonth, d) : '';
                const isSelected = !!d && iso === value;
                const isToday = !!d && iso === toISO(today.getFullYear(), today.getMonth(), today.getDate());
                const disabled = !!d && !!minDate && iso < minDate;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.cell, isSelected && styles.cellSelected]}
                    disabled={!d || disabled}
                    onPress={() => d && selectDay(d)}
                  >
                    {d ? (
                      <Text style={[
                        styles.cellText,
                        isToday && !isSelected && styles.cellToday,
                        isSelected && styles.cellTextSelected,
                        disabled && styles.cellDisabled,
                      ]}>{d}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                selectDay(today.getDate());
              }}
            >
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.neutral[600], marginBottom: spacing.xs },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.neutral[200], borderRadius: radius.md,
    backgroundColor: colors.white, paddingHorizontal: spacing.md, height: 44,
  },
  fieldText: { ...typography.bodyMedium, color: colors.ink, flex: 1 },
  placeholder: { color: colors.neutral[400] },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: { padding: spacing.sm, borderRadius: radius.sm },
  monthTitle: { ...typography.h4, color: colors.ink, fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.neutral[500], fontFamily: fontFamily.semiBold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, marginVertical: 2 },
  cellSelected: { backgroundColor: '#2563EB' },
  cellText: { ...typography.bodyMedium, color: colors.ink, fontSize: 13 },
  cellTextSelected: { color: colors.white, fontFamily: fontFamily.semiBold, fontWeight: '700' },
  cellToday: { color: '#2563EB', fontFamily: fontFamily.bold, fontWeight: '700' },
  cellDisabled: { color: colors.neutral[300] },
  todayBtn: { alignSelf: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, backgroundColor: '#EFF6FF', borderRadius: radius.sm },
  todayBtnText: { ...typography.bodyMedium, color: '#2563EB', fontWeight: '700', fontSize: 12 },
});
