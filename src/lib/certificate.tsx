import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CertificateData {
  soundId: string
  title: string
  creatorName: string
  creatorEmail: string
  fileHash: string
  createdByDate: string        // ISO date string
  registeredAt: string         // ISO datetime string
  duration?: number | null
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: '#0A0A0A',
    padding: 48,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 24,
    borderBottom: '1px solid #222222',
  },
  logo: {
    fontSize: 20,
    color: '#F0F0F0',
    letterSpacing: 2,
  },
  logoAccent: {
    color: '#C8F135',
  },
  certLabel: {
    fontSize: 8,
    color: '#666666',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  certId: {
    fontSize: 7,
    color: '#444444',
    fontFamily: 'Courier',
    textAlign: 'right',
    marginTop: 4,
  },
  // Title area
  eyebrow: {
    fontSize: 7,
    color: '#C8F135',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headline: {
    fontSize: 28,
    color: '#F0F0F0',
    marginBottom: 6,
    lineHeight: 1.1,
  },
  headlineAccent: {
    color: '#C8F135',
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 40,
    lineHeight: 1.5,
  },
  // Fields
  fieldGrid: {
    flexDirection: 'column',
    gap: 2,
    marginBottom: 32,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#111111',
    padding: '12 16',
  },
  fieldLabel: {
    fontSize: 7,
    color: '#666666',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    width: 120,
    flexShrink: 0,
  },
  fieldValue: {
    fontSize: 9,
    color: '#F0F0F0',
    flex: 1,
    textAlign: 'right',
  },
  // Hash section
  hashBox: {
    backgroundColor: '#0D0D0D',
    border: '1px solid #1A1A1A',
    padding: '14 16',
    marginBottom: 32,
  },
  hashLabel: {
    fontSize: 7,
    color: '#C8F135',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  hashValue: {
    fontSize: 8,
    color: '#888888',
    fontFamily: 'Courier',
    lineHeight: 1.4,
  },
  // Legal text
  legal: {
    fontSize: 7.5,
    color: '#444444',
    lineHeight: 1.7,
    marginBottom: 32,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTop: '1px solid #1A1A1A',
  },
  footerLeft: {
    fontSize: 7,
    color: '#333333',
  },
  footerRight: {
    fontSize: 7,
    color: '#C8F135',
    letterSpacing: 1,
  },
  // Accent bar
  accentBar: {
    height: 2,
    backgroundColor: '#C8F135',
    marginBottom: 32,
    width: 40,
  },
})

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generateCertificatePdf(data: CertificateData): Promise<Buffer> {
  const registeredDate = new Date(data.registeredAt)
  const createdDate = new Date(data.createdByDate)

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const formatDateTime = (d: Date) =>
    `${formatDate(d)} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC`

  return renderToBuffer(
    <Document
      title={`SONICLAIM Certificate — ${data.title}`}
      author="SONICLAIM"
      subject="Audio Ownership Certificate"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>
            SONIC<Text style={s.logoAccent}>LAIM</Text>
          </Text>
          <View>
            <Text style={s.certLabel}>Ownership Certificate</Text>
            <Text style={s.certId}>#{data.soundId.split('-')[0].toUpperCase()}</Text>
          </View>
        </View>

        <Text style={s.eyebrow}>Audio Ownership Certificate</Text>
        <Text style={s.headline}>{data.title}</Text>
        <Text style={s.subtitle}>
          Registered by {data.creatorName} · SONICLAIM Rights Registry
        </Text>
        <View style={s.accentBar} />

        <View style={s.fieldGrid}>
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Rights holder</Text><Text style={s.fieldValue}>{data.creatorName}</Text></View>
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Contact</Text><Text style={s.fieldValue}>{data.creatorEmail}</Text></View>
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Sound title</Text><Text style={s.fieldValue}>{data.title}</Text></View>
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Created on</Text><Text style={s.fieldValue}>{formatDate(createdDate)}</Text></View>
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Registered</Text><Text style={s.fieldValue}>{formatDateTime(registeredDate)}</Text></View>
          {data.duration && (
            <View style={s.fieldRow}><Text style={s.fieldLabel}>Duration</Text><Text style={s.fieldValue}>{Math.round(data.duration)}s</Text></View>
          )}
          <View style={s.fieldRow}><Text style={s.fieldLabel}>Certificate ID</Text><Text style={s.fieldValue}>{data.soundId}</Text></View>
        </View>

        <View style={s.hashBox}>
          <Text style={s.hashLabel}>SHA-256 Audio Fingerprint</Text>
          <Text style={s.hashValue}>{data.fileHash}</Text>
        </View>

        <Text style={s.legal}>
          This certificate confirms that the audio work identified above was registered on the SONICLAIM rights platform on the date stated. The SHA-256 fingerprint above is a cryptographic hash of the original audio file, providing tamper-evident proof of the file's contents at the time of registration.
          {'\n\n'}
          Under UK copyright law (Copyright, Designs and Patents Act 1988), copyright in a sound recording vests automatically in its creator upon creation. This certificate, together with the audio fingerprint and registration timestamp, constitutes evidence of the rights holder's ownership claim and may be used to support licensing negotiations, platform reporting, or legal proceedings.
          {'\n\n'}
          SONICLAIM operates as an agent for the rights holder and does not claim ownership of any registered audio. All licensing revenue is distributed 80% to the rights holder and 20% to SONICLAIM as a facilitation fee.
          {'\n\n'}
          For licensing enquiries: arinze@soniclaim.com · soniclaim.com
        </Text>

        <View style={s.footer}>
          <Text style={s.footerLeft}>
            soniclaim.com · arinze@soniclaim.com{'\n'}
            Issued {formatDate(registeredDate)}
          </Text>
          <Text style={s.footerRight}>SONICLAIM VERIFIED</Text>
        </View>
      </Page>
    </Document>
  )
}
