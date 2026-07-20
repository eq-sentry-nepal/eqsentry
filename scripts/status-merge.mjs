#!/usr/bin/env node
/* Merge one probe output (argv[2] JSON file) into status.json / errors.json in
   the working directory. Caps: 30 days of samples, 500 error entries. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const inFile = process.argv[2];
const { sample, errors } = JSON.parse(readFileSync(inFile, "utf8"));
const load = (f, d) => { try { return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d; } catch { return d; } };

const hist = load("status.json", { samples: [] });
hist.samples.push(sample);
const cut = Date.now() - 30 * 864e5;
hist.samples = hist.samples.filter((s) => s.t >= cut).slice(-3000);
hist.updated = new Date().toISOString();
writeFileSync("status.json", JSON.stringify(hist));

const elog = load("errors.json", { errors: [] });
elog.errors.push(...errors);
elog.errors = elog.errors.slice(-500);
elog.updated = hist.updated;
writeFileSync("errors.json", JSON.stringify(elog));

console.log(`samples=${hist.samples.length} errors=${elog.errors.length} new-errors=${errors.length}`);
