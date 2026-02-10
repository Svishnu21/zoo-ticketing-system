import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

// Category order must match the counter issue screen exactly.
const CATEGORY_ORDER = [
  { key: 'entry_adult', label: 'Adult' },
  { key: 'entry_child_5_12', label: 'Children (5–12)' },
  { key: 'entry_child_0_4', label: 'Children (0–4)' },
  { key: 'entry_diff_abled', label: 'Differently Abled' },
  { key: 'entry_kids_zone', label: 'Kids Zone (upto age 6)' },
  { key: 'parking_2w', label: '2 Wheeler' },
  { key: 'parking_4w_lmv', label: '4 Wheeler (LMV)' },
  { key: 'transport_battery_adult', label: 'Battery Car – Adult' },
]

export type DailyCollectionRow = {
  description: string
  price: number
  quantity: number
  amount: number
  zat: number
  vcf: number
  cash: number
  bank: number
}

export type DailyCollectionTotals = {
  quantity: number
  amount: number
  zat: number
  vcf: number
  cash: number
  bank: number
}

export type DailyCollectionPdfProps = {
  orgName: string
  division: string
  address: string
  contact: string
  reportDate: string
  // Pre-aggregated data keyed by category key (see CATEGORY_ORDER keys)
  rows: Record<string, DailyCollectionRow | undefined>
  totals?: DailyCollectionTotals
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000',
  },
  header: {
    marginBottom: 16,
  },
  orgName: {
    fontSize: 14,
    fontWeight: 700,
  },
  subText: {
    marginTop: 2,
  },
  title: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: 700,
  },
  dateRow: {
    marginTop: 4,
    fontSize: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    minHeight: 18,
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: '#f0f0f0',
    fontWeight: 700,
  },
  cell: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    textAlign: 'left',
  },
  cellRight: {
    textAlign: 'right',
  },
  lastCell: {
    borderRightWidth: 0,
  },
  footer: {
    marginTop: 18,
    fontSize: 9,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sigBlock: {
    width: '48%',
  },
  sigLine: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    paddingTop: 4,
  },
})

const columns = [
  { key: 'description', label: 'Description', flex: 3, align: 'left' as const },
  { key: 'price', label: 'Price', flex: 1, align: 'right' as const },
  { key: 'quantity', label: 'Quantity', flex: 1, align: 'right' as const },
  { key: 'amount', label: 'Amount', flex: 1, align: 'right' as const },
  { key: 'zat', label: 'ZAT', flex: 1, align: 'right' as const },
  { key: 'vcf', label: 'VCF', flex: 1, align: 'right' as const },
  { key: 'cash', label: 'Cash', flex: 1, align: 'right' as const },
  { key: 'bank', label: 'Bank', flex: 1, align: 'right' as const },
]

const toNumber = (n: number | string | undefined | null) => {
  const num = typeof n === 'string' ? Number(n) : n ?? 0
  return Number.isFinite(num) ? Number(num) : 0
}

const formatNum = (n: number) => n.toFixed(2)

const defaultRow = (label: string): DailyCollectionRow => ({
  description: label,
  price: 0,
  quantity: 0,
  amount: 0,
  zat: 0,
  vcf: 0,
  cash: 0,
  bank: 0,
})

export const DailyCollectionPdf: React.FC<DailyCollectionPdfProps> = ({ orgName, division, address, contact, reportDate, rows, totals }) => {
  const orderedRows: DailyCollectionRow[] = CATEGORY_ORDER.map(({ key, label }) => {
    const row = rows[key]
    if (!row) return defaultRow(label)
    return {
      description: row.description || label,
      price: toNumber(row.price),
      quantity: toNumber(row.quantity),
      amount: toNumber(row.amount),
      zat: toNumber(row.zat),
      vcf: toNumber(row.vcf),
      cash: toNumber(row.cash),
      bank: toNumber(row.bank),
    }
  })

  const derivedTotals = orderedRows.reduce(
    (acc, r) => {
      acc.quantity += r.quantity
      acc.amount += r.amount
      acc.zat += r.zat
      acc.vcf += r.vcf
      acc.cash += r.cash
      acc.bank += r.bank
      return acc
    },
    { quantity: 0, amount: 0, zat: 0, vcf: 0, cash: 0, bank: 0 },
  )

  const totalRow: DailyCollectionTotals = totals
    ? {
        quantity: toNumber(totals.quantity),
        amount: toNumber(totals.amount),
        zat: toNumber(totals.zat),
        vcf: toNumber(totals.vcf),
        cash: toNumber(totals.cash),
        bank: toNumber(totals.bank),
      }
    : derivedTotals

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{orgName}</Text>
          <Text style={styles.subText}>{division}</Text>
          <Text style={styles.subText}>{address}</Text>
          <Text style={styles.subText}>{contact}</Text>
          <Text style={styles.title}>Daily Collection Summary</Text>
          <Text style={styles.dateRow}>Report Date: {reportDate}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            {columns.map((col, idx) => {
              const styleObj = {
                ...styles.cell,
                flex: col.flex,
                textAlign: col.align,
                ...(idx === columns.length - 1 ? styles.lastCell : {}),
              }
              return (
                <Text key={col.key} style={styleObj}>
                  {col.label}
                </Text>
              )
            })}
          </View>

          {orderedRows.map((row, rowIdx) => (
            <View key={`${row.description}-${rowIdx}`} style={styles.row}>
              <Text style={[styles.cell, { flex: columns[0].flex }]}>{row.description}</Text>
              <Text style={[styles.cell, styles.cellRight, { flex: columns[1].flex }]}>{formatNum(row.price)}</Text>
              <Text style={[styles.cell, styles.cellRight, { flex: columns[2].flex }]}>{formatNum(row.quantity)}</Text>
              <Text style={[styles.cell, styles.cellRight, { flex: columns[3].flex }]}>{formatNum(row.amount)}</Text>
              <Text style={[styles.cell, styles.cellRight, { flex: columns[4].flex }]}>{formatNum(row.zat)}</Text>
              <Text style={[styles.cell, styles.cellRight, { flex: columns[5].flex }]}>{formatNum(row.vcf)}</Text>
              <Text style={[styles.cell, styles.cellRight, { flex: columns[6].flex }]}>{formatNum(row.cash)}</Text>
              <Text style={[styles.cell, styles.cellRight, { flex: columns[7].flex }, styles.lastCell]}>{formatNum(row.bank)}</Text>
            </View>
          ))}

          <View style={styles.row}>
            <Text style={[styles.cell, { flex: columns[0].flex }]}>TOTAL</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: columns[1].flex }]}></Text>
            <Text style={[styles.cell, styles.cellRight, { flex: columns[2].flex }]}>{formatNum(totalRow.quantity)}</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: columns[3].flex }]}>{formatNum(totalRow.amount)}</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: columns[4].flex }]}>{formatNum(totalRow.zat)}</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: columns[5].flex }]}>{formatNum(totalRow.vcf)}</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: columns[6].flex }]}>{formatNum(totalRow.cash)}</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: columns[7].flex }, styles.lastCell]}>{formatNum(totalRow.bank)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View style={styles.sigBlock}>
              <Text>Signature (Counter / Guard)</Text>
              <Text>Name: ____________________</Text>
              <Text>Designation: _____________</Text>
              <Text>Date: _____________________</Text>
              <View style={styles.sigLine} />
            </View>
            <View style={styles.sigBlock}>
              <Text>Signature (Officer)</Text>
              <Text>Name: ____________________</Text>
              <Text>Designation: _____________</Text>
              <Text>Date: _____________________</Text>
              <View style={styles.sigLine} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
