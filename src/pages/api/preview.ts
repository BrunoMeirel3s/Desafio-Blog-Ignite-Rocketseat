//Tipagem de documentos prismic para utilizar com typescript
import { Document } from '@prismicio/client/types/documents';

//Função criada na pasta services, a mesma faz comunicação com a API do PRISMIC
import { getPrismicClient } from '../../services/prismic';

export default async (req, res) => {
  /**
   * Este arquivo 'preview' será chamado de dentro do Prismic, para isso o mesmo
   * envia para nossa API o arquivo token dentro da requisição, do token estamos desestruturando
   * a ref que possui nossa APIKEY e o documentID que é o slug da publicação
   */
  const { token: ref, documentId } = req.query;

  //instancia prismic possui os métodos da api do PRISMIC
  const prismic = getPrismicClient();

  /**
   * link resolver é a função que será utilizada para analisar o documentID e então redirecionar
   * o link certo para realizar o preview da publicação, de acordo com o tipo da documento que estamos querendo
   * visualizar
   */
  function linkResolver(doc: Document): string {
    if (doc.type === 'posts') {
      return `/post/${doc.uid}`;
    }
    return '/';
  }

  /**
   * redirectUrl recebe a url de acesso ao post caso a ref esteja correta, caso contrário
   * o usuário receberá uma mensagem de erro
   */
  const redirectUrl = await prismic
    .getPreviewResolver(ref, documentId)
    .resolve(linkResolver, '/');

  if (!redirectUrl) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  //redirecionamento do usuário
  res.setPreviewData({ ref });
  res.write(
    `<!DOCTYPE html><html><head><meta http-equiv="Refresh" content="0; url=${redirectUrl}" />
    <script>window.location.href = '${redirectUrl}'</script>
    </head>`
  );
  res.end();
};
