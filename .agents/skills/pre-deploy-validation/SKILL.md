---
name: pre-deploy-validation
description: Rodar as validações estáticas ANTES de qualquer commit/push que toque migrations, hooks ou código do frontend neste template. Três checks: (1) PocketBase local com pb_data limpo pra confirmar que a migration aplica limpa, (2) npm run build nos apps tocados (vue-tsc + vite) pra pegar erro de TS/build, (3) docker build quando o Dockerfile mudou. Use quando o pedido mencionar "validar antes de deploy", "rodar local antes", "verificar migration", "npm build", "pre-deploy", "commita e sobe", "deploy", ou quando o commit for iminente.
---

# Pre-deploy validation (validação local antes de commitar/pushar)

Publicar código quebrado custa minutos de build em produção e a impressão de que "não foi nada". **Antes de qualquer `git commit` que toque `pocketbase/**` ou `apps/**`, rode os checks abaixo.** Se quebrar, **NÃO commite**.

Os checks são proporcionais ao que mudou — não rode tudo sempre.

| O que mudou | Check |
|---|---|
| `apps/web/src/**` | Check 2 — `npm run build:web` |
| `apps/landing/src/**` | Check 2 — `npm run build:landing` |
| `pocketbase/pb_migrations/**` | Check 1 — PB local com `pb_data` limpo |
| `pocketbase/pb_hooks/**` | Check 1 — PB local (hook quebrado = 500 em runtime) |
| `Dockerfile` / `docker-compose.yaml` | Check 3 — `docker build .` |
| `AGENTS.md`, `.agents/**`, `README.md` | nada (docs) |

---

## Check 1 — migration/hook do PocketBase roda limpo

```bash
# 1) Limpa o pb_data (estado limpo: garante que a migration roda do zero)
rm -rf pocketbase/pb_data          # Linux/macOS
# PowerShell: Remove-Item -Recurse -Force pocketbase\pb_data

# 2) Sobe o PB. Ele aplica TODAS as migrations de pb_migrations/ no startup.
cd pocketbase
./pocketbase serve --http=127.0.0.1:8090
# (ou, pelo script que baixa o binário se faltar: npm run dev:pb)
```

Aguarde o startup e olhe o stdout:

- ✅ **Sinal verde**: `Server started at http://127.0.0.1:8090` e **nenhuma** linha `failed to apply migration`.
- ❌ **Sinal vermelho**: `Error: failed to apply migration 1234_x.js: <erro>` → **NÃO commite**. Corrija a migration e volte do passo 1.

> O PB pode continuar rodando mesmo com migration falhada. Olhe **a linha de erro**, não só a de "server started".

### Verificações de sanidade (SQLite)

```bash
# a) migrations aplicadas (deve bater com os arquivos de pb_migrations/)
sqlite3 pocketbase/pb_data/data.db "SELECT file FROM _migrations ORDER BY file"

# b) schema da collection que você criou/alterou
sqlite3 pocketbase/pb_data/data.db "PRAGMA table_info(posts)"

# c) collections que existem
sqlite3 pocketbase/pb_data/data.db "SELECT name FROM _collections ORDER BY name"
```

**Pós-checks** (se a migration mexeu em dados):

```bash
sqlite3 pocketbase/pb_data/data.db "SELECT COUNT(*) FROM posts"
sqlite3 pocketbase/pb_data/data.db "SELECT id, title FROM posts LIMIT 5"
```

Pare o PB local (Ctrl+C) quando terminar — ele não é um daemon que deve ficar rodando.

### Quando pular

- Mudou só `apps/**` → pule o Check 1.
- Mudou só hook (sem migration) → o PB recarrega hook sozinho; basta subir e testar a rota afetada.

---

## Check 2 — build dos apps tocados

```bash
# apps/web (Vue 3 + TypeScript) — o script já é "vue-tsc && vite build"
npm run build:web

# apps/landing (se você mexeu)
npm run build:landing
```

Ou direto no app:

```bash
cd apps/web && npm run build
cd apps/landing && npm run build
```

- ✅ **Sinal verde**: termina com `✓ built in X.XXs`, exit code 0.
- ❌ **Sinais vermelhos** (bloqueiam o commit):
  - `TS6133 "declared but never read"` — constante declarada e não usada (nem no template, nem no script). Apague a declaração: o `vue-tsc` é estrito.
  - `error TSxxxx` — qualquer erro de TypeScript.
  - `Build failed with N errors` — erro de import, template ou CSS. Leia a stack.
  - exit code ≠ 0.

> **PowerShell**: `npm.ps1` é bloqueado pela ExecutionPolicy padrão do Windows. Use `cmd.exe /c "cd /d apps\web && npm run build"`.

### Quando pular

- Mudou só `pocketbase/**` → pule o Check 2.
- Mudou só docs → pule tudo.

---

## Check 3 — imagem Docker

```bash
docker build -t app:check .
```

- ✅ sai com exit 0.
- ❌ erro de build (falta de arquivo de config copiado no Dockerfile, `npm install` quebrado, versão do PB inválida no `ARG POCKETBASE_VERSION`).

Rodar a imagem e validar de ponta a ponta:

```bash
docker compose up -d
curl -sS -m 10 http://localhost:8090/api/health    # deve responder
curl -sS -m 10 http://localhost:8090/ | head -20      # landing
curl -sS -m 10 http://localhost:8090/app/ | head -20   # web app
docker compose down
```

---

## Atalho — checklist de commit

```bash
# 1) O que mudou?
git status --short

# 2) Rodar só os checks aplicáveis
#    - tocou apps/web      → npm run build:web
#    - tocou apps/landing  → npm run build:landing
#    - tocou pb_migrations → Check 1 (PB local + sqlite3)
#    - tocou Dockerfile    → docker build .

# 3) Tudo verde?
git add <paths>
git commit -m "tipo(escopo): descrição"
git push
```

---

## Erros que já custaram rollback (e são detectados aqui)

1. **Field com opções aninhadas em `options: {}`** (sintaxe PB 0.22) → `(values: cannot be blank.)`. A migration não aplica.
2. **`findAllRecords(coll, { filter })`** (não existe no PB 0.40+) → `Object has no member 'filter'`. Migration aplica pela metade e deixa estado inconsistente.
3. **Vue template com `</script>` literal** dentro de string → o parser do SFC fecha o bloco no primeiro `</` e o build quebra com "Unexpected end of tag".
4. **`{{$json.body.x}}`** no template → interpretado como propriedade da instância.
5. **TS6133** → `vue-tsc` falha o build.

Todos esses aparecem **localmente**, em segundos — e só apareceriam em produção depois do build completo.

---

## Quando invocar esta skill

- O pedido é "commita e sobe" / "manda pra prod" / "deploy" / "publica".
- Antes de qualquer `git push` que toque `pocketbase/pb_migrations/*`, `pocketbase/pb_hooks/*`, `apps/web/src/**` ou `apps/landing/src/**`.
- Quando você se pega fazendo `git commit` sem ter rodado os checks — confira `git status` para ver se há migration ou front pendente.

## Skills relacionadas

- `.agents/skills/pocketbase-migrations/SKILL.md` — sintaxe de migration (fields, timestamps, idempotência)
- `.agents/skills/pocketbase-jsvm/SKILL.md` — regras de hooks JS no PB 0.40+
- `AGENTS.md` (raiz) — contexto do projeto e workflow de commit
