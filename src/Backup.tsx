import { useRef, useState } from "react";
import { pickBackupFile, saveBackupFile } from "./backupFiles";
import { decodeBackup } from "./backupFormat";
import type { AppData } from "./model";
import { Box, Button, Header, T, useColors } from "./ui";

export function Backup({
  back,
  onBusy,
  exportData,
  restore,
}: {
  back: () => void;
  onBusy: (busy: boolean) => void;
  exportData: () => Promise<string>;
  restore: (content: string) => Promise<void>;
}) {
  const c = useColors();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ content: string; data: AppData }>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>, message: string) {
    if (running.current) return;
    running.current = true;
    onBusy(true);
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await action();
    } catch {
      setError(message);
    } finally {
      running.current = false;
      onBusy(false);
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="Backup e restauração" caption="Dados locais">
        <Button disabled={busy} onPress={back}>
          <T bold>Voltar</T>
        </Button>
      </Header>
      {preview ? (
        <Box>
          <T title size={19}>
            Substituir os dados atuais?
          </T>
          <T>
            O backup substituirá todas as pessoas, caronas, pagamentos, rotas e
            configurações deste aparelho.
          </T>
          <T color={c.muted}>
            {preview.data.people.length} pessoa(s) · {preview.data.rides.length}{" "}
            carona(s) · {preview.data.payments.length} pagamento(s) ·{" "}
            {preview.data.routes.length} rota(s)
          </T>
          <Button
            disabled={busy}
            style={{ backgroundColor: c.soft }}
            onPress={() =>
              void run(async () => {
                await restore(preview.content);
                setPreview(undefined);
                setNotice("Backup restaurado.");
              }, "Não foi possível restaurar o backup. Os dados atuais foram preservados.")
            }
          >
            <T bold>Confirmar restauração</T>
          </Button>
          <Button
            disabled={busy}
            onPress={() => {
              setPreview(undefined);
              setError("");
            }}
          >
            <T bold>Cancelar</T>
          </Button>
        </Box>
      ) : (
        <Box>
          <T>
            O arquivo reúne seus registros e configurações. Guarde-o em uma
            pasta de sua confiança.
          </T>
          <Button
            disabled={busy}
            style={{ backgroundColor: c.soft }}
            onPress={() =>
              void run(async () => {
                if (await saveBackupFile(await exportData()))
                  setNotice("Backup salvo na pasta selecionada.");
              }, "Não foi possível exportar o backup.")
            }
          >
            <T bold>Exportar backup</T>
          </Button>
          <Button
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const content = await pickBackupFile();
                if (content === undefined) return;
                try {
                  setPreview({ content, data: decodeBackup(content) });
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "Backup inválido.",
                  );
                }
              }, "Não foi possível ler o arquivo selecionado.")
            }
          >
            <T bold>Importar backup</T>
          </Button>
        </Box>
      )}
      {!!notice && <T color={c.sage}>{notice}</T>}
      {!!error && <T color={c.terra}>{error}</T>}
    </>
  );
}
