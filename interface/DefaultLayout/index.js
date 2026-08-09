import Head from "next/head";
import { PageLayout, Header, Text } from "@primer/react";

export default function DefaultLayout({ children, metadata = {} }) {
  return (
    <>
      <Head>
        <title>{metadata.title ? `${metadata.title} · ` : ``}FinTab</title>
        {metadata.description && (
          <meta name="description" content={metadata.description} />
        )}
        {metadata.keywords && (
          <meta name="keywords" content={metadata.keywords} />
        )}
      </Head>
      <Header>
        <Header.Item full>
          <Header.Link href="/">FinTab</Header.Link>
        </Header.Item>
        <Header.Item>
          <Header.Link href="/login">Login</Header.Link>
        </Header.Item>
        <Header.Item>
          <Header.Link href="/cadastrar">Cadastrar</Header.Link>
        </Header.Item>
      </Header>
      <PageLayout>
        <PageLayout.Content>{children}</PageLayout.Content>
        <PageLayout.Footer divider="line">
          <Text size="small">© {new Date().getFullYear()} FinTab</Text>
        </PageLayout.Footer>
      </PageLayout>
    </>
  );
}
