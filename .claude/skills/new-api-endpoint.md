# Skill: Add a new API endpoint (frontend side)

When the user asks to call a new backend endpoint, follow this pattern.

## Add the function in api.ts

File: `frontend/src/lib/api.ts`

All API calls go through the `apiFetch` wrapper — never use raw `fetch` for authenticated endpoints.

```ts
export async function myNewEndpoint(payload: MyPayload): Promise<MyResponse> {
  const res = await apiFetch("/endpoint-path", {
    method: "POST",          // or GET, PUT, DELETE
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MyResponse>;
}
```

For GET requests with no body:
```ts
export async function fetchSomething(): Promise<MyResponse> {
  const res = await apiFetch("/endpoint-path");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MyResponse>;
}
```

## Add the type in types.ts

File: `frontend/src/lib/types.ts`

Add request/response types here, not inline in api.ts.

## Use in a component

```ts
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    const result = await myNewEndpoint(payload);
    // handle result
  } catch {
    toast.error("Something went wrong");
  } finally {
    setLoading(false);
  }
};
```

## Rules

- Always use `apiFetch`, never raw `fetch` — it handles auth headers, refresh tokens, and mobile platform headers
- Error messages: use `toast.error(...)` from `sonner` for user-visible errors
- Never expose raw error text to users — just a friendly message
- If the endpoint updates shared state (sessions, subjects, goal), call `reloadStoreData()` from `useStore()` after success
