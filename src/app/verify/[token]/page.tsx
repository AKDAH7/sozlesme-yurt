import VerifyClient from "@/components/verify/VerifyClient";

export default async function Page(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  return <VerifyClient initialToken={token} />;
}
