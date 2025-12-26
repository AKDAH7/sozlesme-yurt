export async function handler(method: string) {
  return Response.json({ ok: true, method });
}

export async function PATCH() {
  return handler('PATCH');
}
