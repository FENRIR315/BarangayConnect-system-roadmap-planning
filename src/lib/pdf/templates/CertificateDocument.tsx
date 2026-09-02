"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
  },
  headerText: {
    textAlign: "center",
    flex: 1,
    marginHorizontal: 10,
  },
  republic: {
    fontSize: 9,
    textAlign: "center",
  },
  barangayName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  office: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  line: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginVertical: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    textDecoration: "underline",
  },
  body: {
    fontSize: 12,
    lineHeight: 2,
    marginBottom: 20,
  },
  field: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 130,
    fontSize: 12,
  },
  value: {
    fontSize: 12,
  },
  purpose: {
    fontSize: 12,
    lineHeight: 1.8,
    textAlign: "justify",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  captain: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 30,
  },
  captainName: {
    fontSize: 14,
    fontWeight: "bold",
    textDecoration: "underline",
  },
  captainTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
  },
  footerText: {
    fontSize: 8,
    color: "#666",
  },
});

interface CertificateDocProps {
  barangayName: string;
  municipality: string;
  province: string;
  certificateNumber: string;
  documentType: string;
  residentName: string;
  address: string;
  purpose: string;
  dateIssued: string;
  captainName: string;
  logoUrl?: string | null;
}

export function CertificateDocument({
  barangayName,
  municipality,
  province,
  certificateNumber,
  documentType,
  residentName,
  address,
  purpose,
  dateIssued,
  captainName,
  logoUrl,
}: CertificateDocProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.logo} src={logoUrl || "/logos/barangay.png"} />
          <View style={styles.headerText}>
            <Text style={styles.republic}>
              Republic of the Philippines
            </Text>
            <Text style={styles.republic}>
              Province of {province}
            </Text>
            <Text style={styles.republic}>
              Municipality of {municipality}
            </Text>
            <Text style={styles.barangayName}>{barangayName}</Text>
            <Text style={styles.office}>BARANGAY HALL</Text>
          </View>
          <Image style={styles.logo} src="/logos/philippines.png" />
        </View>

        <View style={styles.line} />

        <Text style={styles.title}>{documentType}</Text>

        <View style={styles.body}>
          <Text style={styles.purpose}>
            TO WHOM IT MAY CONCERN:
          </Text>
          <View style={{ height: 10 }} />
          <Text style={styles.purpose}>
            This is to certify that {residentName}, of legal age, residing at {address},
            is a bona fide resident of {barangayName}.
          </Text>
          <View style={{ height: 10 }} />
          <Text style={styles.purpose}>
            This certification is issued upon the request of the above-named person
            for the following purpose: {purpose}.
          </Text>
          <View style={{ height: 10 }} />
          <Text style={styles.purpose}>
            This certification is being issued at the request of the party concerned
            for whatever legal purpose it may serve.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.captain}>Given this {dateIssued} at {barangayName}, {municipality}, {province}.</Text>
          <Text style={styles.captainName}>{captainName}</Text>
          <Text style={styles.captainTitle}>Barangay Captain</Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.footerText}>Certificate No: {certificateNumber}</Text>
          <Text style={styles.footerText}>Verification: /verify/{certificateNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
