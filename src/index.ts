(async function init() {
   const img = new Image(1028, 464);
   img.src = "/assets/screen.png";

   const canvas: HTMLCanvasElement = document.createElement("canvas");
   canvas.width = img.width;
   canvas.height = img.height;

   const ctx = canvas.getContext("2d");
   if (!ctx) return ;

   img.onload = () => {
      const imgContent = [];
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height) || { data: [] };
      for (let i = 0; i < imgData.data.length; i += 4) {
          imgContent.push(new Uint8Array(imgData.data.slice(i, i + 4)));
      }

      const htmlContent = document.getElementById("content");
      if (htmlContent) {
         htmlContent.innerText = imgContent.join(" | ").slice(0, 2000) + "...";
      }
      const htmlCanvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
      htmlCanvas.width = img.width;
      htmlCanvas.height = img.height;
      if (htmlCanvas) {
          const htmlCtx = htmlCanvas.getContext("2d");
          htmlCtx?.putImageData(imgData, 0, 0);
      }
   };
})();
