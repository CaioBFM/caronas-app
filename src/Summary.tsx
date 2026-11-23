import { View } from "react-native";
import { Badge, Box, T, s, useColors } from "./ui";
import { money, type calculateRide } from "./finance";
export function Summary({
  limits,
  amounts,
  passengerCount,
}: {
  limits: number[];
  amounts: ReturnType<typeof calculateRide> | null;
  passengerCount: number;
}) {
  const c = useColors();
  return (
    <Box>
      <View style={s.row}>
        <Badge name="fuel" />
        <View>
          <T bold>Resumo da carona</T>
          <T size={10} color={c.muted}>
            {!amounts
              ? "Confira a distância e os ajustes"
              : passengerCount
                ? "Estimativa da carona"
                : "Selecione os passageiros"}
          </T>
        </View>
      </View>
      {(["Custo da gasolina", "Por passageiro"] as const).map(
        (label, index) => (
          <View style={s.between} key={label}>
            <T size={12} color={c.muted}>
              {label}
            </T>
            <T bold>
              {amounts && (!index || passengerCount)
                ? money(index ? amounts.fareCents : amounts.fuelCostCents)
                : "—"}
            </T>
          </View>
        ),
      )}
      <View
        style={[
          s.between,
          { borderTopWidth: 1, borderColor: c.line, paddingTop: 10 },
        ]}
      >
        <T bold>Total a receber</T>
        <T title size={20} color={c.sage}>
          {amounts && passengerCount ? money(amounts.totalCents) : "—"}
        </T>
      </View>
      <T size={10} color={c.muted}>
        Limites por pessoa:{" "}
        {limits.map((n) => "R$ " + n.toFixed(2).replace(".", ",")).join(" a ")}
      </T>
    </Box>
  );
}
