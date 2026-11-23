export type Tab = "Início" | "Histórico" | "Pessoas" | "Ajustes";
export type Person = { id: number; name: string };
export type Route = { name: string; km: number };
export type Ride = {
  id: number;
  route: string;
  direction: string;
  km: number;
  passengers: number[];
  date: number;
};
export const defaultRoutes: Route[] = [
  { name: "UFLA", km: 12 },
  { name: "Centro", km: 7 },
];
