# Expo SDK 58

A branch `sprint-2` usa Expo **58.0.17**, React **19.3.0** e React Native **0.88.0**. SecureStore, StatusBar, Metro runtime e safe-area-context seguem as versões recomendadas pelo SDK 58. O lockfile foi atualizado; use `npm ci`, sem `--force` ou `--legacy-peer-deps`.

Requer Node 22.13+ na linha 22, 24.3+ na linha 24, ou uma versão aceita por `mobile/package.json` (`engines`). A validação foi executada com Node 24.19.

## Atualizar no Windows

Pare o Expo com Ctrl+C. Na raiz do repositório:

```cmd
git switch sprint-2
git pull origin sprint-2
cd mobile
npm ci
npx expo start --clear
```

Preserve os arquivos `.env`, as credenciais e o banco existente. Esta atualização não exige migração de banco. Para celular, `EXPO_PUBLIC_API_URL` deve usar o IPv4 do computador com a API ativa e alcançável pelo telefone, conforme o README. Use Expo Go compatível com SDK 58; builds de desenvolvimento antigos precisam ser recompilados.

## Validação

- TypeScript aprovado após adequar a referência de ScrollView ao tipo de instância do React Native 0.88.
- Cinco testes unitários aprovados.
- Treze testes Playwright aprovados, incluindo cadastro/login e cuidados com API/MariaDB reais em banco separado e falhas controladas de sessão/conexão.
- Dependências verificadas com `expo install --check`, usando o catálogo incluído no SDK em modo offline, e `npm ls --depth=0`.
- Exportações web e Android/Hermes aprovadas. A versão web local foi atualizada com a API de testes `http://127.0.0.1:8001`, conferida no JavaScript servido. Essa URL local não serve para um celular externo.

A exportação Android produz um bundle, não APK nem instalação no aparelho. Não houve execução em celular físico ou emulador nesta atualização; SecureStore, teclado nativo e discador continuam dependendo dessa validação.
