import { useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { Badge, Box, Button, Empty, Header, T, s, useColors } from "./ui";
import type { Payment, Person, Ride } from "./model";
import { money } from "./finance";

export function People({
  people,
  rides,
  balances,
  save,
  archive,
  person,
  select,
  payments,
  register,
  editPayment,
  removePayment,
}: {
  people: Person[];
  rides: Ride[];
  balances: ReadonlyMap<number, number>;
  save: (person: Person) => void;
  archive: (id: number) => void;
  person?: Person;
  select: (id?: number) => void;
  payments: Payment[];
  register: (id: number) => void;
  editPayment: (payment: Payment) => void;
  removePayment: (id: number) => void;
}) {
  const c = useColors(),
    [draft, setDraft] = useState<Person | null>(null);
  function submit() {
    if (draft?.name.trim()) {
      save({ ...draft, name: draft.name.trim() });
      setDraft(null);
    }
  }
  if (person) {
    const balance = balances.get(person.id) ?? 0;
    const history = payments.filter(
      (payment) => payment.personId === person.id,
    );
    return (
      <>
        <Header
          title={person.name}
          caption={person.archived ? "Pessoa arquivada" : "Detalhes da pessoa"}
        >
          <Button onPress={() => select()}>
            <T bold>Voltar</T>
          </Button>
        </Header>
        <Box>
          <T>Saldo devedor</T>
          <T title size={25}>
            {money(balance)}
          </T>
          <Button
            disabled={balance <= 0}
            onPress={() => register(person.id)}
            style={{ backgroundColor: c.soft }}
          >
            <T bold>Registrar pagamento</T>
          </Button>
          {!person.archived && (
            <Button
              disabled={balance !== 0}
              onPress={() =>
                Alert.alert(
                  "Arquivar pessoa?",
                  "As caronas e os pagamentos continuarão no histórico.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Arquivar", onPress: () => archive(person.id) },
                  ],
                )
              }
            >
              <T bold color={c.terra}>
                Arquivar pessoa
              </T>
            </Button>
          )}
        </Box>
        <T title size={19}>
          Histórico de pagamentos
        </T>
        {!history.length && <T color={c.muted}>Nenhum pagamento registrado.</T>}
        {history.map((payment) => (
          <Box key={payment.id} style={s.row}>
            <View style={s.grow}>
              <T bold>{money(payment.amountCents)}</T>
              <T size={12} color={c.muted}>
                {new Date(payment.date).toLocaleDateString("pt-BR")}
              </T>
            </View>
            <Button
              label="Editar pagamento"
              onPress={() => editPayment(payment)}
            >
              <Badge name="edit" size={28} />
            </Button>
            <Button
              label="Excluir pagamento"
              onPress={() =>
                Alert.alert(
                  "Excluir pagamento?",
                  "O valor voltará ao saldo devedor.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Excluir",
                      style: "destructive",
                      onPress: () => removePayment(payment.id),
                    },
                  ],
                )
              }
            >
              <Badge name="trash" size={28} />
            </Button>
          </Box>
        ))}
      </>
    );
  }

  return (
    <>
      <Header title="Pessoas" caption="Seus contatos">
        <Button
          label="Adicionar pessoa"
          onPress={() => setDraft({ id: Date.now(), name: "" })}
        >
          <Badge name="plus" size={40} color="white" background={c.sage} />
        </Button>
      </Header>
      {draft && (
        <Box style={s.row}>
          <TextInput
            autoFocus
            accessibilityLabel="Nome da pessoa"
            placeholder="Nome da pessoa"
            placeholderTextColor={c.muted}
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
            onSubmitEditing={submit}
            style={{ flex: 1, color: c.text }}
          />
          <Button onPress={submit} disabled={!draft.name.trim()}>
            <T bold color={c.sage}>
              Salvar
            </T>
          </Button>
          <Button label="Cancelar" onPress={() => setDraft(null)}>
            <Badge name="close" size={25} />
          </Button>
        </Box>
      )}
      <T size={11} color={c.muted}>
        {people.length}{" "}
        {people.length === 1 ? "pessoa cadastrada" : "pessoas cadastradas"}
      </T>
      {!people.length && (
        <Empty
          title="Nenhuma pessoa cadastrada"
          detail="Toque em + para adicionar um passageiro."
        />
      )}
      {[...people]
        .sort((a, b) => Number(!!a.archived) - Number(!!b.archived))
        .map((p) => (
          <Box key={p.id}>
            <View style={s.row}>
              <View
                style={[
                  s.center,
                  {
                    backgroundColor: "#789c88",
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                  },
                ]}
              >
                <T bold color="white">
                  {p.name.charAt(0)}
                </T>
              </View>
              <View style={s.grow}>
                <T bold>{p.name}</T>
                <T size={11} color={c.muted}>
                  {rides.filter((r) => r.passengers.includes(p.id)).length}{" "}
                  carona(s){p.archived ? " · Arquivada" : ""}
                </T>
              </View>
              <Button label={"Editar " + p.name} onPress={() => setDraft(p)}>
                <Badge name="edit" size={30} />
              </Button>
              <Button
                label={"Ver detalhes de " + p.name}
                onPress={() => select(p.id)}
              >
                <Badge name="arrow" size={28} />
              </Button>
            </View>
            <View
              style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 9 }}
            >
              <T size={10} color={c.muted}>
                Saldo atual
              </T>
              <T bold color={c.sage}>
                {balances.get(p.id) ? money(balances.get(p.id) ?? 0) : "Em dia"}
              </T>
            </View>
          </Box>
        ))}
    </>
  );
}
