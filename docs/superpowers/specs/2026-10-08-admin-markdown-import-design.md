# Administração: importar markdown editorial, publicação por data e LinkedIn

Esta entrega permite importar um arquivo markdown editorial com o conteúdo completo de um post (três idiomas, tags, flashcards e texto de LinkedIn). O administrador também compartilha no LinkedIn a partir da lista de posts, com o texto guardado. A data de publicação passa a controlar quando o post entra na leitura pública.

Estende a entrega de posts em admin (`2026-10-06-admin-posts-design.md`). O formulário manual de slug, data, títulos e descrições permanece. Agendar pela data deixa de ser apenas informativo: `published_on` no passado ou no dia atual publica; data futura mantém o post só no admin até chegar o dia.

Texto de LinkedIn na página do artigo, edição de tags e flashcards fora do import, restaurar comentário excluído e publicação automática via API do LinkedIn ficam de fora.

## Formato do arquivo

Um arquivo `.md` por post, no padrão dos rascunhos editoriais:

- Comentário HTML inicial com `Slug sugerido: {slug}` (slug normalizado como no admin: minúsculas, hífens).
- Bloco opcional de nota de publicação e índice de idiomas; não entram no banco.
- Três seções separadas por `---`, com cabeçalho `# Português`, `# English` ou `# Español`.

Em cada idioma, nesta ordem:

1. `## {título}` — título do artigo naquele idioma.
2. `**Descrição:**` — descrição curta.
3. `**Objetivo:**` — texto interno; não aparece no blog público.
4. `## Artigo` / `## Article` / `## Artículo` — corpo markdown publicado (até a próxima seção de metadados).
5. `## Nuvem de tags` / `## Tag cloud` / `## Nube de etiquetas` — linha ou parágrafo com tags separadas por vírgula.
6. `## Flashcards` — tabela markdown com colunas `#`, pergunta e resposta (rótulos por idioma conforme o exemplo).
7. `## Post para o LinkedIn` / `## LinkedIn post` / `## Publicación para LinkedIn` — texto do post social.

O parser ignora:

- A nota de publicação no topo.
- Blocos de citação `>` de aviso “link sugerido, ainda não published” dentro da seção LinkedIn.

Na gravação, o texto do LinkedIn guardado é o post **sem** esse aviso. Qualquer URL de blog no texto é substituída pela URL canônica do artigo no idioma correspondente:

`https://tiagocosmai.github.io/{pt|en|es}/blog/{slug}`

O slug usado é o do comentário inicial (normalizado). Slug inválido ou ausente faz parte da validação.

## Validação

A importação **nunca** grava parcialmente.

Antes de qualquer escrita, o servidor valida o arquivo inteiro. Os três idiomas são obrigatórios e, em cada um, título, descrição, objetivo, corpo do artigo, linha de tags, pelo menos um flashcard válido e texto de LinkedIn (após remover o aviso de rascunho) precisam existir e não ficar vazios depois de `trim`.

Flashcard inválido: linha sem `#`, pergunta ou resposta vazia, ou `id` repetido no mesmo idioma.

Se algo faltar, a resposta lista os problemas (idioma e seção). Nada no banco muda.

Só após validação bem-sucedida:

- Se o slug **não** existir, o fluxo segue para **criar** (com confirmação implícita ao concluir o passo de importação, ou confirmação explícita na UI após mostrar resumo).
- Se o slug **já** existir (slug vigente de um post), a UI pergunta **Recusar** ou **Atualizar**. Recusar encerra sem gravar. Atualizar aplica a gravação de atualização abaixo.

## Gravação

### Post novo (import)

- Cria o post com o slug do arquivo.
- `published_on` = data de hoje + 7 dias (calendário UTC, mesmo critério de `dateOf` no admin).
- `deleted_at` permanece nulo.
- Grava títulos, descrições, objetivos, corpos, tags, flashcards e textos de LinkedIn dos três idiomas.

### Atualização (import)

- Mantém `published_on` e `deleted_at` do post existente.
- Substitui títulos, descrições, objetivos, corpos, tags, flashcards e textos de LinkedIn.
- Flashcards antigos do post são removidos e substituídos pelos do arquivo.
- Tags do post são redefinidas a partir do arquivo (ver abaixo).

O formulário manual continua podendo adiantar ou postergar `published_on`; isso altera quando o post entra na leitura pública.

### Tags

Para cada posição na lista de tags (1ª tag de pt, 1ª de en, 1ª de es, etc.):

- As três entradas na mesma posição formam **uma** tag ligada ao artigo.
- Se já existir tag com o mesmo `code` derivado do rótulo em português (regra de slugificação a definir no plano, alinhada às tags atuais), reutiliza e atualiza rótulos por idioma se necessário.
- Se não existir, cria `tags` + `tag_locales` para pt, en e es.
- A ordem no artigo segue a ordem no arquivo (campo `position` em `article_tags`).

## Banco de dados

