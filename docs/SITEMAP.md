# Sitemap do Portfólio

O sitemap é atualizado automaticamente quando uma operação do admin altera quais artigos estão públicos. Também é possível atualizá-lo manualmente em **Administração → Posts** pelo botão **Atualizar sitemap**. O Articles monta o XML usando o catálogo público atual (posts no ar, com conteúdo completo e data vigente) e cria um único commit na branch padrão de `tiagocosmai/portifolio` com:

- `public/sitemap.xml`, publicado na raiz como `https://tiagocosmai.github.io/sitemap.xml`;
- `src/data/generatedBlogCatalog.json`, que permite ao build estático gerar as páginas de metadados dos artigos publicados no banco.

O build do Portfólio usa esse catálogo gerado como a lista pública atual; antes da primeira atualização, recorre a `articles/data/articles.json`. O commit aciona o workflow GitHub Pages já existente. O arquivo `public/robots.txt` anuncia o sitemap para os buscadores. Se o conteúdo não mudou, o botão não cria commit nem inicia outro deploy.

## Configuração do GitHub

1. Crie um fine-grained personal access token para o repositório `tiagocosmai/portifolio`.
2. Dê somente permissão **Contents: Read and write** para esse repositório.
3. Cadastre o token como `SITEMAP_GITHUB_TOKEN` nas variáveis de ambiente do projeto Articles na Vercel e faça um novo deploy. Para desenvolvimento local, use a mesma variável em `.env.local`.
4. Confirme que o workflow de GitHub Pages está habilitado para a branch padrão do Portfólio.

O token é usado apenas no servidor do Articles. Não o coloque em variáveis prefixadas com `NEXT_PUBLIC_` nem em arquivos versionados.

Um cron diário também atualiza o sitemap às 05:00 UTC para incluir posts agendados que acabaram de ficar no ar. Configure `CRON_SECRET` nas variáveis de ambiente da Vercel; o cron usa esse segredo para autenticar a rota interna e não precisa ser exposto ao browser.

Se a branch ou os posts mudarem enquanto a atualização estiver em andamento, o serviço refaz a leitura e tenta publicar novamente até três vezes. Ele não força a branch remota.

Depois da atualização, acompanhe o workflow **Deploy GitHub Pages** e abra o sitemap na URL acima. A inclusão no sitemap ajuda mecanismos de busca a descobrir URLs, mas não garante que sejam rastreadas ou indexadas imediatamente.
