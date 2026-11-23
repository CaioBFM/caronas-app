import { useState } from "react";
import { TextInput, View } from "react-native";
import { Badge, Box, Button, Empty, Header, T, s, useColors } from "./ui";
import type { Person, Ride } from "./model";
export function People({
  people,
  rides,
  save,
  remove,
}: {
  people: Person[];
  rides: Ride[];
  save: (person: Person) => void;
  remove: (id: number) => void;
}) {
  const c = useColors(),
    [draft, setDraft] = useState<Person | null>(null);
  function submit() {
    if (draft?.name.trim()) {
      save({ ...draft, name: draft.name.trim() });
      setDraft(null);
    }
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
      {people.map((p) => (
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
                carona(s)
              </T>
            </View>
            <Button label={"Editar " + p.name} onPress={() => setDraft(p)}>
              <Badge name="edit" size={30} />
            </Button>
            <Button label={"Excluir " + p.name} onPress={() => remove(p.id)}><Badge name="trash" size={28} /></Button>
          </View>
          <View
            style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 9 }}
          >
            <T size={10} color={c.muted}>
              Saldo atual
            </T>
            <T bold color={c.sage}>
              Em dia
            </T>
          </View>
        </Box>
      ))}
    </>
  );
}
