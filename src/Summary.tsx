import { View } from "react-native";
import { Badge, Box, T, s, useColors } from "./ui";
export function Summary({ limits }: { limits: number[] }) {
  const c = useColors();
  return (
    <Box>
      <View style={s.row}>
        <Badge name="fuel" />
        <View>
          <T bold>Resumo da carona</T>
          <T size={10} color={c.muted}>
            Simulação indisponível nesta versão
          </T>
        </View>
      </View>
      {["Custo da gasolina", "Por passageiro"].map((label) => (
        <View style={s.between} key={label}>
          <T size={12} color={c.muted}>
            {label}
          </T>
          <T bold>—</T>
        </View>
      ))}
      <View
        style={[
          s.between,
          { borderTopWidth: 1, borderColor: c.line, paddingTop: 10 },
        ]}
      >
        <T bold>Total a receber</T>
        <T title size={20} color={c.sage}>
          —
        </T>
      </View>
      <T size={10} color={c.muted}>
        Limites por pessoa:{" "}
        {limits.map((n) => "R$ " + n.toFixed(2).replace(".", ",")).join(" a ")}
      </T>
    </Box>
  );
}
