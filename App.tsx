import { useEffect, useState } from "react";
import { BackHandler, ScrollView, View } from "react-native";
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
import { defaultRoutes, type Tab, type Person, type Ride } from "./src/model";

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
  const c = dark ? night : light;
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (form) {
        showForm(false);
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
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <Theme.Provider value={c}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={dark ? "light" : "dark"} />
          <View
            style={{
              flex: 1,
              width: "100%",
              maxWidth: 520,
              alignSelf: "center",
            }}
          >
            <ScrollView
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
                  limits={values.slice(2)}
                  back={() => showForm(false)}
                  save={(ride) => {
                    setRides((items) =>
                      editing
                        ? items.map((r) => (r.id === ride.id ? ride : r))
                        : [ride, ...items],
                    );
                    showForm(false);
                  }}
                />
              ) : tab === "Início" ? (
                <Home
                  count={rides.length}
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
                  remove={(id) =>
                    setRides((items) => items.filter((r) => r.id !== id))
                  }
                  edit={(r) => {
                    edit(r);
                    showForm(true);
                  }}
                />
              ) : tab === "Pessoas" ? (
                <People
                  people={people}
                  rides={rides}
                  save={(p) =>
                    setPeople((items) =>
                      items.some((i) => i.id === p.id)
                        ? items.map((i) => (i.id === p.id ? p : i))
                        : [...items, p],
                    )
                  }
                />
              ) : (
                <Settings
                  dark={dark}
                  toggle={() => setDark(!dark)}
                  routes={routes}
                  setRoutes={setRoutes}
                  values={values}
                  change={change}
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
                    <T bold size={10} color={tab === t.name ? c.sage : c.muted}>
                      {t.name}
                    </T>
                  </Button>
                ))}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Theme.Provider>
    </SafeAreaProvider>
  );
}
