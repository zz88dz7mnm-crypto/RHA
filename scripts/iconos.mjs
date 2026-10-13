// Genera los íconos de la app: el corazón con tilde de RHA. Uso: node scripts/iconos.mjs
import sharp from "sharp";

const icono = (lado) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 96 96">
    <rect width="96" height="96" fill="#c8103e"/>
    <g transform="translate(22 22) scale(2.1667)">
      <path d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1Z" fill="#fff"/>
      <path d="m8.8 12.4 2.2 2.2 4.3-4.4" fill="none" stroke="#c8103e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
