# Caronas

Aplicativo Android pessoal para registrar caronas, estimar gastos de gasolina e acompanhar os pagamentos dos passageiros. Os dados e as preferências ficam no SQLite local e são mantidos após reiniciar o aplicativo.

## Download

[Baixar aplicativo para Android (APK)](https://github.com/CaioBFM/caronas-app/releases/latest)

## Executar no Ubuntu

Use Node.js 24 ou mais recente, npm e Expo Go compatível com o Expo SDK 58. No computador, execute:

```bash
npm ci
npm start
```

Abra o Expo Go no Android e escaneie o QR code. Se a rede local impedir a conexão, use `npx expo start --tunnel`.

## Uso

- **Início** permite registrar caronas e pagamentos e abrir as estatísticas.
- **Histórico** reúne as caronas e permite corrigir ou excluir registros sem deixar pagamentos acima das cobranças.
- **Pessoas** mostra saldos, histórico individual de pagamentos e exclusão de pessoas em dia, com preservação do histórico.
- **Estatísticas** reúne custos, distâncias, cobranças e pagamentos por mês ou por todo o período. O saldo de cada mês considera a quitação das caronas mais antigas primeiro.
- **Ajustes** reúne os parâmetros de cálculo, as rotas, o tema e o backup.

Em **Ajustes → Backup e restauração**, exporte um arquivo JSON versionado para uma pasta escolhida no Android. Ele contém pessoas, caronas, pagamentos, rotas e configurações. Ao importar, confira o resumo e confirme a substituição dos dados do aparelho. Se houver erro na restauração, o SQLite reverte todas as alterações. Guarde o arquivo em local de confiança, pois ele contém dados pessoais em texto legível.

## Verificações

```bash
npx tsc --noEmit
npm test
npx expo-doctor
npm audit
```

O identificador Android é `br.com.caronasapp`. O ícone e a tela de inicialização personalizados fazem parte do aplicativo nativo. O Expo Go usa sua própria tela de abertura.
