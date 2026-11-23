import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Home } from "./src/Home";
import { NewRide } from "./src/NewRide";
import { History } from "./src/History";
import { People } from "./src/People";
import { Settings } from "./src/Settings";
import { Icon, type IconName } from "./src/Icon";
import { Button, T, Theme, light, night, s } from "./src/ui";
import {
  defaultRoutes,
  type Tab,
  type Person,
  type Ride,
  type RideDraft,
} from "./src/model";
import {
  loadData,
  savePerson,
  deletePerson,
  saveRoute,
  deleteRoute,
  savePreferences,
  saveRide,
  deleteRide,
} from "./src/database";

import { getBalances } from "./src/finance";

const tabs: { name: Tab; icon: IconName }[] = [
  { name: "Início", icon: "home" },
  { name: "Histórico", icon: "history" },
  { name: "Pessoas", icon: "people" },
  { name: "Ajustes", icon: "settings" },
];
export default function App() {
  const [loaded, error] = useFonts({
    DM: DMSans_400Regular,
    DMBold: DMSans_700Bold,
    Manrope: Manrope_800ExtraBold,
  });
  const [tab, setTab] = useState<Tab>("Início"),
    [form, showForm] = useState(false),
    [editing, edit] = useState<Ride | null>(null);
  const [dark, setDark] = useState(false),
    [people, setPeople] = useState<Person[]>([]),
    [rides, setRides] = useState<Ride[]>([]);
  const [routes, setRoutes] = useState(defaultRoutes),
    [values, change] = useState([12, 6.1, 1, 3]);
  const [ready, setReady] = useState(false),
    [dbError, setDbError] = useState("");
  useEffect(() => {
    let active = true;
    loadData()
      .then((data) => {
        if (!active) return;
        setPeople(data.people);
        setRides(data.rides);
        setRoutes(data.routes);
        change([
          data.settings.consumption,
          data.settings.gasPrice,
          data.settings.minFare,
          data.settings.maxFare,
        ]);
        setDark(data.settings.dark);
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setDbError("Não foi possível carregar os dados locais.");
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  async function persistPreferences(nextValues = values, nextDark = dark) {
    try {
      await savePreferences({
        consumption: nextValues[0],
        gasPrice: nextValues[1],
        minFare: nextValues[2],
        maxFare: nextValues[3],
        dark: nextDark,
      });
    } catch {
      setDbError("Não foi possível salvar as configurações.");
    }
  }
  const c = dark ? night : light;
  const savingRide = useRef(false);
  const balances = getBalances(rides);

  async function submitRide(draft: RideDraft) {
    savingRide.current = true;
    try {
      const ride = await saveRide(draft, editing?.id);
      setRides((items) =>
        editing
          ? items.map((item) => (item.id === ride.id ? ride : item))
          : [ride, ...items],
      );
      setDbError("");
      showForm(false);
    } catch {
      setDbError("Não foi possível salvar a carona.");
    } finally {
      savingRide.current = false;
    }
  }

  async function removeRide(id: number) {
    try {
      await deleteRide(id);
      setRides((items) => items.filter((ride) => ride.id !== id));
      setDbError("");
    } catch {
      setDbError("Não foi possível excluir a carona.");
    }
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (form) {
        if (!savingRide.current) showForm(false);
        return true;
      }
      if (tab !== "Início") {
        setTab("Início");
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [form, tab]);
  if ((!loaded && !error) || !ready) return null;
  return (
    <SafeAreaProvider>
      <Theme.Provider value={c}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={dark ? "light" : "dark"} />
          {!!dbError && <T>{dbError}</T>}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={12}
          >
            <View
              style={{
                flex: 1,
                width: "100%",
                maxWidth: 520,
                alignSelf: "center",
              }}
            >
              <ScrollView
                keyboardDismissMode="on-drag"
                key={form ? "new" : tab}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 30,
                  gap: 16,
                }}
              >
                {form ? (
                  <NewRide
                    initial={editing}
                    people={people}
                    routes={routes}
                    pricing={{
                      consumption: values[0],
                      gasPrice: values[1],
                      minFare: values[2],
                      maxFare: values[3],
                    }}
                    back={() => showForm(false)}
                    save={submitRide}
                  />
                ) : tab === "Início" ? (
                  <Home
                    count={rides.length}
                    people={people}
                    balances={balances}
                    onPeople={() => setTab("Pessoas")}
                    onNew={() => {
                      edit(null);
                      showForm(true);
                    }}
                  />
                ) : tab === "Histórico" ? (
                  <History
                    people={people}
                    rides={rides}
                    remove={removeRide}
                    edit={(r) => {
                      edit(r);
                      showForm(true);
                    }}
                  />
                ) : tab === "Pessoas" ? (
                  <People
                    people={people}
                    rides={rides}
                    balances={balances}
                    save={async (p) => {
                      try {
                        await savePerson(p);
                        setPeople((items) =>
                          items.some((i) => i.id === p.id)
                            ? items.map((i) => (i.id === p.id ? p : i))
                            : [...items, p],
                        );
                        setDbError("");
                      } catch {
                        setDbError("Não foi possível salvar a pessoa.");
                      }
                    }}
                    remove={async (id) => {
                      if (balances.has(id)) {
                        setDbError("Esta pessoa está vinculada a uma carona.");
                        return;
                      }
                      try {
                        await deletePerson(id);
                        setPeople((items) => items.filter((p) => p.id !== id));
                        setDbError("");
                      } catch {
                        setDbError("Não foi possível excluir a pessoa.");
                      }
                    }}
                  />
                ) : (
                  <Settings
                    dark={dark}
                    toggle={() => {
                      const next = !dark;
                      setDark(next);
                      void persistPreferences(values, next);
                    }}
                    routes={routes}
                    setRoutes={(next) => {
                      const removed = routes.filter(
                        (r) => !next.some((n) => n.name === r.name),
                      );
                      setRoutes(next);
                      void (async () => {
                        try {
                          for (const r of removed) await deleteRoute(r.name);
                          for (const r of next) await saveRoute(r);
                          setDbError("");
                        } catch {
                          setDbError("Não foi possível salvar as rotas.");
                        }
                      })();
                    }}
                    values={values}
                    change={(next) => {
                      change(next);
                      void persistPreferences(next, dark);
                    }}
                  />
                )}
              </ScrollView>
              {!form && (
                <View
                  style={[
                    s.row,
                    {
                      backgroundColor: c.surface,
                      borderTopWidth: 1,
                      borderColor: c.line,
                      minHeight: 76,
                      gap: 0,
                    },
                  ]}
                >
                  {tabs.map((t) => (
                    <Button
                      key={t.name}
                      selected={tab === t.name}
                      style={{ flex: 1, gap: 3 }}
                      onPress={() => setTab(t.name)}
                    >
                      <Icon
                        name={t.icon}
                        color={tab === t.name ? c.sage : c.muted}
                        size={21}
                      />
                      <T
                        bold
                        size={10}
                        color={tab === t.name ? c.sage : c.muted}
                      >
                        {t.name}
                      </T>
                    </Button>
                  ))}
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Theme.Provider>
    </SafeAreaProvider>
  );
}
