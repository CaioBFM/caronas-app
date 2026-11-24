import { useRef, useState } from "react";
import { Switch, TextInput, View } from "react-native";
import { Header, Badge, Box, Button, T, s, useColors } from "./ui";
import type { Route } from "./model";
export function Settings({
  dark,
  toggle,
  routes,
  addRoute,
  removeRoute,
  onBackup,
  values,
  change,
}: {
  dark: boolean;
  toggle: () => void;
  routes: Route[];
  addRoute: (route: Route) => Promise<void>;
  removeRoute: (name: string) => Promise<void>;
  onBackup?: () => void;
  values: number[];
  change: (v: number[]) => void;
}) {
  const c = useColors(),
    [adding, add] = useState(false),
    [name, setName] = useState(""),
    [km, setKm] = useState("");
  const routing = useRef(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeError, setRouteError] = useState("");

  async function changeRoute(operation: () => Promise<void>, failure: string) {
    if (routing.current) return;
    routing.current = true;
    setSavingRoute(true);
    setRouteError("");
    try {
      await operation();
    } catch {
      setRouteError(failure);
    } finally {
      routing.current = false;
      setSavingRoute(false);
    }
  }

  const [drafts, setDrafts] = useState<Record<number, string>>({});
  function finishNumber(index: number, text: string) {
    const value = /^\d+(?:[.,]\d+)?$/.test(text)
      ? Number(text.replace(",", "."))
      : NaN;
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[index];
      return next;
    });
    if (!Number.isFinite(value) || value <= 0 || value === values[index])
      return;
    const next = [...values];
    next[index] = value;
    if (next[2] <= next[3]) change(next);
  }
  const valid =
    name.trim() &&
    /^\d+$/.test(km) &&
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: 4,
        }}
      >
        <Button
          style={{ width: 44, height: 44, padding: 0, flexShrink: 0 }}
          label={"Diminuir " + labels[i]}
          onPress={() => step(i, -delta)}
        >
          <Badge name="minus" size={24} />
        </Button>
        <TextInput
          accessibilityLabel={labels[i]}
          keyboardType="decimal-pad"
          value={drafts[i] ?? String(values[i]).replace(".", ",")}
          onChangeText={(text) =>
            setDrafts((previous) => ({ ...previous, [i]: text }))
          }
          onEndEditing={({ nativeEvent }) => finishNumber(i, nativeEvent.text)}
          style={{
            flex: 1,
            minWidth: 0,
            maxWidth: 120,
            textAlign: "center",
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 8,
            padding: 8,
            color: c.text,
            fontSize: 15,
          }}
        />
        <T size={13}>{unit}</T>
        <Button
          style={{ width: 44, height: 44, padding: 0, flexShrink: 0 }}
          label={"Aumentar " + labels[i]}
          onPress={() => step(i, delta)}
        >
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
          <View key={label} style={{ gap: 5, paddingVertical: 5 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
            >
              <Badge name={i ? "fuel" : "car"} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T bold size={11}>
                  {label}
                </T>
                <T size={10} color={c.muted}>
                  Usado nos cálculos
                </T>
              </View>
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
          <View key={i} style={{ width: "100%", gap: 5 }}>
            <T size={10} color={c.muted}>
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
        <Button
          disabled={savingRoute}
          onPress={() => {
            add(!adding);
            setRouteError("");
          }}
        >
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
              disabled={savingRoute}
              onPress={() =>
                void changeRoute(
                  () => removeRoute(r.name),
                  "Não foi possível excluir a rota.",
                )
              }
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
              editable={!savingRoute}
              style={{
                color: c.text,
                minHeight: 44,
                borderBottomWidth: 1,
                borderColor: c.line,
              }}
            />
            <TextInput
              accessibilityLabel="Distância da rota"
              placeholder="Distância (1 a 40 km)"
              placeholderTextColor={c.muted}
              keyboardType="number-pad"
              value={km}
              onChangeText={setKm}
              editable={!savingRoute}
              style={{
                color: c.text,
                minHeight: 44,
                borderBottomWidth: 1,
                borderColor: c.line,
              }}
            />
            <Button
              disabled={!valid || savingRoute}
              onPress={() =>
                void changeRoute(async () => {
                  await addRoute({ name: name.trim(), km: +km });
                  add(false);
                  setName("");
                  setKm("");
                }, "Não foi possível salvar a rota. Confira se o nome já está em uso.")
              }
            >
              <T bold color={c.sage}>
                Salvar rota
              </T>
            </Button>
          </>
        )}
      </Box>
      {!!routeError && <T color={c.terra}>{routeError}</T>}
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
      {onBackup && (
        <Box>
          <Button
            disabled={savingRoute}
            onPress={onBackup}
            style={{ backgroundColor: c.sage }}
          >
            <T bold color={c.onAccent}>
              Backup e restauração
            </T>
          </Button>
        </Box>
      )}
      <View style={s.center}>
        <T size={10} color={c.muted}>
          Caronas · versão 1.0
        </T>
      </View>
    </>
  );
}
