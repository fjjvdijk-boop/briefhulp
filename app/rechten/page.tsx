import type { Metadata } from "next";
import { RightsPage } from "../../components/InfoPage";

export const metadata: Metadata = {
  title: "Uw rechten bij brieven – Briefhulp",
  description: "Bezwaar, beroep, incassokosten, verkeersboetes, betalingsregeling, beslag, huur, klachten: korte uitleg in gewone taal, met officiële bronnen.",
};

export default function Page() {
  return <RightsPage />;
}
