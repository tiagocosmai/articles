# Administração: criar, editar e desativar posts

Esta entrega deixa o administrador criar, editar e desativar um post pelo banco. O formulário grava slug, data, título e descrição em português, inglês e espanhol. O corpo não entra no formulário.

Um post novo nasce com os três corpos vazios e fica fora do blog até os três terem texto. Editar um post que já tem corpo muda o site na hora, sem alterar o corpo. Desativar esconde. Ativar mostra de novo, se o corpo ainda existir nas três línguas. Mudar o slug redireciona cada URL antiga para o slug vigente.

A carga a partir de `data/articles` passa a copiar só o corpo dos posts que já estão no banco. Data, títulos, descrições, slug e `deleted_at` editados no admin sobrevivem.

Agendar a aparição pela data, ligar comentários e reações por artigo, receber markdown, guardar texto de LinkedIn, editar tags e flashcards, e restaurar comentário excluído ficam de fora.

## Portão

`/admin/posts` usa o mesmo portão de `/admin` e `/admin/comentarios`.

Deslogado, a página abre o modal de login e não mostra a lista. Fechar o modal deixa a pessoa no portão. Outra conta vê `Esta conta não administra o blog.` e navega para `https://tiagocosmai.github.io/pt/blog`. O administrador vê a lista.

A navegação ganha o link `Posts` para `/admin/posts`, ao lado de `Relatório` e `Comentários`. O link da rota atual leva `aria-current="page"`.

A API não usa a frase da página. Sem sessão responde 401 `{ message: "unauthorized" }`. Com outra conta responde 403 `{ message: "forbidden" }`.

## O que fica visível

O blog público continua de fora um post com `deleted_at`. Também fica de fora um post cujo corpo, depois de tirar os espaços das pontas, esteja vazio em português, inglês ou espanhol.

O estado de cada post na lista de admin é um só:

- `empty`, rótulo `Sem corpo`, se faltar texto em qualquer língua. Vale também quando o post está desativado.
- `hidden`, rótulo `Oculto`, se as três línguas têm texto e `deleted_at` está preenchido.
- `live`, rótulo `No ar`, se as três línguas têm texto e `deleted_at` está vazio.

Ativar limpa `deleted_at` e preenche `updated_at`. Desativar preenche `deleted_at` e `updated_at`. Ativar não publica um post sem corpo. A data de publicação é a data exibida. Uma data futura não esconde o post.

O botão da linha segue `deleted_at`, não o rótulo. Com `deleted_at` vazio, o botão é `Desativar`. Com `deleted_at` preenchido, o botão é `Ativar`. As duas ações não pedem confirmação.

## Tela

A lista em `/admin/posts` mostra todos os posts, inclusive ocultos e sem corpo. A ordem é a data da mais recente para a mais antiga e, na mesma data, o slug de A a Z.

Cada linha mostra o título, o slug, a data e o rótulo do estado. O título é o português, senão o inglês, senão o espanhol, senão o slug. Há `Novo post`, `Editar` e `Ativar` ou `Desativar`.

Lista vazia diz `Não há posts.` Falha ao carregar diz `Não foi possível carregar.` Falha ao salvar diz `Não foi possível salvar.` O formulário e a linha ficam como estavam.

`Novo post` e `Editar` trocam a lista pelo formulário na mesma rota. `Voltar` retorna à lista sem chamar a API. `Salvar` envia o formulário.

Os campos, com esses rótulos, são `Slug`, `Data`, `Título em português`, `Título em inglês`, `Título em espanhol`, `Descrição em português`, `Descrição em inglês` e `Descrição em espanhol`. O envio é `Salvar`. Criar grava os três corpos como texto vazio. Editar não altera o corpo.

O slug gravado é o valor sem espaços nas pontas e em minúsculas. Ele precisa casar `^[a-z0-9]+(?:-[a-z0-9]+)*$`. A data é `AAAA-MM-DD` de um dia que existe. Título e descrição, nas três línguas, são gravados sem espaços nas pontas e não podem ficar vazios.

## API

As funções ficam em `src/api/adminPosts.ts`. As rotas ficam em `app/api/admin/posts`.

`GET /api/admin/posts` responde 200 `{ posts }`. Cada item tem `id`, `slug`, `publishedOn`, `title` e `description` com `pt`, `en` e `es`, e `state` com `live`, `hidden` ou `empty`. O `slug` do item é o vigente.

