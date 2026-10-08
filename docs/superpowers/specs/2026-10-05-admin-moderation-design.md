# Administração: acesso, moderação e relatório

Esta entrega abre a área de administração para uma única pessoa e coloca nela a moderação de comentários e o relatório de cada artigo. Criar, editar e desativar posts, agendar publicação, ligar comentários e reações por artigo, receber markdown e guardar o texto de LinkedIn ficam para a entrega seguinte.

A aplicação já tem login, comentários, reações e a rota `/admin`, que hoje só mostra o nome de quem entrou. Esta entrega estende esse código. O botão do Gmail continua dependendo de `AUTH_PROVIDERS` incluir `gmail` e das credenciais `GMAIL_ID` e `GMAIL_SECRET`.

## Acesso

Só uma pessoa administra o blog. Ela entra pelo GitHub com usuário `tiagocosmai` ou pelo Gmail `tiagocosmai@gmail.com`. Os dois logins são o mesmo usuário, com papel `admin`. Nenhuma outra conta recebe esse papel.

A comparação do GitHub é exata com `tiagocosmai`. A do Gmail usa o e-mail em minúsculas e sem espaços nas pontas.

A regra fica na função que já grava o login:

- Se a identidade deste provedor já existe, usa aquele usuário. Se o login é um dos dois permitidos e o papel ainda é leitor, passa a `admin`.
- Se a identidade ainda não existe e o login é permitido, procura o usuário que já tem o outro login permitido e gruda a identidade nova nele. Se ninguém existe ainda, cria o usuário já como `admin`.
- Se o Gmail permitido já está gravado num usuário diferente do GitHub, a identidade muda para o usuário do GitHub. Os comentários e as reações da conta duplicada passam para ele. A conta duplicada fica com `deleted_at`. O login devolve o id do administrador, que é o usuário que permanece. Se só o Gmail existir, ele é o administrador e o GitHub gruda nele depois.
- Qualquer outro login segue o comportamento atual: liga à sessão aberta, se houver, ou cria um leitor. Não promove a `admin`.

## Portão

`/admin` e `/admin/comentarios` passam pelo mesmo portão antes de mostrar relatório ou comentários.

Deslogado, a página não mostra os controles. Abre o modal de login que já lista GitHub, Gmail e os outros métodos configurados. Se o login for o administrador, o modal fecha e a rota renderiza. Se for outra conta, inclusive visitante, a página mostra «Esta conta não administra o blog.» e, com a frase já visível, navega para `https://tiagocosmai.github.io/pt/blog`. Não há botão extra de confirmação. Fechar o modal sem entrar deixa a pessoa no portão, sem dados de administração e sem ir para o blog.

Já logado como administrador, a rota renderiza direto, sem modal. Já logado com outra conta, não abre o modal: mostra a mesma frase e segue para a mesma home do blog.

A API não usa esse aviso. Sem sessão responde 401. Com outra conta responde 403.

## Telas

As duas rotas compartilham a barra de abas Relatório e Comentários. Relatório aponta para `/admin`. Comentários aponta para `/admin/comentarios` e preserva os filtros no endereço.

O relatório tem uma linha por artigo com `deleted_at` nulo, da data de publicação mais nova para a mais antiga. O título é o de português; se faltar, o de inglês; se faltar, o de espanhol; se nenhum idioma tiver título, o slug. `articleTitle` na lista de comentários usa essa mesma escolha. Cada linha mostra pendentes, aprovados e recusados, e as reações ativas nos tipos `like`, `celebrate`, `support`, `love`, `insightful` e `funny`, com os rótulos gostei, parabéns, apoio, amei, genial e divertido. Artigo sem atividade entra com zero. Artigo excluído não entra. A tabela não altera dados.

A lista de comentários mostra os que não estão excluídos, do mais novo para o mais antigo. Cada linha traz o artigo, o nome de quem escreveu, a data, o status, o texto e, quando `parentId` está preenchido, a marca de resposta. Resposta tem status próprio e é uma linha separada.

Os filtros ficam na query. `status` aceita `pending`, `approved` ou `rejected`. Sem o parâmetro, entram os três. `article` recebe o slug. Sem ele, entram todos os artigos. Um slug que não existe devolve lista vazia. Mudar o status para um valor fora do filtro tira a linha da lista. Excluir pede confirmação, preenche `deleted_at` e tira o comentário da moderação e do blog. Não há restauração nesta entrega.

Lista vazia, no relatório ou nos comentários, diz que não há itens para o filtro atual. Falha ao carregar mostra o erro e não inventa números. Falha ao gravar status ou exclusão mantém a linha como estava e mostra o erro nela. Cancelar a confirmação não altera nada.

## API

`GET /api/admin/report` devolve os artigos visíveis para o relatório. Cada item traz `slug`, `title`, `publishedOn`, `comments` com `pending`, `approved` e `rejected`, e `reactions` com a contagem ativa de cada um dos seis tipos. Comentário excluído e reação excluída não entram na conta.

`GET /api/admin/comments` aceita `status` e `article`. Cada comentário não excluído traz `id`, `articleSlug`, `articleTitle`, `authorName`, `createdAt`, `status`, `body` e `parentId`. `parentId` nulo é comentário de topo. A ordem é da data mais nova para a mais antiga. `status` fora dos três valores responde 400.

`POST /api/admin/comments/:id/status` recebe `{ status }` com `pending`, `approved` ou `rejected`. O status é conferido antes de buscar o comentário: valor ausente ou fora dos três responde 400. Comentário ausente ou já excluído responde 404. Nos demais casos atualiza e devolve a linha. Repetir o mesmo status responde 200 com a linha atual. As rotas separadas de aprovar e recusar deixam de existir.

`DELETE /api/admin/comments/:id` preenche `deleted_at` e `updated_at`. Comentário ausente ou já excluído responde 404. A exclusão feita pelo leitor no artigo continua na rota pública.

## Testes

A união das contas cobre: GitHub `tiagocosmai` cria o administrador; Gmail `tiagocosmai@gmail.com` gruda nele; outra conta permanece leitora; uma identidade Gmail já gravada noutro usuário muda para o administrador e leva comentários e reações.

O relatório cobre zeros e a exclusão de comentários e reações apagados. A lista cobre os filtros, a ordem e `parentId`. A troca entre os três status, a exclusão lógica e o 403 de quem não administra também entram. O portão cobre deslogado com modal, administrador vendo a rota, e outra conta vendo a frase antes de ir para a home do blog.

## Fora desta entrega

Criar, editar e desativar posts. Agendar a data em que o artigo passa a aparecer. Ligar ou desligar comentários e reações num artigo. Upload do markdown editorial. Tabela e cópia do texto de LinkedIn. Restaurar um comentário excluído.
