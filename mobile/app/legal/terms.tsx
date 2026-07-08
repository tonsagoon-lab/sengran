import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>ข้อกำหนดการใช้งาน</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>อัปเดตล่าสุด: มกราคม 2568</Text>

        <Section title="1. การยอมรับข้อกำหนด">
          <Text style={styles.para}>
            การใช้งานแอปพลิเคชันเซ้งร้าน.com ถือว่าท่านยอมรับข้อกำหนดและเงื่อนไขที่ระบุไว้ทั้งหมด หากท่านไม่ยอมรับ กรุณาหยุดใช้งานแอปพลิเคชัน
          </Text>
        </Section>

        <Section title="2. การลงประกาศ">
          <Bullet>ผู้ลงประกาศต้องเป็นเจ้าของหรือมีสิทธิ์โอนสิทธิ์ในกิจการนั้นๆ</Bullet>
          <Bullet>ข้อมูลในประกาศต้องเป็นความจริง ไม่บิดเบือนหรือทำให้เข้าใจผิด</Bullet>
          <Bullet>ห้ามลงประกาศซ้ำซ้อนหรือประกาศที่ไม่ใช่ร้านค้า/กิจการ</Bullet>
          <Bullet>เซ้งร้าน.com สงวนสิทธิ์ลบประกาศที่ผิดเงื่อนไขโดยไม่แจ้งล่วงหน้า</Bullet>
        </Section>

        <Section title="3. ความรับผิดชอบ">
          <Text style={styles.para}>
            เซ้งร้าน.com เป็นเพียงสื่อกลางในการประกาศ ไม่ใช่คู่สัญญาในการซื้อขาย เซ้ง หรือเช่า ผู้ใช้งานต้องตรวจสอบข้อมูลและดำเนินการด้วยความระมัดระวังของตนเอง
          </Text>
        </Section>

        <Section title="4. การระงับบัญชี">
          <Text style={styles.para}>
            เราสงวนสิทธิ์ระงับหรือลบบัญชีที่ฝ่าฝืนข้อกำหนด ใช้งานในทางที่ผิด หรือสร้างความเสียหายแก่ผู้ใช้รายอื่น
          </Text>
        </Section>

        <Section title="5. การเปลี่ยนแปลง">
          <Text style={styles.para}>
            เซ้งร้าน.com อาจปรับปรุงข้อกำหนดเหล่านี้ได้ตลอดเวลา การใช้งานต่อเนื่องหลังการแจ้งเปลี่ยนแปลงถือว่ายอมรับข้อกำหนดใหม่
          </Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6", backgroundColor: "#fff",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  content: { padding: 20, paddingBottom: 40 },
  updated: { fontSize: 11, color: "#9ca3af", marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937", marginBottom: 8 },
  sectionBody: { gap: 4 },
  para: { fontSize: 13, color: "#4b5563", lineHeight: 20 },
  bulletRow: { flexDirection: "row", gap: 8, paddingLeft: 4 },
  bulletDot: { fontSize: 13, color: "#4b5563", lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13, color: "#4b5563", lineHeight: 20 },
});
