"use client";
import OpportunityMap from "@/components/maps/OpportunityMap";
const leads = [
  { id: "1", name: "Franklin Barbecue", score: 91, category: "Restaurant", address: "900 E 11th St, Austin, TX", latitude: 30.2701, longitude: -97.7313, projectValue: "$5,000 - $15,000" },
  { id: "2", name: "Torchy's Tacos", score: 74, category: "Restaurant", address: "1822 S Congress Ave, Austin, TX", latitude: 30.2453, longitude: -97.7509 },
  { id: "3", name: "Bouldin Creek Cafe", score: 55, category: "Cafe", address: "1900 S 1st St, Austin, TX", latitude: 30.2465, longitude: -97.7547 },
  { id: "4", name: "Sample Spa (city only)", score: 82, category: "Spa", city: "Round Rock", state: "Texas", country: "United States" },
];
export default function Page() {
  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <OpportunityMap leads={leads} focusLocation="All locations" onSelectLead={(id) => alert(id)} />
    </div>
  );
}