`POST /api/admin/posts` cria o post e responde 200 `{ post }` no mesmo formato. O corpo recebe `{ slug, publishedOn, title, description }`.

`PATCH /api/admin/posts/:id` altera slug, data, títulos e descrições, deixa o corpo como está e responde 200 `{ post }`. O corpo do pedido tem os mesmos campos da criação. Campo ausente responde 400.

`POST /api/admin/posts/:id/visibility` recebe `{ active: true }` ou `{ active: false }` e responde 200 `{ post }`. `active` ausente ou que não seja booleano responde 400 `{ message: "invalid visibility" }`. Se o post já está no estado pedido, a resposta é 200 `{ post }` e a função não grava.

Post ausente responde 404 `{ message: "not found" }`.

A validação de criar e editar olha, nesta ordem, slug, data, título em português, título em inglês, título em espanhol, descrição em português, descrição em inglês e descrição em espanhol. O primeiro campo ausente ou inválido responde 400 e encerra a validação. As mensagens são `invalid slug`, `invalid date`, `invalid title` e `invalid description`. Com os campos válidos, o slug ocupado responde 400 `slug taken`. A tela não distingue o campo. Mostra `Não foi possível salvar.`

## Slug antigo

A tabela `article_slug_redirects` guarda `slug` e `article_id`. O slug antigo é único na tabela e não coincide com o slug vigente de nenhum post.

A troca acontece numa transação, nesta ordem:

- Se o slug novo, já normalizado, é o vigente, a transação só atualiza data, títulos e descrições.
- Se o slug novo pertence a outro post, ou a um redirecionamento de outro post, a resposta é 400 `slug taken`.
- Se o slug novo é um redirecionamento deste mesmo post, essa linha sai da tabela.
- O slug vigente atual entra na tabela apontando para este post.
- O slug do post passa a ser o novo.

Um segundo rename faz os dois slugs antigos apontarem para o mesmo post. Quem pede qualquer um deles recebe o slug vigente.

`getArticleBySlug` responde 301 `{ slug }` com o slug vigente quando o slug pedido está na tabela e o post está `live`. Responde 404 `{ message: "not found" }` quando o post está oculto, sem corpo, ou quando o slug não existe.

A página `app/[[...path]]/page.tsx`, quando o caminho tem um segmento só e `getArticleBySlug` responde 301, redireciona para `/{slug}` antes de desenhar o shell.

A lista pública inclui `redirects: { from, to }[]` só dos posts `live`. `to` é o slug vigente. `ArticlePage`, ao não achar o slug na lista e achar `from`, troca a URL por `/{to}` sem empilhar a antiga.

## Seed

A carga procura o arquivo pelo slug vigente ou por um slug em `article_slug_redirects`.

Se achar o post, copia só o corpo de cada língua que já existe na linha e que o arquivo traz. Língua sem markdown no arquivo conserva o corpo que já está no banco. A carga não altera título, descrição, data, slug, `deleted_at`, tags nem flashcards.

Se o slug do arquivo não for slug vigente nem slug antigo, a carga insere o post inteiro como hoje, com títulos, descrições, corpo, data, tags e flashcards.

A carga não apaga post que exista só no banco.

## Testes

O catálogo público omite post com `deleted_at` ou com corpo vazio em qualquer língua, e inclui o post com os três corpos preenchidos.

Criar grava corpos vazios e o estado `empty`. Editar muda título e slug e conserva o corpo. O primeiro slug antigo e o segundo apontam para o vigente. Retomar um slug antigo deste mesmo post tira essa linha da tabela.

A API cobre 401, 403, 400 de slug, data, título, descrição e slug ocupado, e 404 de id ausente. Ativar e desativar mudam `deleted_at`. Ativar um post sem corpo deixa o estado `empty`.

`getArticleBySlug` cobre 301 do slug antigo de um post no ar e 404 de post oculto, sem corpo ou desconhecido.

O seed, achando o post pelo slug atual ou por um antigo, troca só o corpo. Título, data, slug e `deleted_at` ficam. Arquivo novo insere o post inteiro. Post que existe só no banco permanece.

A tela mostra `No ar`, `Oculto` e `Sem corpo`, a frase `Não há posts.`, o erro de carga e o erro de salvar sem alterar o formulário. O link `Posts` aponta para `/admin/posts`.
