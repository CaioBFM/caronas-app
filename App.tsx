import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Backup } from "./src/Backup";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Home } from "./src/Home";
import { NewRide } from "./src/NewRide";
import { History } from "./src/History";
import { PaymentForm, type PaymentTarget } from "./src/PaymentForm";
import { Statistics } from "./src/Statistics";
import { People } from "./src/People";
import { Settings } from "./src/Settings";
import { Icon, type IconName } from "./src/Icon";
import { Button, T, Theme, light, night, s } from "./src/ui";
import {
  defaultRoutes,
  type Tab,
  type AppData,
  type Person,
  type Payment,
  type Ride,
  type RideDraft,
} from "./src/model";
import {
  loadData,
  exportBackup,
  restoreBackup,
  savePerson,
  deletePerson,
  savePayment,
  deletePayment,
  saveRoute,
  deleteRoute,
  savePreferences,
  saveRide,
  deleteRide,
} from "./src/database";

import { getBalances } from "./src/finance";

void SplashScreen.preventAutoHideAsync().catch(() => {});

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
    [payments, setPayments] = useState<Payment[]>([]),
    [paymentTarget, setPaymentTarget] = useState<PaymentTarget>(),
    [statistics, showStatistics] = useState(false),
    [personId, selectPerson] = useState<number>(),
    [rides, setRides] = useState<Ride[]>([]);
  const [routes, setRoutes] = useState(defaultRoutes),
    [values, change] = useState([12, 6.1, 1, 3]);
  const [ready, setReady] = useState(false),
    [dbError, setDbError] = useState("");
  const [backup, showBackup] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, retryLoad] = useState(0);
  const backupBusy = useRef(false);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = writes.current.then(operation);
    writes.current = next.catch(() => {});
    return next;
  }

  function applyData(data: AppData) {
    setPeople(data.people);
    setRides(data.rides);
    setPayments(data.payments);
    setRoutes(data.routes);
    change([
      data.settings.consumption,
      data.settings.gasPrice,
      data.settings.minFare,
      data.settings.maxFare,
    ]);
    setDark(data.settings.dark);
  }

  useEffect(() => {
    let active = true;
    loadData()
      .then((data) => {
        if (!active) return;
        applyData(data);
        setLoadFailed(false);
        setDbError("");
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);
  useEffect(() => {
    if ((loaded || error) && ready)
      void SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error, ready]);

  async function persistPreferences(nextValues = values, nextDark = dark) {
    try {
      await enqueue(() =>
        savePreferences({
          consumption: nextValues[0],
          gasPrice: nextValues[1],
          minFare: nextValues[2],
          maxFare: nextValues[3],
          dark: nextDark,
        }),
      );
      setDbError("");
    } catch {
      const data = await enqueue(loadData).catch(() => undefined);
      if (data) {
        change([
          data.settings.consumption,
          data.settings.gasPrice,
          data.settings.minFare,
          data.settings.maxFare,
        ]);
        setDark(data.settings.dark);
      }
      setDbError("Não foi possível salvar as configurações.");
    }
  }
  const c = dark ? night : light;
  const savingRide = useRef(false);
  const savingPayment = useRef(false);
  const balances = getBalances(rides, payments);
  const received = payments.reduce((total, p) => total + p.amountCents, 0);

  async function submitPayment(id: number, cents: number, existing?: Payment) {
    savingPayment.current = true;
    try {
      const payment = await enqueue(() => savePayment(id, cents, existing));
      setPayments((items) =>
        existing
          ? items.map((item) => (item.id === payment.id ? payment : item))
          : [payment, ...items],
      );
      setDbError("");
      setPaymentTarget(undefined);
    } finally {
      savingPayment.current = false;
    }
  }

  async function removePayment(id: number) {
    try {
      await enqueue(() => deletePayment(id));
      setPayments((items) => items.filter((payment) => payment.id !== id));
      setDbError("");
    } catch {
      setDbError("Não foi possível excluir o pagamento.");
    }
  }

  async function submitRide(draft: RideDraft) {
    savingRide.current = true;
    try {
      const ride = await enqueue(() => saveRide(draft, editing?.id));
      setRides((items) =>
        editing
          ? items.map((item) => (item.id === ride.id ? ride : item))
          : [ride, ...items],
      );
      setDbError("");
      showForm(false);
    } catch (failure) {
      setDbError(
        failure instanceof Error ? failure.message : "A carona não foi salva.",
      );
    } finally {
      savingRide.current = false;
    }
  }

  async function removeRide(id: number) {
    try {
      await enqueue(() => deleteRide(id));
      setRides((items) => items.filter((ride) => ride.id !== id));
      setDbError("");
    } catch (failure) {
      setDbError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível excluir a carona.",
      );
    }
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backup) {
        if (!backupBusy.current) showBackup(false);
        return true;
      }
      if (paymentTarget) {
        if (!savingPayment.current) setPaymentTarget(undefined);
        return true;
      }
      if (statistics) {
        showStatistics(false);
        return true;
      }
      if (tab === "Pessoas" && personId !== undefined) {
        selectPerson(undefined);
        return true;
      }
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
  }, [form, tab, paymentTarget, statistics, personId, backup]);
  if ((!loaded && !error) || !ready) return null;
  return (
    <SafeAreaProvider>
      <Theme.Provider value={c}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={dark ? "light" : "dark"} />
          {!!dbError && (
            <View
              accessibilityLiveRegion="polite"
              style={{ paddingHorizontal: 20, paddingTop: 10 }}
            >
              <T color={c.terra}>{dbError}</T>
            </View>
          )}
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
                key={
                  backup
                    ? "backup"
                    : paymentTarget
                      ? "payment"
                      : statistics
                        ? "statistics"
                        : form
                          ? "new"
                          : (personId ?? tab)
                }
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 30,
                  gap: 16,
                }}
              >
                {loadFailed ? (
                  <View style={{ padding: 20, gap: 10 }}>
                    <T>Não foi possível carregar os dados locais.</T>
                    <Button
                      onPress={() => {
                        setReady(false);
                        retryLoad((attempt) => attempt + 1);
                      }}
                    >
                      <T bold>Tentar novamente</T>
                    </Button>
                  </View>
                ) : backup ? (
                  <Backup
                    back={() => showBackup(false)}
                    onBusy={(busy) => {
                      backupBusy.current = busy;
                    }}
                    exportData={() => enqueue(exportBackup)}
                    restore={async (content) => {
                      applyData(await enqueue(() => restoreBackup(content)));
                      edit(null);
                      selectPerson(undefined);
                      setDbError("");
                    }}
                  />
                ) : paymentTarget ? (
                  <PaymentForm
                    target={paymentTarget}
                    people={people}
                    balances={balances}
                    back={() => setPaymentTarget(undefined)}
                    save={submitPayment}
                  />
                ) : statistics ? (
                  <Statistics
                    people={people}
                    rides={rides}
                    payments={payments}
                    back={() => showStatistics(false)}
                  />
                ) : form ? (
                  <NewRide
                    initial={editing}
                    people={people.filter(
                      (p) => !p.deleted || editing?.passengers.includes(p.id),
                    )}
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
                    received={received}
                    onPayment={() => setPaymentTarget({})}
                    onStatistics={() => showStatistics(true)}
                    people={people}
                    balances={balances}
                    onPeople={() => {
                      selectPerson(undefined);
                      setTab("Pessoas");
                    }}
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
                    person={people.find((p) => p.id === personId)}
                    select={selectPerson}
                    payments={payments}
                    register={(id) => setPaymentTarget({ personId: id })}
                    editPayment={(existing) =>
                      setPaymentTarget({
                        personId: existing.personId,
                        existing,
                      })
                    }
                    removePayment={removePayment}
                    people={people}
                    rides={rides}
                    balances={balances}
                    save={async (p) => {
                      await enqueue(() => savePerson(p));
                      setPeople((items) =>
                        items.some((i) => i.id === p.id)
                          ? items.map((i) => (i.id === p.id ? p : i))
                          : [...items, p],
                      );
                      setDbError("");
                    }}
                    remove={async (id) => {
                      try {
                        await enqueue(() => deletePerson(id));
                        setPeople((items) =>
                          items.map((p) =>
                            p.id === id ? { ...p, deleted: true } : p,
                          ),
                        );
                        selectPerson((current) =>
                          current === id ? undefined : current,
                        );
                        setDbError("");
                      } catch {
                        setDbError(
                          "Não foi possível excluir a pessoa. Confira se o saldo está em dia.",
                        );
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
                    addRoute={async (route) => {
                      await enqueue(() => saveRoute(route));
                      setRoutes((items) => [...items, route]);
                    }}
                    removeRoute={async (name) => {
                      await enqueue(() => deleteRoute(name));
                      setRoutes((items) =>
                        items.filter((r) => r.name !== name),
                      );
                    }}
                    onBackup={
                      Platform.OS === "android"
                        ? () => {
                            setDbError("");
                            showBackup(true);
                          }
                        : undefined
                    }
                    values={values}
                    change={(next) => {
                      change(next);
                      void persistPreferences(next, dark);
                    }}
                  />
                )}
              </ScrollView>
              {!form &&
                !paymentTarget &&
                !statistics &&
                !backup &&
                !loadFailed && (
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
                        onPress={() => {
                          selectPerson(undefined);
                          setTab(t.name);
                        }}
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
