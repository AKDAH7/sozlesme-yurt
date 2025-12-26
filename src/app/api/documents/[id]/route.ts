export async function handler(method: string) {
  return Response.json({ ok: true, method });
}

export async function GET() {
  return handler('GET');
}

export async function PATCH() {
  return handler('PATCH');
}
