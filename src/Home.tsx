import { View } from "react-native";
import { Badge, Box, Button, Empty, Header, T, s, useColors } from "./ui";
import { Icon } from "./Icon";
import { money } from "./finance";
import type { Person } from "./model";

export function Home({
  count,
  people,
  balances,
  onNew,
  onPeople,
  received,
  onPayment,
  onStatistics,
}: {
  count: number;
  received: number;
  onPayment: () => void;
  onStatistics: () => void;
  people: Person[];
  balances: ReadonlyMap<number, number>;
  onNew: () => void;
  onPeople: () => void;
}) {
  const c = useColors();
  const owing = people.filter((person) => (balances.get(person.id) ?? 0) > 0);
  const total = [...balances.values()].reduce((sum, cents) => sum + cents, 0);
  return (
    <>
      <Header caption="Olá!" title="Caronas">
        <Badge
          name="people"
          size={42}
          background={c.terra}
          color={c.onAccent}
        />
      </Header>
      <Box
        style={{
          backgroundColor: c.sage,
          borderWidth: 0,
          borderRadius: 22,
          padding: 21,
          elevation: 3,
        }}
      >
        <View style={s.between}>
          <T color={c.onAccent}>A receber</T>
          <Badge
            name="wallet"
            size={31}
            background="#ffffff22"
            color={c.onAccent}
          />
        </View>
        <T title size={36} color={c.onAccent}>
          {money(total)}
        </T>
        <T size={12} color={c.onAccent}>
          {money(received)} recebido · {count}{" "}
          {count === 1 ? "carona" : "caronas"}
        </T>
      </Box>
      <Button
        onPress={onNew}
        style={{
          ...s.row,
          backgroundColor: c.terra,
          minHeight: 68,
          padding: 15,
          borderRadius: 17,
        }}
      >
        <Badge name="plus" background="#ffffff33" color={c.onAccent} />
        <View style={s.grow}>
          <T bold size={15} color={c.onAccent}>
            Nova carona
          </T>
          <T size={11} color={c.onAccent}>
            Registre em poucos segundos
          </T>
        </View>
        <Icon name="arrow" color={c.onAccent} />
      </Button>
      <View style={s.wrap}>
        <Button
          onPress={onPayment}
          style={{ backgroundColor: c.sage, flexGrow: 1 }}
        >
          <T bold color={c.onAccent}>
            Registrar pagamento
          </T>
        </Button>
        <Button
          onPress={onStatistics}
          style={{ backgroundColor: c.secondary, flexGrow: 1 }}
        >
          <T bold>Estatísticas</T>
        </Button>
      </View>
      <View style={{ gap: 8 }}>
        <View style={s.between}>
          <T title size={17}>
            Pessoas
          </T>
          <Button onPress={onPeople}>
            <T bold size={12} color={c.sage}>
              Ver todas
            </T>
          </Button>
        </View>
        {owing.length ? (
          <Box>
            {owing.map((person) => (
              <View key={person.id} style={s.between}>
                <View style={s.grow}>
                  <T bold>{person.name}</T>
                </View>
                <T bold color={c.terra}>
                  {money(balances.get(person.id) ?? 0)}
                </T>
              </View>
            ))}
          </Box>
        ) : (
          <Empty title="Tudo em dia" detail="Nenhum valor pendente por aqui." />
        )}
      </View>
    </>
  );
}
