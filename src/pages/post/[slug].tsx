import { GetStaticProps, GetStaticPaths } from 'next';
import { RichText } from 'prismic-dom';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Head from 'next/head';
import React, { useState } from 'react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { useRouter } from 'next/router';

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post }: PostProps) {
  const router = useRouter();
  const readingTime = post.data.content.map(content => {
    return content.body.text?.split(' ');
  });
  let formatedReadingTime = 0;

  if (readingTime) {
    formatedReadingTime = Math.round(readingTime[0]?.length / 200);
  }

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
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic
    .query([Prismic.predicates.at('document.type', 'posts')])
    .then(response => response.results);
  //  const postsUrls = posts.map(post => post.uid);
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
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});
  if (!response) {
    return {
      notFound: true,
    };
  }
  let post = {};
  if (response) {
    post = {
      first_publication_date: response.first_publication_date,
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

  return {
    props: { post: post },
    revalidate: 60 * 30, //30 minutos
  };
};
