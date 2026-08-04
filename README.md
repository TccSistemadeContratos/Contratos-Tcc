# FlowSign

Plataforma de Gestão de Contratos de TI com monitoramento de SLA, dashboard executivo e controle de chamados/incidentes.

## Stack

- **Frontend:** React 19 + TypeScript
- **Build:** Vite 6
- **Estilo:** Tailwind CSS 4
- **Gráficos:** Recharts
- **Relatórios:** jsPDF + jspdf-autotable
- **Backend:** Firebase (Authentication, Firestore, Storage)

## Rodar localmente

**Pré-requisitos:** Node.js

1. Instalar dependências:
   ```
   npm install
   ```
2. Rodar em modo desenvolvimento (porta 3000):
   ```
   npm run dev
   ```
3. Build de produção:
   ```
   npm run build
   ```

## Configuração

A configuração do Firebase fica em `src/firebase-applet-config.json`. As regras de segurança do banco estão em `firestore.rules`.

Não são necessárias variáveis de ambiente para rodar ou publicar o projeto.

## Deploy

O deploy é automático na **Vercel**: cada `push` na branch `main` publica a nova versão.
