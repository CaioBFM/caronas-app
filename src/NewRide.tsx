import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Badge, Box, Button, T, s, useColors } from "./ui";
import { Summary } from "./Summary";
import type { Route, Ride, RideDraft, Person, Pricing } from "./model";
import { calculateRide } from "./finance";

export function NewRide({
  routes,
  people,
  initial,
  back,
  save,
  pricing: currentPricing,
}: {
  routes: Route[];
  people: Person[];
  initial: Ride | null;
  back: () => void;
  save: (ride: RideDraft) => Promise<void>;
  pricing: Pricing;
}) {
  const c = useColors(),
    [route, choose] = useState(
      initial?.route ?? routes[0]?.name ?? "Outro destino",
    );
  const [km, distance] = useState(initial?.km ?? routes[0]?.km ?? 10),
    [selected, select] = useState(initial?.passengers ?? []),
    [kmText, setKmText] = useState(String(initial?.km ?? routes[0]?.km ?? 10));
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const pricing = initial?.pricing ?? currentPricing;
  const validDistance =
    /^\d+(?:[.,]\d*)?$/.test(kmText) && Number(kmText.replace(",", ".")) === km;
  const amounts = (() => {
    if (!validDistance) return null;
    try {
      return calculateRide(
        km,
        pricing.consumption,
        pricing.gasPrice,
        selected.length,
        pricing.minFare,
        pricing.maxFare,
      );
    } catch {
      return null;
    }
  })();
  async function submit() {
    if (pending.current || !amounts || !selected.length) return;
    pending.current = true;
    setSaving(true);
    try {
      await save({
        date: initial?.date ?? Date.now(),
        km,
        route,
        passengers: selected,
        pricing,
        fuelCostCents: amounts.fuelCostCents,
        fareCents: amounts.fareCents,
      });
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
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
          disabled={saving}
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
                if (found) {
                  distance(found.km);
                  setKmText(String(found.km));
                }
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
        <TextInput
          accessibilityLabel="Quilometragem"
          keyboardType="decimal-pad"
          value={kmText}
          onChangeText={(text) => {
            setKmText(text);
            const n = Number(text.replace(",", "."));
            if (Number.isFinite(n) && n >= 1 && n <= 40) distance(n);
          }}
          style={{
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 10,
            padding: 12,
            color: c.text,
            fontSize: 16,
          }}
        />
        <Slider
          accessibilityLabel="Distância em quilômetros"
          minimumValue={1}
          maximumValue={40}
          step={1}
          value={km}
          onValueChange={(value) => {
            distance(value);
            setKmText(String(value));
          }}
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
      {!validDistance && (
        <T color={c.terra}>Informe uma distância entre 1 e 40 km.</T>
      )}
      <Summary
        limits={[pricing.minFare, pricing.maxFare]}
        amounts={amounts}
        passengerCount={selected.length}
      />
      <Button
        disabled={saving || !selected.length || !amounts}
        style={{ backgroundColor: c.terra, minHeight: 52, borderRadius: 17 }}
        onPress={submit}
      >
        <T bold color={c.onAccent}>
          ✓ {initial ? "Salvar alterações" : "Registrar carona"}
        </T>
      </Button>
    </>
  );
}
