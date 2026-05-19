import * as ftp from "basic-ftp";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ftp.Client(30000);
await client.access({
  host: "27.254.86.99", port: 2121,
  user: "last@xn--72ch7bybxexd0cc.com", password: "last1234", secure: false,
});

console.log("=== /public_html/wp-content/uploads ===");
const years = await client.list("/public_html/wp-content/uploads");
years.slice(0,20).forEach(f => console.log(f.type === 1 ? `[DIR] ${f.name}` : `[FILE] ${f.name}`));

console.log("\n=== /public_html/wp-content/uploads/2026 ===");
const months = await client.list("/public_html/wp-content/uploads/2026");
months.forEach(f => console.log(f.type === 1 ? `[DIR] ${f.name}` : `[FILE] ${f.name}`));

console.log("\n=== /public_html/wp-content/uploads/2026/02 (sample) ===");
const files = await client.list("/public_html/wp-content/uploads/2026/02");
console.log(`Total: ${files.length} files`);
files.slice(0,5).forEach(f => console.log(`  ${f.name}`));

client.close();
