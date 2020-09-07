import PngImage from "./png-image";

(async function init() {
   const fileUri = "/assets/screen.png";

    const httpResponse = await fetch(fileUri);
    if (!httpResponse.ok) throw new Error(`${fileUri} not found`);

    const buffer: ArrayBuffer = await httpResponse.arrayBuffer();
    const bytes: Uint8Array = new Uint8Array(buffer); // File data to decode

    const image = new PngImage(bytes);
})();
