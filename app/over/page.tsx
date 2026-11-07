import type { Metadata } from "next";
import { AboutPage } from "../../components/InfoPage";

export const metadata: Metadata = { title: "Over Briefhulp" };

export default function Page() {
  return <AboutPage />;
}
