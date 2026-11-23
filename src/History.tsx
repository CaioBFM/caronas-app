import { useState } from "react";
import { Alert, View } from "react-native";
import { Badge, Box, Button, Empty, Header, T, s, useColors } from "./ui";
import type { Person, Ride } from "./model";
export function History({
  rides,
  people,
  edit,
  remove,
}: {
  rides: Ride[];
  people: Person[];
  edit: (r: Ride) => void;
  remove: (id: number) => void;
}) {
  const c = useColors(),
    [filter, setFilter] = useState("Todas"),
    now = new Date();
  const visible = rides.filter(
    (r) =>
      filter === "Todas" ||
      (filter === "Este mês" &&
        new Date(r.date).getMonth() === now.getMonth() &&
        new Date(r.date).getFullYear() === now.getFullYear()),
  );
  return (
    <>
      <Header title="Histórico" caption="Tudo registrado">
        <Box style={{ backgroundColor: c.soft, padding: 9 }}>
          <T bold color={c.sage}>
            {rides.length}
          </T>
        </Box>
      </Header>
      <View style={s.wrap}>
        {["Todas", "Este mês", "Recebidas"].map((f) => (
          <Button
            key={f}
            selected={filter === f}
            onPress={() => setFilter(f)}
            style={{
              backgroundColor: filter === f ? c.sage : c.surface,
              borderColor: c.line,
              borderWidth: 1,
              borderRadius: 16,
              paddingHorizontal: 13,
            }}
          >
            <T size={11} color={filter === f ? "white" : c.muted}>
              {f}
            </T>
          </Button>
        ))}
      </View>
      {!visible.length && (
        <Empty
          title={
            filter === "Recebidas"
              ? "Nenhuma carona recebida"
              : "Nenhuma carona ainda"
          }
          detail="Suas viagens registradas aparecerão aqui."
        />
      )}
      {visible.map((r) => (
        <Box key={r.id}>
          <View style={s.row}>
            <Badge name="route" />
            <View style={s.grow}>
              <T bold>
                {r.route} · {r.direction}
              </T>
              <T size={11} color={c.muted}>
                {new Date(r.date).toLocaleDateString("pt-BR")} · {r.km} km
              </T>
            </View>
          </View>
          <T size={12}>
            {people
              .filter((p) => r.passengers.includes(p.id))
              .map((p) => p.name)
              .join(", ")}
          </T>
          <View style={s.between}>
            <Button onPress={() => edit(r)}>
              <T bold color={c.sage}>
                Editar
              </T>
            </Button>
            <Button
              label="Excluir carona"
              onPress={() =>
                Alert.alert("Excluir esta carona?", r.route, [
                  { text: "Cancelar" },
                  { text: "Excluir", onPress: () => remove(r.id) },
                ])
              }
            >
              <Badge name="trash" size={28} color={c.terra} />
            </Button>
          </View>
        </Box>
      ))}
    </>
  );
}
