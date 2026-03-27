import sharp from "sharp";
import pngToIco from "png-to-ico";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const brand = join(__dirname, "..", "public", "brand");

const horizontal = readFileSync(join(brand, "mokengeli-logo.svg"));
await sharp(horizontal).resize({ width: 960 }).png().toFile(join(brand, "mokengeli-logo.png"));

const squarePath = join(brand, "mokengeli-logo-square.png");
const square = readFileSync(join(brand, "mokengeli-logo-square.svg"));
await sharp(square).resize(512, 512).png().toFile(squarePath);

const icoBuf = await pngToIco([squarePath]);
writeFileSync(join(brand, "mokengeli-logo.ico"), icoBuf);

console.log("OK:", join(brand, "mokengeli-logo.png"), squarePath, join(brand, "mokengeli-logo.ico"));
