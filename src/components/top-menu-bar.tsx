import { getAllCategoriesPublic } from "@/lib/db/listings";
import { TopMenuBarClient } from "./top-menu-bar-client";

export async function TopMenuBar() {
  const categories = await getAllCategoriesPublic();
  return <TopMenuBarClient categories={categories} />;
}
