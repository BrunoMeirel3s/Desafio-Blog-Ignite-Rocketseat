import { GetStaticProps, GetStaticPaths } from 'next';
import { RichText } from 'prismic-dom';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Link from 'next/link';
import styles from './post.module.scss';
import Head from 'next/head';
import React, { useEffect } from 'react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { useRouter } from 'next/router';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        textHtml: string;
        text: string;
      };
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  previousPost: {
    uid: string;
    title: string;
  };
  nextPost: {
    uid: string;
    title: string;
  };
}

export default function Post({
  post,
  preview,
  previousPost,
  nextPost,
}: PostProps) {
  const router = useRouter();
  const readingTime = post.data.content.map(content => {
    return content.body.text?.split(' ');
  });
  let formatedReadingTime = 0;

  if (readingTime) {
    formatedReadingTime = Math.round(readingTime[0]?.length / 200);
  }

  useEffect(() => {
    /**
     * Injetando área de comentários na aplicação para isso estamos utilizando o utteranc
     * que encontra-se instalado no repositório do github dessa aplicação
     */
    let script = document.createElement('script');
    let anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');
    script.setAttribute('repo', 'BrunoMeirel3s/Desafio-Blog-Ignite-Rocketseat');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    anchor.appendChild(script);
  }, []);

  /**
   * isFallback é um parametro retornado pelo next caso a nossa
   * página esteja utilizando getStaticPaths e o caminho a ser
   * acessado ainda não tenha sido renderizado, sendo assim iremos retornar
   * uma div apenas informando que o conteúdo está sendo carregado
   */
  if (router.isFallback) {
    return (
      <div>
        <h1>Carregando...</h1>
      </div>
    );
  }
  return (
    <>
      <Head>
        <title>{post.data.title}</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.bannerContainer}>
          <img src={post.data.banner.url} alt="banner" />
        </div>
        <div className={styles.contentContainer}>
          <h1>{post.data.title}</h1>
          <div>
            <span>
              <FiCalendar />{' '}
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </span>
            <span>
              <FiUser />
              {post.data.author}
            </span>
            <span>
              <FiClock />{' '}
              {`${formatedReadingTime == 0 ? 1 : formatedReadingTime} min`}
            </span>
          </div>
          <div className={styles.editadedDateContainer}>
            {post.first_publication_date !== post.last_publication_date ? (
              <span>
                {format(
                  new Date(post.last_publication_date),
                  "'* editado em' dd MMM yyyy ', às ' HH:mm",
                  {
                    locale: ptBR,
                  }
                )}
              </span>
            ) : (
              ''
            )}
          </div>
          {post.data.content.map(content => {
            return (
              <article key={content.heading}>
                <strong>{content.heading}</strong>
                <span
                  dangerouslySetInnerHTML={{
                    __html: content.body.textHtml,
                  }}
                />
              </article>
            );
          })}
          <hr className={styles.hrPreviousNext} />
          <div className={styles.previousNextPost}>
            {previousPost && (
              <Link href={`/post/${previousPost.uid}`}>
                <a href="">
                  {previousPost.title} <span>Post anterior</span>
                </a>
              </Link>
            )}

            {nextPost && (
              <Link href={`/post/${nextPost.uid}`}>
                <a href="">
                  {nextPost.title} <span>Próximo Post</span>
                </a>
              </Link>
            )}
          </div>
          {preview && (
            <aside>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </div>
        <div id="inject-comments-for-uterances"></div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic
    .query([Prismic.predicates.at('document.type', 'posts')])
    .then(response => response.results);

  const postsUrls = posts.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });
  return {
    paths: postsUrls,
    fallback: true,
  };
};
export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  if (!response) {
    return {
      notFound: true,
    };
  }
  let post = {};
  if (response) {
    post = {
      first_publication_date: response.first_publication_date,
      last_publication_date: response.last_publication_date,
      data: {
        title: response.data.title,
        banner: {
          url: response.data.banner.url,
        },
        author: response.data.author,
        content: response.data.content.map(content => {
          return {
            heading: content.heading,
            body: {
              textHtml: RichText.asHtml(content.body),
              text: RichText.asText(content.body),
            },
          };
        }),
      },
    };
  }

  //the code bellow is used to cope with the previous and next page functionality
  const allPostsInformations = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    { fetch: ['publication.uid'], pageSize: 200 }
  );

  const postsSlugs = allPostsInformations.results.map(post => {
    return {
      uid: post.uid,
      title: post.data.title,
    };
  });

  const currentPostPosition = postsSlugs.findIndex(
    post => post.uid == String(slug)
  );

  const previousPost =
    currentPostPosition != 0 ? postsSlugs[currentPostPosition - 1] : false;

  const nextPost =
    currentPostPosition <= postsSlugs.length - 1
      ? postsSlugs[currentPostPosition + 1]
      : false;

  return {
    props: {
      post: post,
      preview,
      previousPost: previousPost || null,
      nextPost: nextPost || null,
    },
    revalidate: 60 * 30, //30 minutos
  };
};
