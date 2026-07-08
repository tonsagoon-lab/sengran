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

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>นโยบายความเป็นส่วนตัว</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>อัปเดตล่าสุด: มกราคม 2568</Text>

        <Section title="1. ข้อมูลที่เราเก็บ">
          <Bullet>อีเมล ชื่อ เบอร์โทรศัพท์ และ LINE ID ที่ท่านกรอกเมื่อสมัครสมาชิกหรือลงประกาศ</Bullet>
          <Bullet>ข้อมูลการใช้งาน เช่น หน้าที่เข้าชม คำค้นหา และการโต้ตอบกับประกาศ</Bullet>
          <Bullet>รูปภาพและเนื้อหาที่ท่านอัปโหลด</Bullet>
        </Section>

        <Section title="2. วัตถุประสงค์การใช้ข้อมูล">
          <Bullet>แสดงข้อมูลติดต่อในประกาศที่ท่านลงไว้</Bullet>
          <Bullet>ส่งการแจ้งเตือนที่เกี่ยวข้องกับบัญชีหรือประกาศของท่าน</Bullet>
          <Bullet>ปรับปรุงคุณภาพบริการและประสบการณ์ผู้ใช้</Bullet>
        </Section>

        <Section title="3. การเปิดเผยข้อมูล">
          <Text style={styles.para}>
            เราไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลของท่านแก่บุคคลภายนอก ข้อมูลติดต่อในประกาศ (ชื่อ เบอร์ LINE) จะแสดงต่อสาธารณะตามที่ท่านเลือก
          </Text>
        </Section>

        <Section title="4. สิทธิ์ของท่านตาม PDPA">
          <Bullet>สิทธิ์เข้าถึงและขอสำเนาข้อมูลส่วนบุคคล</Bullet>
          <Bullet>สิทธิ์แก้ไขข้อมูลที่ไม่ถูกต้อง</Bullet>
          <Bullet>สิทธิ์ขอลบหรือระงับการใช้ข้อมูล</Bullet>
          <Bullet>สิทธิ์คัดค้านการประมวลผลข้อมูล</Bullet>
          <Text style={[styles.para, { marginTop: 8 }]}>
            ติดต่อใช้สิทธิ์ได้ที่ LINE: <Text style={styles.bold}>salebiz</Text>
          </Text>
        </Section>

        <Section title="5. การรักษาความปลอดภัย">
          <Text style={styles.para}>
            เราใช้บริการ Supabase ที่มีการเข้ารหัสข้อมูลและระบบ Row-Level Security อย่างไรก็ตาม ไม่มีระบบใดที่ปลอดภัย 100% กรุณาดูแลรหัสผ่านของท่านด้วย
          </Text>
        </Section>

        <Section title="6. การเก็บรักษาข้อมูล">
          <Text style={styles.para}>
            ข้อมูลบัญชีจะถูกเก็บตลอดที่บัญชียังใช้งานอยู่ ประกาศที่มีอายุเกิน 1 ปีจะถูกลบรูปภาพออกโดยอัตโนมัติ แต่ข้อความยังคงอยู่เพื่อประโยชน์ทาง SEO
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
  bold: { fontWeight: "700", color: "#1f2937" },
});