- `article_locales`: nova coluna `objective` (texto, not null default `''` na migração; import exige não vazio).
- Nova tabela `article_linkedin_posts`:
  - `article_id` (FK `articles.id`)
  - `locale` (`pt` | `en` | `es`)
  - `body` (texto do post LinkedIn já normalizado)
  - chave primária `(article_id, locale)`

## Leitura pública

Um post entra no catálogo público só se **todas** forem verdadeiras:

- `deleted_at` nulo;
- corpo não vazio em pt, en e es;
- `published_on` ≤ data de hoje (UTC, dia civil).

Caso contrário, `getArticleBySlug` responde 404 e a lista pública omite o artigo. Redirects de slug antigo só se aplicam a posts que passariam nessas regras.

## Estados no admin

Além de `empty`, `hidden` e `live`, a lista passa a distinguir post completo com data futura:

- `scheduled`, rótulo `Agendado`, se os três corpos existem, `deleted_at` nulo e `published_on` > hoje.
- `live` exige data ≤ hoje, corpos completos e `deleted_at` nulo.

Posts agendados, ocultos ou sem corpo permanecem visíveis na lista de admin.

## Tela — importar

Em `/admin/posts`, ao lado de `Novo post`, botão **Importar markdown**.

1. Escolhe um arquivo `.md`.
2. Envia o conteúdo ao servidor para validação.
3. Se inválido, mostra a lista de erros.
4. Se válido e slug existente, modal: **Recusar** ou **Atualizar**.
5. Se válido e slug novo, grava como post novo (data +7 dias) e atualiza a lista.
6. Falha de rede ou 500: mensagem genérica; nada assumido como gravado.

## Tela — compartilhar no LinkedIn

Na lista de posts, ação **Compartilhar no LinkedIn** (rótulo fixo em português).

- Comportamento igual ao link da página do artigo: abre `https://www.linkedin.com/feed/?shareActive=true&text=…` em nova aba (`target="_blank"`, `rel="noreferrer"`).
- Texto = corpo guardado em `article_linkedin_posts` para **locale pt**.
- Botão **desabilitado** enquanto o post não estiver `live` (não agendado, não oculto, não sem corpo).

Opcional na mesma entrega: mostrar o **Objetivo** ao expandir ou editar o post no admin (somente leitura vinda do import até haver editor).

## Página do artigo — compartilhar

`ArticleShare` monta a mensagem do LinkedIn assim:

- Se existir `article_linkedin_posts.body` para o idioma ativo, usa esse texto (já com URL canônica).
- Senão, mantém o comportamento atual: intro traduzida + título + descrição + URL do artigo.

WhatsApp, copiar texto, copiar link, PDF e impressão não mudam, salvo se no futuro também usarem o texto de LinkedIn (fora desta entrega).

## API

Funções em módulos dedicados (parser + import + leitura de LinkedIn). Rotas sob `app/api/admin/posts`, mesma proteção de admin das demais.

### `POST /api/admin/posts/import`

Corpo JSON: `{ "markdown": string, "action"?: "create" | "update" | "cancel" }`.

- Sem `action` ou com `action` omitido na primeira chamada: só **valida** e responde:
  - `{ "status": "invalid", "errors": string[] }`, ou
  - `{ "status": "ready", "slug": string, "conflict": boolean }` (`conflict: true` se slug já existe).
- Com `action: "cancel"`: 200 `{ "status": "cancelled" }`, sem efeito.
- Com `action: "create"` e slug livre: grava post novo; 200 `{ "status": "created", "post": AdminPost }`.
- Com `action: "update"` e slug existente: grava atualização; 200 `{ "status": "updated", "post": AdminPost }`.
- Tentativa de `create` com slug ocupado ou `update` com slug desconhecido: 400.

Erros de auth: 401 / 403 como nas outras rotas admin.

### Leitura pública

O catálogo carregado para a SPA inclui, por artigo publicado, mapa opcional `linkedinPosts: { pt?, en?, es? }` ou equivalente embutido na resposta de artigo, para alimentar `ArticleShare` sem endpoint extra público.

## Parser

Módulo puro (sem I/O), testado com os três arquivos de exemplo em `Downloads/artigos-blog-tiago-cosmai/` e variações (idioma faltando, seção vazia, slug inválido).

Exporta algo como `parseEditorialMarkdown(source: string): ParsedEditorial | ParseError[]`.

## Testes

- Parser: três exemplos completos; erros por seção faltando; normalização de URL e remoção de aviso LinkedIn.
- Import API: create com +7 dias; update preserva data e `deleted_at`; recusa inválido; conflito slug; tags por posição; flashcards substituídos.
- Catálogo: data futura oculta; data passada mostra; combinação com oculto e corpo vazio.
- Admin UI: botão import, modal conflito, LinkedIn desabilitado para agendado.
- `ArticleShare`: usa texto guardado por locale; fallback quando ausente.
- `adminPosts.state`: valor `scheduled` e rótulo `Agendado`.

## Fora desta entrega

Publicar no LinkedIn via API OAuth. Editar markdown, tags ou flashcards manualmente no admin (só import + formulário existente de metadados). Import em lote de vários arquivos. Sincronizar de volta para `data/articles/` no repositório. Usar **Objetivo** no HTML público.
