import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { money, parsePaymentAmount } from "./finance";
import type { Payment, Person } from "./model";
import { Box, Button, Header, T, s, useColors } from "./ui";

export type PaymentTarget = { personId?: number; existing?: Payment };

export function PaymentForm({
  target,
  people,
  balances,
  back,
  save,
}: {
  target: PaymentTarget;
  people: Person[];
  balances: ReadonlyMap<number, number>;
  back: () => void;
  save: (
    personId: number,
    amountCents: number,
    existing?: Payment,
  ) => Promise<void>;
}) {
  const c = useColors();
  const [personId, select] = useState(target.personId);
  const [input, setInput] = useState(
    target.existing
      ? (target.existing.amountCents / 100).toFixed(2).replace(".", ",")
      : "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const person = people.find((p) => p.id === personId);
  const eligible = people.filter((p) => (balances.get(p.id) ?? 0) > 0);
  const maximum =
    (balances.get(personId ?? -1) ?? 0) + (target.existing?.amountCents ?? 0);

  async function submit() {
    if (submitting.current || !person) return;
    const amount = parsePaymentAmount(input);
    if (amount === null)
      return setError("Informe um valor válido maior que zero.");
    if (amount > maximum) return setError("O valor excede o saldo devedor.");
    submitting.current = true;
    setBusy(true);
    try {
      await save(person.id, amount, target.existing);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível salvar o pagamento.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Header
        caption="Pagamentos"
        title={target.existing ? "Editar pagamento" : "Registrar pagamento"}
      >
        <Button onPress={back} disabled={busy}>
          <T bold>Voltar</T>
        </Button>
      </Header>
      {target.personId === undefined && (
        <Box>
          <T bold>Selecione a pessoa</T>
          {!eligible.length && <T color={c.muted}>Nenhum saldo devedor.</T>}
          {eligible.map((p) => (
            <Button
              key={p.id}
              disabled={busy}
              selected={p.id === personId}
              onPress={() => {
                select(p.id);
                setError("");
              }}
              style={{
                backgroundColor: p.id === personId ? c.soft : c.secondary,
              }}
            >
              <T>
                {p.name} · {money(balances.get(p.id) ?? 0)}
              </T>
            </Button>
          ))}
        </Box>
      )}
      {person && (
        <Box>
          <T bold>{person.name}</T>
          <T color={c.muted}>Valor máximo · {money(maximum)}</T>
          <TextInput
            accessibilityLabel="Valor recebido em reais"
            placeholder="Valor em reais"
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
            value={input}
            editable={!busy}
            onChangeText={(text) => {
              setInput(text);
              setError("");
            }}
            style={{
              color: c.text,
              backgroundColor: c.secondary,
              borderRadius: 12,
              padding: 12,
            }}
          />
          {!!error && <T color={c.terra}>{error}</T>}
          <View style={s.wrap}>
            <Button
              disabled={busy || !maximum}
              onPress={() => {
                setInput((maximum / 100).toFixed(2).replace(".", ","));
                setError("");
              }}
            >
              <T bold color={c.sage}>
                Preencher total
              </T>
            </Button>
            <Button
              disabled={busy || !maximum}
              onPress={() => void submit()}
              style={{ backgroundColor: c.soft }}
            >
              <T bold>Confirmar</T>
            </Button>
          </View>
        </Box>
      )}
    </>
  );
}
