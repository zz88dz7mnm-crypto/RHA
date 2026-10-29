/**
 * Achica una foto antes de subirla: lado mayor de 2400 px como mucho, en JPEG.
 * Una foto del celular (5–10 MB) queda en unos cientos de KB y carga rápido como fondo.
 */
const LADO_MAXIMO = 2400;

export async function achicarImagen(archivo: File): Promise<Blob> {
  if (!archivo.type.startsWith("image/")) throw new Error("No es una imagen.");
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext("2d")!.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo convertir la imagen."))), "image/jpeg", 0.82));
}
