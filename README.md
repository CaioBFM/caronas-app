# Caronas

Aplicativo Android pessoal, em Expo SDK 58, para acompanhar caronas e gastos com gasolina. O projeto está em preparação; funcionalidades e persistência local serão desenvolvidas em etapas futuras.

## Requisitos

- Ubuntu com Node.js LTS e npm.
- Android com o aplicativo Expo Go instalado.
- Computador e celular na mesma rede Wi-Fi.

## Executar no Ubuntu

Na raiz do projeto, instale as dependências pelo lockfile e inicie o Expo:

```bash
npm ci
npx expo start
```

Quando o QR code aparecer, abra o Expo Go no Android e escaneie-o. Se a rede local impedir a conexão, inicie com `npx expo start --tunnel`.

## Verificações

```bash
npx tsc --noEmit
npx expo-doctor
```

O projeto usa Expo Go e não requer diretórios nativos gerados para iniciar.
