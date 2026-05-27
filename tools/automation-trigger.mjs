#!/usr/bin/env node

const endpoint = process.env.AUTOMATION_ENDPOINT || "http://localhost:3000/api/automation/trigger";
const secret = process.env.AUTOMATION_TRIGGER_SECRET;
const urls = [];
const memo = [];
let instruction = "";

for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (value === "--instruction") {
    instruction = process.argv[index + 1] || "";
    index += 1;
  } else if (/^https?:\/\//.test(value)) {
    urls.push(value);
  } else {
    memo.push(value);
  }
}

if (!secret) {
  console.error("AUTOMATION_TRIGGER_SECRET is required.");
  process.exit(1);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${secret}`,
  },
  body: JSON.stringify({
    urls,
    discordText: memo.join(" "),
    instruction,
    trigger: "cli",
  }),
});

const json = await response.json();
if (!response.ok) {
  console.error(json);
  process.exit(1);
}

console.log(JSON.stringify(json, null, 2));
