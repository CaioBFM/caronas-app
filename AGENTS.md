## Projeto

Aplicativo Android pessoal para organizar caronas e gastos com gasolina, desenvolvido com Expo SDK 58, React Native e TypeScript. As telas ficam em `src/`. A navegação e os dados da sessão são controlados em `App.tsx`.

## Diretrizes de implementação

- Mantenha uma arquitetura simples, modular e preparada para expansão; evite abstrações e camadas sem necessidade concreta.
- Separe interface, regras de negócio e persistência. Componentes de tela não devem concentrar cálculos ou acesso direto ao armazenamento.
- Priorize padrões mobile-first, desempenho e compatibilidade entre plataformas sempre que o escopo não for exclusivamente Android.
- Use TypeScript estrito, tipos explícitos nas fronteiras e APIs atuais de React Native/Expo.
- Prefira soluções simples e poucas dependências. Antes de adicionar uma biblioteca, confirme que ela é necessária, compatível com Expo Go e SDK 58 e preferível a uma opção oficial do Expo.
- Não presuma que Expo Router está instalado. Use apenas o mecanismo de navegação existente; adote outra solução somente quando uma tarefa futura pedir navegação.
- Não implemente funcionalidades além do escopo solicitado.

## Documentação Expo

Antes de alterar código que use Expo, EAS ou React Native:

1. Confira a versão instalada de `expo` em `package.json`.
2. Consulte a documentação versionada correspondente, atualmente `https://docs.expo.dev/versions/v58.0.0/`.
3. Use `https://docs.expo.dev/llms.txt` como índice e siga para a página específica; não dependa de APIs lembradas de versões anteriores.

## Privacidade e arquivos locais

- Nunca exponha ou registre credenciais, tokens, chaves privadas, informações pessoais ou dados reais de uso.
- Não adicione ao controle de versão bancos SQLite, cópias, dumps ou arquivos auxiliares de banco. Use somente dados fictícios em exemplos.
- Mantenha segredos em arquivos locais ignorados pelo Git e não inclua valores secretos em configuração ou documentação.
- Preserve arquivos de manifesto e lockfile necessários à instalação reproduzível. Não ignore arquivos de configuração necessários ao projeto.

## Validação

- Antes de finalizar alterações, execute as verificações disponíveis e adequadas ao escopo, incluindo lint e verificação de tipos quando configurados, além do Expo Doctor e auditoria de dependências quando aplicáveis.
- Não atualize dependências ou corrija achados automaticamente sem verificar compatibilidade com o SDK 58.
- Não adicione testes ou dependências de teste sem necessidade para a tarefa. Se uma verificação não estiver configurada ou não puder ser executada, informe isso no relatório final.

## Comunicação

Faça mudanças focadas e preserve a estrutura gerada pelo Expo. Ao concluir, informe de forma objetiva os arquivos alterados, as validações executadas e pendências relevantes, em um relatório final resumido.
