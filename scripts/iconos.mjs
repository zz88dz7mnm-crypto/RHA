// Genera los íconos de la app: el calendario con tilde de RHA. Uso: node scripts/iconos.mjs
import sharp from "sharp";

const icono = (lado) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 96 96">
    <rect width="96" height="96" fill="#4f46e5"/>
    <g transform="translate(22 22) scale(2.1667)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3"/>
      <path d="M3.5 10h17M8 3v4M16 3v4"/>
      <path d="m9 15 2 2 4-4"/>
    </g>
  </svg>`;

const salidas = [
  ["public/iconos/rha-192.png", 192],
  ["public/iconos/rha-512.png", 512],
  ["src/app/apple-icon.png", 180],
  ["src/app/icon.png", 96],
];

for (const [ruta, lado] of salidas) {
  await sharp(Buffer.from(icono(lado))).png().toFile(ruta);
  console.log(ruta);
}
