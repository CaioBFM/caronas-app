import { View } from "react-native";
import { Badge, Box, Button, Empty, Header, T, s, useColors } from "./ui";
import { Icon } from "./Icon";
export function Home({
  count,
  onNew,
  onPeople,
}: {
  count: number;
  onNew: () => void;
  onPeople: () => void;
}) {
  const c = useColors();
  return (
    <>
      <Header caption="Olá!" title="Caronas">
        <Badge name="people" size={42} background={c.terra} color="white" />
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
          <T color="white">A receber</T>
          <Badge name="wallet" size={31} background="#ffffff22" color="white" />
        </View>
        <T title size={36} color="white">
          R$ 0,00
        </T>
        <T size={12} color="white">
          R$ 0,00 recebido · {count} {count === 1 ? "carona" : "caronas"}
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
        <Badge name="plus" background="#ffffff33" color="white" />
        <View style={s.grow}>
          <T bold size={15} color="white">
            Nova carona
          </T>
          <T size={11} color="white">
            Registre em poucos segundos
          </T>
        </View>
        <Icon name="arrow" color="white" />
      </Button>
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
        <Empty title="Tudo em dia" detail="Nenhum valor pendente por aqui." />
      </View>
      <View style={s.row}>
        <Badge name="check" size={22} />
        <View>
          <T bold size={11}>
            Contas atualizadas
          </T>
          <T size={10} color={c.muted}>
            Nenhum pagamento registrado.
          </T>
        </View>
      </View>
    </>
  );
}
