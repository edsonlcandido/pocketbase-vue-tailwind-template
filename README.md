# PocketBase + Vue 3 + TypeScript + Tailwind CSS Template

Template completo para projetos com PocketBase + Vue 3 + TypeScript + Tailwind CSS em arquitetura monorepo.

## 🚀 Características

- **Monorepo** com workspaces (Landing Page + Web App)
- **PocketBase** como backend (autenticação, database, API RESTful)
- **Vue 3** com Composition API e TypeScript
- **Tailwind CSS v4** para estilização moderna
- **Vue Router** com guards de autenticação
- **Pinia** para gerenciamento de estado
- **Vite** como build tool com proxy configurado
- **Heroicons** para ícones
- **Dockerfile** multi-stage para produção
- **Scripts automatizados** para desenvolvimento e deploy

## 📁 Estrutura do Projeto

```
pocketbase-vue-tailwind-template/
├── apps/
│   ├── landing/              # Landing page estática
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   └── style.css
│   │   ├── public/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   └── web/                  # Web app com Vue
│       ├── src/
│       │   ├── router/       # Vue Router
│       │   ├── stores/       # Pinia stores
│       │   ├── services/     # Serviços (PocketBase client)
│       │   ├── views/        # Páginas/Views
│       │   ├── App.vue
│       │   ├── main.ts
│       │   └── style.css
│       ├── public/
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── tsconfig.json
│
├── pocketbase/
│   ├── pb_hooks/             # Hooks do PocketBase
│   │   └── main.pb.js        # SPA routing
│   ├── pb_migrations/        # Migrations do banco
│   ├── pb_data/              # Dados do PocketBase (gitignored)
│   └── pb_public/            # Arquivos públicos servidos
│
├── scripts/
│   ├── pocketbase.js         # Script para baixar/rodar PocketBase
│   ├── copy-landing.js       # Copia build da landing
│   └── copy-app.js           # Copia build do app
│
├── Dockerfile                # Build multi-stage
├── .dockerignore
├── .gitignore
├── package.json              # Root package (workspaces)
└── README.md
```

## 🛠️ Pré-requisitos

- **Node.js** >= 20.19.0
- **npm** >= 10.x

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/edsonlcandido/pocketbase-vue-tailwind-template.git
cd pocketbase-vue-tailwind-template
```

2. Instale as dependências:
```bash
npm install
```

Isso instalará as dependências do root e de todos os workspaces (landing e web).

## 🚀 Desenvolvimento

### Modo Desenvolvimento Completo

Execute todos os serviços simultaneamente (PocketBase + Landing + Web App):

```bash
npm run dev
```

Isso iniciará:
- **PocketBase** em http://localhost:8090
- **Landing Page** em http://localhost:5173
- **Web App** em http://localhost:5174

### Modo Desenvolvimento Individual

Execute cada serviço separadamente:

```bash
# Apenas PocketBase
npm run dev:pb

# Apenas Landing Page
npm run dev:landing

# Apenas Web App
npm run dev:web
```

### Acessar a Aplicação

- **Landing Page**: http://localhost:5173
- **Web App**: http://localhost:5174
- **PocketBase Admin**: http://localhost:8090/_/

## 🏗️ Build para Produção

### Build Completo

```bash
npm run build
```

Isso fará:
1. Build da landing page
2. Copia a landing para `pocketbase/pb_public/`
3. Build do web app
4. Copia o web app para `pocketbase/pb_public/app/`

### Build Individual

```bash
# Build apenas da landing
npm run build:landing

# Build apenas do web app
npm run build:web

# Copiar landing para PocketBase
npm run copy:landing

