import type { Metadata } from "next";
import { PrivacyPage } from "../../components/InfoPage";

export const metadata: Metadata = { title: "Privacy – Briefhulp" };

export default function Page() {
  return <PrivacyPage />;
}
