import { useState } from "react";
import { Switch, TextInput, View } from "react-native";
import { Header, Badge, Box, Button, T, s, useColors } from "./ui";
import type { Route } from "./model";
export function Settings({
  dark,
  toggle,
  routes,
  setRoutes,
  values,
  change,
}: {
  dark: boolean;
  toggle: () => void;
  routes: Route[];
  setRoutes: (r: Route[]) => void;
  values: number[];
  change: (v: number[]) => void;
}) {
  const c = useColors(),
    [adding, add] = useState(false),
    [name, setName] = useState(""),
    [km, setKm] = useState("");
  const valid =
    name.trim() &&
    Number.isInteger(+km) &&
    +km >= 1 &&
    +km <= 40 &&
    !["Outro destino", ...routes.map((r) => r.name)].some(
      (n) => n.toLowerCase() === name.trim().toLowerCase(),
    );
  function step(index: number, delta: number) {
    const next = [...values];
    next[index] = Math.max(
      Math.abs(delta),
      Math.round((next[index] + delta) * 100) / 100,
    );
    if (next[2] <= next[3]) change(next);
  }
  function controls(i: number, unit: string, delta: number) {
    return (
      <View style={s.row}>
        <Button label={"Diminuir " + labels[i]} onPress={() => step(i, -delta)}>
          <Badge name="minus" size={24} />
        </Button>
        <T size={11}>
          {values[i].toLocaleString("pt-BR")} {unit}
        </T>
        <Button label={"Aumentar " + labels[i]} onPress={() => step(i, delta)}>
          <Badge name="plus" size={24} />
        </Button>
      </View>
    );
  }
  const labels = ["Consumo do carro", "Preço da gasolina", "Mínimo", "Máximo"];
  return (
    <>
      <Header title="Configurações" caption="Do seu jeito" />
      <T bold size={11} color={c.muted}>
        CÁLCULO
      </T>
      <Box>
        {labels.slice(0, 2).map((label, i) => (
          <View key={label} style={s.row}>
            <Badge name={i ? "fuel" : "car"} />
            <View style={s.grow}>
              <T bold size={12}>
                {label}
              </T>
              <T size={9} color={c.muted}>
                Usado nos cálculos
              </T>
            </View>
            {controls(i, i ? "R$/L" : "km/L", i ? 0.1 : 1)}
          </View>
        ))}
      </Box>
      <T bold size={11} color={c.muted}>
        VALOR POR PASSAGEIRO
      </T>
      <Box style={{ ...s.wrap, justifyContent: "space-around" }}>
        {[2, 3].map((i) => (
          <View key={i}>
            <T size={11} color={c.muted}>
              {labels[i]}
            </T>
            {controls(i, "R$", 0.5)}
          </View>
        ))}
      </Box>
      <View style={s.between}>
        <T bold size={11} color={c.muted}>
          ROTAS SALVAS
        </T>
        <Button onPress={() => add(!adding)}>
          <T bold size={12} color={c.sage}>
            {adding ? "Cancelar" : "+ Adicionar"}
          </T>
        </Button>
      </View>
      <Box>
        {routes.map((r) => (
          <View key={r.name} style={s.row}>
            <Badge name="route" />
            <View style={s.grow}>
              <T bold>{r.name}</T>
              <T size={11} color={c.muted}>
                {r.km} km
              </T>
            </View>
            <Button
              label={"Excluir " + r.name}
              onPress={() => setRoutes(routes.filter((item) => item !== r))}
            >
              <Badge name="trash" size={26} />
            </Button>
          </View>
        ))}
        {!routes.length && <T color={c.muted}>Nenhuma rota salva.</T>}
        {adding && (
          <>
            <TextInput
              accessibilityLabel="Nome da rota"
              placeholder="Nome da rota"
              placeholderTextColor={c.muted}
              value={name}
              onChangeText={setName}
              style={{ color: c.text }}
            />
            <TextInput
              accessibilityLabel="Distância da rota"
              placeholder="Distância (1 a 40 km)"
              placeholderTextColor={c.muted}
              keyboardType="number-pad"
              value={km}
              onChangeText={setKm}
              style={{ color: c.text }}
            />
            <Button
              disabled={!valid}
              onPress={() => {
                setRoutes([...routes, { name: name.trim(), km: +km }]);
                add(false);
                setName("");
                setKm("");
              }}
            >
              <T bold color={c.sage}>
                Salvar rota
              </T>
            </Button>
          </>
        )}
      </Box>
      <T bold size={11} color={c.muted}>
        APARÊNCIA
      </T>
      <Box style={s.row}>
        <Badge name={dark ? "moon" : "sun"} />
        <View style={s.grow}>
          <T bold>Tema escuro</T>
          <T size={10} color={c.muted}>
            Mais confortável à noite
          </T>
        </View>
        <Switch
          accessibilityLabel="Tema escuro"
          value={dark}
          onValueChange={toggle}
          trackColor={{ true: c.sage }}
        />
      </Box>
      <View style={s.center}>
        <T size={10} color={c.muted}>
          Caronas · versão 1.0
        </T>
      </View>
    </>
  );
}
