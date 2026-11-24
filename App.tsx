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
import { PaymentForm, type PaymentTarget } from "./src/PaymentForm";
import { Statistics } from "./src/Statistics";
import { People } from "./src/People";
import { Settings } from "./src/Settings";
import { Icon, type IconName } from "./src/Icon";
import { Button, T, Theme, light, night, s } from "./src/ui";
import {
  defaultRoutes,
  type Tab,
  type Person,
  type Payment,
  type Ride,
  type RideDraft,
} from "./src/model";
import {
  loadData,
  savePerson,
  archivePerson,
  savePayment,
  deletePayment,
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
    [payments, setPayments] = useState<Payment[]>([]),
    [paymentTarget, setPaymentTarget] = useState<PaymentTarget>(),
    [statistics, showStatistics] = useState(false),
    [personId, selectPerson] = useState<number>(),
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
        setPayments(data.payments);
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
  const savingPayment = useRef(false);
  const balances = getBalances(rides, payments);
  const received = payments.reduce((total, p) => total + p.amountCents, 0);

  async function submitPayment(id: number, cents: number, existing?: Payment) {
    savingPayment.current = true;
    try {
      const payment = await savePayment(id, cents, existing);
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
      await deletePayment(id);
      setPayments((items) => items.filter((payment) => payment.id !== id));
      setDbError("");
    } catch {
      setDbError("Não foi possível excluir o pagamento.");
    }
  }

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
      await deleteRide(id);
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
  }, [form, tab, paymentTarget, statistics, personId]);
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
                key={
                  paymentTarget
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
                {paymentTarget ? (
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
                      (p) => !p.archived || editing?.passengers.includes(p.id),
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
                    archive={async (id) => {
                      try {
                        await archivePerson(id);
                        setPeople((items) =>
                          items.map((p) =>
                            p.id === id ? { ...p, archived: true } : p,
                          ),
                        );
                        setDbError("");
                      } catch {
                        setDbError(
                          "Só é possível arquivar pessoas sem dívidas.",
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
              {!form && !paymentTarget && !statistics && (
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
