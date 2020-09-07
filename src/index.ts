import PngImage from "./png-image";

(async function init() {
   const fileUri = "/assets/screen.png";

    const httpResponse = await fetch(fileUri);
    if (!httpResponse.ok) throw new Error(`${fileUri} not found`);

    const buffer: ArrayBuffer = await httpResponse.arrayBuffer();
    const bytes: Uint8Array = new Uint8Array(buffer); // File data to decode

    const image = new PngImage(bytes);

    if (image.content?.length) {
        const htmlContent = document.getElementById("content");
        if (htmlContent) {
            htmlContent.innerText = image.content.join(" | ").slice(0, 2000) + "...";
        }

        const htmlCanvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
        htmlCanvas.width = image.width;
        htmlCanvas.height = image.height;
        if (htmlCanvas) {
            const htmlCtx = htmlCanvas.getContext("2d");
            const imageData = new ImageData(image.width, image.height);

            image.content.map((pixel, i) => {
                imageData.data[i * 4] = pixel[0];
                imageData.data[i * 4 + 1] = pixel[1];
                imageData.data[i * 4 + 2] = pixel[2];
                imageData.data[i * 4 + 3] = pixel[3];
            });
            htmlCtx?.putImageData(imageData , 0, 0);
        }
    }
})();
