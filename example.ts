import { RqstClient } from "./mod.ts";
import { zod } from "./deps.ts";

const validSchema = zod.object({
    hello: zod.string()
});
const invalidSchema = zod.object({
    invalid: zod.number()
});

const client = new RqstClient();

let response = await client.get("https://zebulon.dev/test.json");
console.log(await response.json({ schema: validSchema }));

response = await client.get("https://zebulon.dev/test.json");
await response.json({ schema: invalidSchema }).catch(() => console.error("Threw an error like expected"));