# Copiar web app para PocketBase
npm run copy:app
```

### Preview da Produção

Após o build completo, você pode testar a aplicação em modo produção:

```bash
npm run preview
```

Acesse http://localhost:8090 para ver:
- **Landing Page**: http://localhost:8090/
- **Web App**: http://localhost:8090/app/
- **PocketBase Admin**: http://localhost:8090/_/

## 🐳 Docker

### Build da Imagem

```bash
docker build -t pocketbase-app .
```

### Executar o Container

```bash
docker run -p 8090:8090 -v $(pwd)/pb_data:/app/pb_data pocketbase-app
```

Acesse http://localhost:8090

### Docker Compose (Exemplo)

Crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  pocketbase:
    build: .
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/app/pb_data
    restart: unless-stopped
```

Execute:

```bash
docker-compose up -d
```

## 🔐 Autenticação

O template já vem configurado com:

- **Pinia Store** para gerenciamento de autenticação
- **Vue Router Guards** para proteção de rotas
- **PocketBase Client** configurado
- **Login/Register Views** com Tailwind CSS

### Criar Primeiro Usuário

1. Acesse http://localhost:8090/_/
2. Crie uma conta de administrador
3. Acesse "Collections" e crie uma collection "users" (se não existir)
4. Configure as permissões necessárias

Ou use o web app em http://localhost:5174/app/login

## 🎨 Tailwind CSS

O template usa **Tailwind CSS v4** em ambos os apps (landing e web).

### Configuração

Cada app tem sua própria configuração:
- `apps/landing/tailwind.config.js`
- `apps/web/tailwind.config.js`

### Importação

Em cada app, o Tailwind é importado no `style.css`:

```css
@import "tailwindcss";
```

## 🔄 Vue Router

O web app usa Vue Router com as seguintes rotas:

- `/` → Redireciona para `/dashboard`
- `/login` → Página de login/registro
- `/dashboard` → Dashboard (requer autenticação)

### Guards de Navegação

```typescript
// Rotas protegidas
meta: { requiresAuth: true }

// Rotas apenas para visitantes
meta: { requiresGuest: true }
```

## 📱 Pinia Stores

### Auth Store

Localizado em `apps/web/src/stores/auth.ts`:

```typescript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Propriedades
authStore.user          // Usuário atual
authStore.isLoggedIn    // Status de autenticação

// Métodos
await authStore.login(email, password)
await authStore.register(email, password, passwordConfirm)
authStore.logout()
```

## 🔌 PocketBase Client

O cliente está configurado em `apps/web/src/services/pocketbase.ts`:

```typescript
import pb from '@/services/pocketbase'

// Usar as APIs do PocketBase
const records = await pb.collection('posts').getList()
```

### Variáveis de Ambiente

- **Desenvolvimento** (`.env.development`):
  ```
  VITE_POCKETBASE_URL=http://localhost:8090
  ```

- **Produção** (`.env.production`):
  ```
  VITE_POCKETBASE_URL=/
  ```

## 📝 Scripts Disponíveis

### Root Level

```bash
npm run dev              # Executar tudo em dev
npm run dev:pb           # Apenas PocketBase
npm run dev:landing      # Apenas Landing
npm run dev:web          # Apenas Web App
npm run build            # Build completo
npm run build:landing    # Build da landing
npm run build:web        # Build do web app
npm run copy:landing     # Copiar landing para PocketBase
npm run copy:app         # Copiar app para PocketBase
npm run preview          # Preview em produção
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🙏 Agradecimentos

- [PocketBase](https://pocketbase.io/) - Backend incrível
- [Vue.js](https://vuejs.org/) - Framework progressivo
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário
- [Vite](https://vitejs.dev/) - Build tool ultra-rápido
- [Heroicons](https://heroicons.com/) - Belos ícones SVG

## 📞 Suporte

Se você encontrar algum problema ou tiver sugestões, por favor:

1. Verifique as [Issues existentes](https://github.com/edsonlcandido/pocketbase-vue-tailwind-template/issues)
2. Crie uma nova issue se necessário

---

Feito com ❤️ usando PocketBase + Vue + Tailwind CSS
