export type Tab = "Início" | "Histórico" | "Pessoas" | "Ajustes";
export type Person = { id: number; name: string };
export type Route = { name: string; km: number };
export type Ride = {
  id: number;
  route: string;
  km: number;
  passengers: number[];
  date: number;
  fuelCostCents: number;
  fareCents: number;
  pricing: Pricing;
};
export const defaultRoutes: Route[] = [
  { name: "UFLA", km: 12 },
  { name: "Centro", km: 7 },
];

export type Pricing = {
  consumption: number;
  gasPrice: number;
  minFare: number;
  maxFare: number;
};
export type RideDraft = Omit<Ride, "id">;
