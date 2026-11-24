import { useState } from "react";
import { View } from "react-native";
import { getStatistics, money, monthOf } from "./finance";
import type { Payment, Person, Ride } from "./model";
import { Box, Button, Header, T, s, useColors } from "./ui";

const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function Statistics({
  people,
  rides,
  payments,
  back,
}: {
  people: Person[];
  rides: Ride[];
  payments: Payment[];
  back: () => void;
}) {
  const c = useColors();
  const [month, select] = useState<string>();
  const [showMonths, setShowMonths] = useState(false);
  const months = [
    ...new Set([
      monthOf(Date.now()),
      ...[...rides, ...payments].map((r) => monthOf(r.date)),
    ]),
  ]
    .sort()
    .reverse();
  const label = (value: string) =>
    monthLabel.format(new Date(`${value}-01T12:00:00`));
  const totals = getStatistics(rides, payments, month);
  return (
    <>
      <Header title="Estatísticas" caption="Caronas e pagamentos">
        <Button onPress={back}>
          <T bold>Voltar</T>
        </Button>
      </Header>
      <Box>
        <Button
          onPress={() => setShowMonths(!showMonths)}
          style={{ backgroundColor: c.soft }}
        >
          <T bold>Período · {month ? label(month) : "Completo"}</T>
        </Button>
        {showMonths &&
          [undefined, ...months].map((value) => (
            <Button
              key={value ?? "all"}
              selected={value === month}
              onPress={() => {
                select(value);
                setShowMonths(false);
              }}
            >
              <T bold={value === month}>
                {value ? label(value) : "Período completo"}
              </T>
            </Button>
          ))}
      </Box>
      <Box>
        {[
          ["Total recebido", money(totals.received)],
          ["Total pendente", money(totals.pending)],
          ["Custo estimado com gasolina", money(totals.fuelCost)],
          ["Custo menos recebido", money(totals.difference)],
          ["Caronas", totals.count],
          ["Quilometragem", `${number.format(totals.km)} km`],
        ].map(([name, value]) => (
          <View key={name} style={s.between}>
            <View style={s.grow}>
              <T>{name}</T>
            </View>
            <T bold>{value}</T>
          </View>
        ))}
        {month && (
          <T size={12} color={c.muted}>
            Recebimentos pela data do pagamento. O pendente é o saldo atual das
            caronas do mês, quitando as mais antigas primeiro.
          </T>
        )}
      </Box>
      <T title size={19}>
        Por pessoa
      </T>
      {!totals.byPerson.size && (
        <T color={c.muted}>Sem movimentações no período.</T>
      )}
      {people.map((p) => {
        const values = totals.byPerson.get(p.id);
        return (
          values && (
            <Box key={p.id}>
              <T bold>{p.name}</T>
              <T>
                {values.count} {values.count === 1 ? "carona" : "caronas"} ·{" "}
                {money(values.charged)} cobrado
              </T>
              <T>
                {money(values.received)} recebido · {money(values.pending)}{" "}
                pendente
              </T>
            </Box>
          )
        );
      })}
    </>
  );
}
