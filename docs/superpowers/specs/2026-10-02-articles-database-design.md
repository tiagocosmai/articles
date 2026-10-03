# Artigos, pessoas, comentários e reações no Neon

O blog deixa de ler o catálogo em disco a cada abertura e passa a ler um Postgres Neon, via Drizzle, no Next.js. Os arquivos atuais continuam no repositório e servem de carga inicial.

Esta etapa entrega o esquema, a carga, a leitura do blog, o login com GitHub e LinkedIn, as reações na página do artigo e os endpoints de comentários e de administração. A lista e o formulário de comentários ficam para depois. A tela de moderação em `/admin` também fica para depois: nesta etapa a rota só confere o papel `admin`.

O banco é o Neon ligado ao projeto `tiagocosmai-articles` na Vercel. A aplicação só enxerga `DATABASE_URL` no servidor. Segredos de login: `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`, `LINKEDIN_ID`, `LINKEDIN_SECRET`. Nenhum deles usa prefixo público.

## Pessoas

`users` tem `id` (uuid), `name`, `email` (pode ser nulo), `role` (`member` ou `admin`) e `created_at`, `updated_at`, `deleted_at`.

`identities` tem `id`, `user_id`, `provider` (`github` ou `linkedin`), `provider_account_id`, `provider_username` (pode ser nulo) e `created_at`. O par provedor e id externo é único. Cada usuário tem no máximo uma identidade por provedor.

A primeira entrada cria o usuário e a identidade e grava o nome vindo da rede. Um login seguinte da mesma identidade atualiza o nome. Se o `provider_username` do GitHub é `tiagocosmai`, o papel nasce `admin`. A segunda rede só é gravada quando a pessoa já está em sessão e escolhe conectar. As duas identidades apontam para o mesmo `user_id`. Comentário e reação usam esse id.

## Artigos

`articles` tem `id` (uuid), `slug` único, `published_on` (data) e `created_at`, `updated_at`, `deleted_at`.

`article_locales` tem `article_id`, `locale` (`pt`, `en` ou `es`), `title`, `description` e `body` (Markdown). O par artigo e idioma é único.

`tags` tem `id` (uuid) e `code` único, o identificador estável de hoje, como `AI`.

`tag_locales` tem `tag_id`, `locale` e `label`. O par tag e idioma é único.

`article_tags` tem `article_id`, `tag_id` e `position`. O par artigo e tag é único.

`flashcards` tem `id`, `article_id`, `locale`, `code`, `front`, `back` e `position`. O trio artigo, idioma e código do cartão é único.

## Comentários

`comments` tem `id`, `article_id`, `user_id`, `parent_id` (nulo quando não é resposta), `body` (`text`, no máximo 4000 caracteres), `status` (`pending`, `approved` ou `rejected`) e `created_at`, `updated_at`, `deleted_at`.

O comentário nasce `pending`. Recusar grava `rejected`. Excluir grava `deleted_at`. Cada resposta tem o próprio estado. `parent_id` aponta para um comentário do mesmo artigo que não esteja excluído, inclusive para outra resposta. A listagem sai por `created_at` crescente.

## Reações

`reactions` tem `id`, `article_id`, `user_id`, `type`, `created_at` e `deleted_at`.

Os tipos são `like`, `celebrate`, `support`, `love`, `insightful` e `funny`. Os rótulos da tela são:

| Código | pt | en | es |
| --- | --- | --- | --- |
| like | Gostei | Like | Me gusta |
| celebrate | Parabéns | Celebrate | Celebrar |
| support | Apoio | Support | Apoyar |
| love | Amei | Love | Me encanta |
| insightful | Genial | Insightful | Instructivo |
| funny | Divertido | Funny | Divertido |

Existe no máximo uma reação ativa por pessoa, artigo e tipo. O índice único ignora linhas com `deleted_at`.

## Leitura do blog

`GET /api/articles` lista os artigos com `deleted_at` nulo, com traduções, tags na ordem e flashcards. `GET /api/articles/:slug` devolve um artigo visível. Artigo ausente ou excluído responde 404.

A home e a página do artigo usam as mesmas consultas. O resultado é convertido para o formato que a tela já consome: slug, data, traduções, tags e flashcards. Filtro, ordenação, embed e os endereços `/` e `/:slug` permanecem.

## Reações na API e na tela

`GET /api/articles/:slug/reactions` devolve, para cada tipo, a quantidade de reações ativas e se a pessoa da sessão marcou aquele tipo. Sem sessão, nenhuma marca vem ligada.

`POST /api/articles/:slug/reactions` exige sessão e recebe `{ type }`. Se já existe uma ativa daquele tipo, devolve essa linha. Se só existe uma excluída, limpa `deleted_at` e atualiza `created_at`. Tipo desconhecido responde 400. Sem sessão responde 401.

`DELETE /api/articles/:slug/reactions/:type` exige sessão e preenche `deleted_at` da reação da própria pessoa.

Na página do artigo, as seis reações mostram o total e, para quem está logado, a marca da reação da própria pessoa. Sem sessão, o clique abre a escolha entre GitHub e LinkedIn e, depois do sucesso, volta ao artigo.

## Comentários na API

`POST /api/articles/:slug/comments` exige sessão. Recebe o texto e, se for resposta, `parentId`. Texto vazio ou acima de 4000 caracteres responde 400. Pai de outro artigo, pai inexistente ou pai excluído responde 400. O estado gravado é `pending`.

`GET /api/articles/:slug/comments` devolve os aprovados e não excluídos de qualquer pessoa. Com sessão, inclui também os não excluídos da própria pessoa, em qualquer estado.

`DELETE /api/articles/:slug/comments/:id` preenche `deleted_at`. A própria pessoa pode excluir o seu. Um admin pode excluir qualquer um. Os demais recebem 403.

## Administração

`/admin` e `/api/admin/*` exigem sessão com papel `admin`. Sem sessão, a API responde 401 e a página pede login. Com sessão e outro papel, a resposta é 403. A página mostra o nome de quem entrou e não lista comentários nem oferece aprovação.

`GET /api/admin/comments` lista todos os comentários com `deleted_at` nulo.

`POST /api/admin/comments/:id/approve` grava `approved`. `POST /api/admin/comments/:id/reject` grava `rejected`. As duas atualizam `updated_at`.

## Carga

Um comando lê `data/articles.json`, os Markdown e os flashcards pelo validador que já existe. Só entra artigo válido. Rodar de novo atualiza pelo `slug`, pelo código da tag e pelo código do cartão, sem duplicar. A carga não apaga `deleted_at` de um artigo que a administração já excluiu.

## Testes

Filtro, ordenação e as telas atuais continuam recebendo o formato de catálogo em memória. Consultas, carga e endpoints rodam contra um Postgres de teste. Cobrem artigo excluído fora da listagem pública, comentário nascendo `pending`, reação repetida do mesmo tipo, segunda rede no mesmo `user_id` e administração recusada para quem não é admin.

## Fora desta etapa

Lista e formulário de comentários na página do artigo. Tela de moderação, publicação automática e as ações visíveis de aprovar e recusar. Outra rede além de GitHub e LinkedIn.
