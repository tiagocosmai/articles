# GitHub Pages do site de artigos

Publicar o site estático do repositório `articles` em `https://tiagocosmai.github.io/articles/`, sem alterar o portfólio.

O portfólio continua em `https://tiagocosmai.github.io/`, publicado pelo repositório `tiagocosmai.github.io`. Este spec não mexe em `portifolio`, em `tiagocosmai.github.io`, nem no token `GH_PAGES_TOKEN`. O GitHub trata `/articles/` como site de projeto do repositório `articles`. No browser isso parece uma rota do mesmo domínio.

Substitui a frase “Deploy fica fora deste escopo” de `docs/superpowers/specs/2026-09-24-articles-site-design.md` só no que diz respeito a este deploy. O restante daquele spec permanece.

## Endereços

| Superfície | URL |
| --- | --- |
| Portfólio (inalterado) | `https://tiagocosmai.github.io/` |
| Home dos artigos | `https://tiagocosmai.github.io/articles/` |
| Artigo | `https://tiagocosmai.github.io/articles/:slug` |
| Exemplo | `https://tiagocosmai.github.io/articles/o-agente-secreto` |
| Tag na home | `https://tiagocosmai.github.io/articles/?tag=AI` |

O rodapé do site de artigos continua apontando para `https://tiagocosmai.github.io/`. Um link no portfólio para `/articles/` fica para depois.

## Base e rotas

No `vite build` e no `vite preview`, `base` é `/articles/`. No `vite` de desenvolvimento e no Vitest, `base` é `/`, para o dia a dia e os testes continuarem na raiz local.

`BrowserRouter` usa `basename` derivado de `import.meta.env.BASE_URL`: remove a barra final; se o resultado for vazio ou `/`, não passa `basename` (comportamento local e de teste).

Rotas internas (depois do basename):

- `/` — home
- `/:slug` — artigo (deixa de ser `/articles/:slug`, para não gerar `/articles/articles/:slug` no Pages)
- `*` — não encontrado

`ArticleCard` liga para `/${article.slug}`. Os testes que hoje abrem `/articles/o-agente-secreto` passam a abrir `/o-agente-secreto`. O href do card no teste da home passa a ser `/o-agente-secreto`. Os links `/?tag=NomeDaTag` não mudam de forma; no Pages o browser resolve isso como `/articles/?tag=NomeDaTag`.

Um slug igual a um arquivo estático da build (`assets`, etc.) não é um caso suportado. Os slugs do catálogo continuam em minúsculas com hífens.

## Publicação

Um workflow em `.github/workflows/deploy-pages.yml` corre em todo push em `master` e em `workflow_dispatch`.

Ordem:

1. `npm ci` e `npm test`
2. `npm run build`
3. copiar `dist/index.html` para `dist/404.html` (refresh e URL compartilhada no Pages)
4. enviar o `dist/` com `actions/upload-pages-artifact` e `actions/deploy-pages`

Permissões do job de deploy: `contents: read`, `pages: write`, `id-token: write`. Sem PAT. Sem branch `gh-pages`. Sem script `deploy` no `package.json`.

Uma vez só, no repositório `articles`: Settings → Pages → Source **GitHub Actions**. Isso pode ser feito pela API do GitHub no mesmo passo de implementação.

## Testes

Os testes existentes da home e do artigo são atualizados para as rotas `/:slug`. O workflow falha o deploy se a suíte falhar.

O `404.html` é o `index.html` da build. Não há teste de HTML do artefato além da suíte e do `npm run build`.

## Fora deste escopo

Alterar o portfólio, o repositório `tiagocosmai.github.io`, domínio próprio, HashRouter, branch `gh-pages`, e comentários / auth / editor / RSS (já fora do spec do site).
