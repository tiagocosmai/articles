# Site de artigos

Site estático em React, Vite, TypeScript e Tailwind para publicar artigos em Markdown e flashcards em JSON, em português, inglês e espanhol. Visual alinhado ao portfólio em [tiagocosmai.github.io](https://tiagocosmai.github.io/): fundos `#030806` e `#f0fdf7`, acento `#00FF41`, texto claro `#ffffff` e texto escuro `#0d1116`, fontes Lato e Courier Prime.

Não há backend. O conteúdo entra na build. A primeira versão roda com `vite dev` e `vite build`. Deploy fica fora deste escopo. A base do Vite é `/`.

## Conteúdo

### Catálogo

`data/articles.json` é a única lista de artigos. Cada item tem esta forma:

```json
{
  "slug": "o-agente-secreto",
  "date": "2026-09-24",
  "tags": ["InteligenciaArtificial", "AgentesDeIA"],
  "locales": {
    "pt": {
      "title": "Título",
      "description": "Descrição curta.",
      "markdown": "o-agente-secreto.pt.md"
    },
    "en": {
      "title": "Title",
      "description": "Short description.",
      "markdown": "o-agente-secreto.en.md"
    },
    "es": {
      "title": "Título",
      "description": "Descripción breve.",
      "markdown": "o-agente-secreto.es.md"
    }
  }
}
```

Regras do catálogo:

- `slug` é único, em minúsculas, com hífens, e é o segmento de `/articles/:slug`.
- `date` é `YYYY-MM-DD`.
- `tags` é uma lista não vazia de strings sem `#`, sem espaço e sem duplicata dentro do item.
- `locales` tem exatamente `pt`, `en` e `es`. Cada um tem `title`, `description` e `markdown` não vazios.
- `markdown` é só o nome do arquivo, relativo a `data/articles/`.

### Arquivos do artigo

Para o slug `o-agente-secreto`:

- `data/articles/o-agente-secreto.pt.md`
- `data/articles/o-agente-secreto.en.md`
- `data/articles/o-agente-secreto.es.md`
- `data/articles/o-agente-secreto.pt.json`
- `data/articles/o-agente-secreto.en.json`
- `data/articles/o-agente-secreto.es.json`

O JSON de flashcards tem o mesmo nome do markdown daquele idioma. Forma:

```json
{
  "cards": [
    { "id": "autonomy-accountability", "front": "Pergunta", "back": "Resposta" }
  ]
}
```

`id` é único dentro do arquivo. `front` e `back` são texto puro, não vazio. Não há pontuação nem modo de prova.

As tags não são lidas do corpo do markdown. A linha de hashtags do rascunho não entra no arquivo publicado. A interface usa só `tags` do catálogo.

### Carga

`import.meta.glob` lê os `.md` como texto e os `.json` de flashcards como módulos. O catálogo importado passa por `validateCatalog(raw, files)`, que devolve `{ articles, errors }`.

Um item é rejeitado, com `console.error`, quando:

- falta campo obrigatório, ou algum texto obrigatório está vazio;
- `date` não é uma data de calendário válida;
- `tags` está vazio, tem item vazio, tem `#`, tem espaço ou tem duplicata;
- `slug` repete um slug já aceito;
- o markdown citado não está no glob;
- o JSON de flashcards com o mesmo nome do markdown não está no glob, não tem `cards`, ou alguma carta tem `id`, `front` ou `back` vazio, ou `id` repetido.

Itens rejeitados não aparecem na home. Itens aceitos exigem os três idiomas completos. Não há troca silenciosa para outro idioma.

### Primeiro artigo

Slug `o-agente-secreto`, data `2026-09-24`. O markdown em português é o texto enviado na conversa, sem os trechos cortados e repetidos (`ambien` e o bloco da supervisão humana colado no meio das seções seguintes). Inglês e espanhol são traduções completas desse texto limpo.

Tags, nesta ordem:

`InteligenciaArtificial`, `AgentesDeIA`, `Lideranca`, `Tecnologia`, `Governanca`, `DesenvolvimentoDeSoftware`, `TransformacaoDigital`, `AI`, `TechLeadership`.

Dez flashcards, com os mesmos `id` nos três idiomas. A coluna seguinte é o assunto que a pergunta e a resposta devem cobrir, não o texto literal da carta.

| id | Assunto |
| --- | --- |
| `assistant-vs-agent` | Diferença entre assistente e agente |
| `autonomy-accountability` | Autonomia pode ser delegada; accountability não |
| `owners` | Dono do processo, responsável técnico e supervisão |
| `risk-surface` | O risco está no que o agente pode fazer, não só no modelo |
| `supervision` | Tempo, contexto, competência e autoridade |
| `code-review` | Quem escreve o código não deve ser a única revisão |
| `guardrails` | Identidade, permissões, parada e reversão |
| `leadership` | Liderança desenha objetivos, limites e controles |
| `judgment` | Julgamento humano não se terceiriza |
| `secret-agent` | A responsabilidade some quando ninguém sabe em nome de quem o agente age |

## Rotas e estado

- `/` lista os artigos aceitos.
- `/articles/:slug` mostra o markdown e os flashcards do idioma ativo.
- Qualquer outro caminho, ou slug desconhecido, mostra a página de artigo não encontrado, com link para `/`.

Tema e idioma ficam em contexto React e no `localStorage`:

- `articles-theme`: `dark` ou `light`. Ausente ou inválido vale `dark`.
- `articles-locale`: `pt`, `en` ou `es`. Ausente ou inválido segue `navigator.language` (`pt`, depois `es`, senão `en`), como no portfólio.

O título da aba acompanha o idioma: `Artigos — Tiago Cosmai`, `Articles — Tiago Cosmai`, `Artículos — Tiago Cosmai`. `document.documentElement.lang` fica `pt-BR`, `en` ou `es`.

Textos fixos da interface (busca, tema, estado vazio, virar carta, artigo não encontrado, arquivo ausente) vivem num dicionário pt/en/es. Título, descrição, markdown e flashcards não passam por esse dicionário.

## Interface

Cabeçalho: nome do site no idioma ativo, seletor de idioma com as bandeiras do portfólio, botão de tema claro/escuro. Rodapé: link para `https://tiagocosmai.github.io/`.

A coluna de leitura usa `max-w-3xl`, padding lateral e quebra em uma coluna no mobile. Cartões da home empilham. Tema escuro usa fundo `#030806` e texto branco. Tema claro usa fundo `#f0fdf7` e texto `#0d1116`. Links e tags usam `#00FF41` no escuro e `#0e7a32` no claro.

### Home

`ArticleFilters` oferece:

- campo de texto;
- `input type="date"` opcional;
- tags distintas do catálogo aceito, como botões `#Tag`.

`filterArticles(articles, locale, filters)` devolve a lista exibida. Ordenação: data decrescente e, na mesma data, slug crescente.

- Texto: substring sem diferenciar maiúsculas, só no título e na descrição do idioma ativo. Vazio não filtra.
- Data: igualdade com `date` do artigo. Vazio não filtra.
- Tags: o artigo precisa ter todas as tags selecionadas. Nenhuma tag selecionada não filtra.

`ArticleCard` mostra título, data e descrição no idioma ativo e aponta para `/articles/:slug`. A data é formatada com `Intl.DateTimeFormat` a partir dos componentes `YYYY-MM-DD`, sem deslocar o dia por fuso.

Sem resultado, a home mostra o estado vazio. Isso não é erro.

### Artigo

`ArticlePage` busca o slug entre os artigos aceitos. Renderiza o markdown com `react-markdown` e `remark-gfm` (títulos, listas, tabelas, links, ênfase). HTML cru do markdown não é renderizado.

Cada tag do artigo leva a `/?tag=NomeDaTag`. A home lê esse parâmetro só na entrada e inicia com essa única tag selecionada; texto e data começam vazios. Cliques seguintes nos filtros ficam no estado da página e não reescrevem a URL.

`Flashcard` mostra `front`. Clique ou Enter/Espaço alterna para `back` e de volta. O botão anuncia o estado para leitores de tela.

Se, depois da validação, o markdown ou as cartas daquele idioma não puderem ser lidos, a página mostra o aviso de arquivo ausente e não usa outro idioma. Na prática a validação já exclui esse artigo; o aviso cobre falha inesperada na leitura.

## Erros

| Situação | Comportamento |
| --- | --- |
| Item inválido no catálogo | Fora da lista, `console.error` |
| Slug desconhecido ou rota inexistente | Página de não encontrado, link para a home |
| Markdown ou flashcards ausentes na leitura | Aviso na página, sem fallback de idioma |
| Busca sem resultado | Estado vazio |

## Testes

Vitest e Testing Library.

`filterArticles`: texto, data exata, uma tag, duas tags obrigatórias, filtro vazio, nenhum resultado, ordem por data.

`validateCatalog`: item completo aceito; item incompleto rejeitado; data inválida rejeitada; slug duplicado fica só o primeiro; markdown ausente rejeitado.

Home: renderiza título, data, descrição e o link do artigo de exemplo.

Artigo: renderiza um trecho do markdown do idioma ativo; a carta troca de frente para verso no clique.

Idioma: trocar o locale troca o título exibido na home.

Persistência: tema e idioma gravados no `localStorage` são relidos na montagem.

## Fora deste escopo

Deploy, comentários, autenticação, editor, modo de prova dos flashcards, árvore hierárquica de tags e RSS.
