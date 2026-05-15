import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const R2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
console.log("R2_PUBLIC_URL:", R2);

const storagePath = "wp/2026/04/krung-full-exterior.jpg";
if (storagePath.startsWith("wp/") && R2) {
  console.log("Generated URL:", `${R2}/${storagePath}`);
} else {
  console.log("R2 URL generation FAILED - R2 empty:", !R2);
}
