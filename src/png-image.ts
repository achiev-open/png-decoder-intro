import PngChunk from "./png-chunk";

export default class PngImage {
    public content: Array<Uint8Array> = [];

    constructor(bytes: Uint8Array) {
        const magicNumberBytes = bytes.slice(0, 8);
        const magicNumber = Buffer.from(magicNumberBytes).toString("hex");
        if (magicNumber !== "89504e470d0a1a0a") throw new Error("Not a png file");

        let pos = 8;
        while (pos < bytes.length) {
            const chunk = new PngChunk(bytes.slice(pos));

            // We will parse the data here depending on the chunk type
            pos += chunk.totalLength;
        }
    }
}
