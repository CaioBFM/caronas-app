import { useState } from "react";
import { View } from "react-native";
import Slider from "@react-native-community/slider";
import { Badge, Box, Button, T, s, useColors } from "./ui";
import { Summary } from "./Summary";
import type { Route, Ride, Person } from "./model";
export function NewRide({
  routes,
  people,
  initial,
  back,
  save,
  limits,
}: {
  routes: Route[];
  people: Person[];
  initial: Ride | null;
  back: () => void;
  save: (ride: Ride) => void;
  limits: number[];
}) {
  const c = useColors(),
    [route, choose] = useState(
      initial?.route ?? routes[0]?.name ?? "Outro destino",
    );
  const [km, distance] = useState(initial?.km ?? routes[0]?.km ?? 10),
    [selected, select] = useState(initial?.passengers ?? []),
    [direction, setDirection] = useState(initial?.direction ?? "Ida");
  const options = [
    ...new Set([...routes.map((r) => r.name), route, "Outro destino"]),
  ];
  return (
    <>
      <View style={s.row}>
        <Button
          label="Voltar"
          style={{
            backgroundColor: c.surface,
            transform: [{ rotate: "180deg" }],
          }}
          onPress={back}
        >
          <Badge name="arrow" size={24} background={c.surface} />
        </Button>
        <View>
          <T title size={22}>
            {initial ? "Editar carona" : "Nova carona"}
          </T>
          <T size={11} color={c.muted}>
            Rápido e sem complicação
          </T>
        </View>
      </View>
      <View
        style={[
          s.row,
          { backgroundColor: c.secondary, borderRadius: 13, padding: 4 },
        ]}
      >
        {["Ida", "Volta"].map((d) => (
          <Button
            key={d}
            selected={direction === d}
            style={{
              flex: 1,
              backgroundColor: direction === d ? c.surface : c.secondary,
            }}
            onPress={() => setDirection(d)}
          >
            <T bold>{d}</T>
          </Button>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <T bold>Para onde?</T>
        <View style={s.wrap}>
          {options.map((name) => (
            <Button
              key={name}
              selected={name === route}
              onPress={() => {
                choose(name);
                const found = routes.find((r) => r.name === name);
                if (found) distance(found.km);
              }}
              style={{
                flexGrow: 1,
                flexBasis: "30%",
                gap: 4,
                minHeight: 66,
                borderRadius: 14,
                backgroundColor: name === route ? c.soft : c.surface,
                borderColor: name === route ? c.sage : c.line,
                borderWidth: 1,
              }}
            >
              <Badge
                name={name === "Outro destino" ? "plus" : "route"}
                size={28}
              />
              <T bold size={11}>
                {name}
              </T>
            </Button>
          ))}
        </View>
      </View>
      <Box>
        <View style={s.between}>
          <T bold>Distância</T>
          <T bold color={c.sage}>
            {km} km
          </T>
        </View>
        <Slider
          accessibilityLabel="Distância em quilômetros"
          minimumValue={1}
          maximumValue={40}
          step={1}
          value={km}
          onValueChange={distance}
          minimumTrackTintColor={c.sage}
          maximumTrackTintColor={c.line}
          thumbTintColor={c.sage}
        />
        <View style={s.between}>
          <T size={10} color={c.muted}>
            1 km
          </T>
          <T size={10} color={c.muted}>
            40 km
          </T>
        </View>
      </Box>
      <View style={{ gap: 10 }}>
        <View style={s.between}>
          <T bold>Quem vai?</T>
          <Box style={{ padding: 4, backgroundColor: c.soft }}>
            <T bold size={11} color={c.sage}>
              {selected.length}{" "}
              {selected.length === 1 ? "passageiro" : "passageiros"}
            </T>
          </Box>
        </View>
        {people.length === 0 && (
          <T color={c.muted}>Adicione passageiros na aba Pessoas.</T>
        )}
        <View style={s.wrap}>
          {people.map((p) => {
            const active = selected.includes(p.id);
            return (
              <Button
                key={p.id}
                selected={active}
                style={{
                  ...s.row,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: active ? c.sage : c.line,
                  backgroundColor: active ? c.soft : c.surface,
                }}
                onPress={() =>
                  select((ids) =>
                    ids.includes(p.id)
                      ? ids.filter((id) => id !== p.id)
                      : [...ids, p.id],
                  )
                }
              >
                <T bold color={c.sage}>
                  {active ? "✓" : p.name.charAt(0)}
                </T>
                <T size={12}>{p.name}</T>
              </Button>
            );
          })}
        </View>
        <View style={s.row}>
          <Badge name="car" size={23} />
          <T size={11} color={c.muted}>
            {selected.length + 1} {selected.length ? "ocupantes" : "ocupante"}{" "}
            no total, incluindo você
          </T>
        </View>
      </View>
      <Summary limits={limits} />
      <Button
        disabled={!selected.length}
        style={{ backgroundColor: c.terra, minHeight: 52, borderRadius: 17 }}
        onPress={() => {
          const now = Date.now();
          save({
            id: initial?.id ?? now,
            date: initial?.date ?? now,
            km,
            route,
            passengers: selected,
            direction,
          });
        }}
      >
        <T bold color="white">
          ✓ {initial ? "Salvar alterações" : "Registrar carona"}
        </T>
      </Button>
    </>
  );
}
