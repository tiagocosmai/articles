# Rolagem, ordenação e contagem da listagem

A home do blog revela os artigos em lotes de 10, em qualquer largura de tela. Acima da lista, a contagem fica à esquerda e a ordenação à direita. O painel de busca, data e tags permanece como está.

A página do artigo não ganha essa barra nem essa rolagem.

## Contagem

O número é o conjunto filtrado em relação ao catálogo recebido pela lista, não o lote já revelado.

| Idioma | Texto |
| --- | --- |
| pt | `{matched} de {total} artigos` |
| en | `{matched} of {total} articles` |
| es | `{matched} de {total} artículos` |

`matched` é quantos artigos passaram na busca, na data e nas tags. `total` é o tamanho do array entregue à lista. Com dois artigos e nenhum filtro, a linha mostra "2 de 2 artigos". Com o filtro zerando o resultado, mostra "0 de 2 artigos" e a mensagem vazia atual permanece.

`t()` continua devolvendo a string crua. O componente troca `{matched}` e `{total}`.

## Ordenação

Dois selects à direita da contagem. A abertura é data, decrescente (a mais recente primeiro), igual à lista de hoje.

| Controle | pt | en | es |
| --- | --- | --- | --- |
| Campo | Data, Título | Date, Title | Fecha, Título |
| Sentido | Crescente, Decrescente | Ascending, Descending | Ascendente, Descendente |

O rótulo visível de cada select é "Ordenar por" / "Sort by" / "Ordenar por" e "Sentido" / "Direction" / "Sentido".

A data compara a string `YYYY-MM-DD`. O título compara o título do idioma ativo com `localeCompare` (`pt-BR`, `en`, `es`). O sentido só inverte essa comparação principal.

Desempate, nos dois sentidos:

- Campo data: slug em ordem crescente.
- Campo título: data da mais recente para a mais antiga e, se a data empatar, slug em ordem crescente.

Trocar o idioma reordena quando o campo é o título, porque o texto comparado muda.

A ordenação fica só no estado da lista. Não entra na URL.

## Rolagem

A lista mostra os 10 primeiros da ordem atual. Um sentinela no fim, escondido de leitores de tela, observa a viewport. Quando entra na tela e ainda há itens, a lista revela mais 10. Isso vale em qualquer largura.

A constante é `LIST_PAGE_SIZE = 10`.

O contador de revelados volta a 10 quando muda a busca, a data, as tags, o campo, o sentido ou o idioma. Se o resultado tem menos de 10 itens, a lista mostra todos e o sentinela não pede outro lote.

Sem `IntersectionObserver`, a lista mostra o resultado filtrado inteiro.

## Cópias locais

Só quando `import.meta.env.MODE === "development"`. O Vitest (`MODE === "test"`) e o build publicado usam o catálogo real.

A home repete cada artigo 15 vezes antes de filtrar, ordenar e contar. São cerca de 30 itens. Cada cópia guarda o artigo original e uma chave de lista `${slug}-${índice}`. O card liga para `/${article.slug}`, o artigo real. Markdown e `data/articles.json` não são duplicados.

## Peças

`filterArticles` só escolhe quem entra e devolve os matches na ordem de entrada. Deixa de ordenar por data.

`sortArticles(articles, locale, { field, direction })` devolve um array novo na ordem descrita acima. `field` é `"date"` ou `"title"`. `direction` é `"asc"` ou `"desc"`.

`repeatArticles(articles, copies)` devolve `{ key, article }[]`. Com `copies === 1`, a chave é o slug.

`HomePage` continua dona da busca, das datas e das tags. No modo development, repete o catálogo e passa esse array adiante. `collectTags` segue deduplicando por id.

`ArticleList` recebe esse array e os filtros. É dona do campo, do sentido e de quantos itens já foram revelados. Filtra, ordena e recorta. A barra mora nesse componente, acima da `ul`.

## Testes

- `sortArticles`: data crescente e decrescente, título no idioma ativo, desempates, troca de sentido sem inverter o desempate.
- `filterArticles`: continua filtrando e passa a preservar a ordem de entrada.
- Recorte: os 10 primeiros e o passo seguinte de mais 10.
- `repeatArticles`: 15 cópias, chaves únicas, slug original.
- Home, no modo de teste: a barra mostra "2 de 2 artigos" com o catálogo real e a ordem inicial é a data decrescente.

## Fora deste escopo

Páginas numeradas, botão "mostrar mais", ordenação na URL, virtualização, barra na página do artigo e cópias no catálogo publicado.
