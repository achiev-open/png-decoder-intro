import PngChunk from "./png-chunk";
import pako from "pako";

export default class PngImage {
    public content: Array<Uint8Array> = [];

    public width: number = -1;
    public height: number = -1;
    private bitDepth: number = -1;
    private colourType: number = -1;
    private compressionMethod: number = -1;
    private filterMethod: number = -1;
    private interlaceMethod: number = -1;

    private idatData: Uint8Array = new Uint8Array();

    constructor(bytes: Uint8Array) {
        const magicNumberBytes = bytes.slice(0, 8);
        const magicNumber = Buffer.from(magicNumberBytes).toString("hex");
        if (magicNumber !== "89504e470d0a1a0a") throw new Error("Not a png file");

        let pos = 8;
        while (pos < bytes.length) {
            const chunk = new PngChunk(bytes.slice(pos));

            switch (chunk.type) {
                case "IHDR":
                    this.parseIHDRChunk(chunk);
                    break;
                case "IDAT":
                    this.addIDATChunk(chunk);
                    break;
                case "IEND":
                    this.parseIDATData();
                    break;
            }
            pos += chunk.totalLength;
        }
    }

    private parseIHDRChunk(chunk: PngChunk) {
        this.width = Buffer.from(chunk.data.slice(0, 4)).readUIntBE(0, 4);
        this.height = Buffer.from(chunk.data.slice(4, 8)).readUIntBE(0, 4);

        this.bitDepth = chunk.data.slice(8,9)[0];
        if (this.bitDepth !== 8) throw new Error("bitDepth not supported");

        this.colourType = chunk.data.slice(9, 10)[0];
        if (this.colourType !== 6) throw new Error("colourType not supported");

        this.compressionMethod = chunk.data.slice(10, 11)[0];
        if (this.compressionMethod !== 0) throw new Error("compressionMethod not supported");

        this.filterMethod = chunk.data.slice(11, 12)[0];
        if (this.filterMethod !== 0) throw new Error("filterMethod not supported");

        this.interlaceMethod = chunk.data.slice(12, 13)[0];
        if (this.interlaceMethod !== 0) throw new Error("Interlacing not supported");
    }

    private addIDATChunk(chunk: PngChunk) {
        const tmp = this.idatData;
        this.idatData = new Uint8Array(tmp?.length + chunk.data.length);
        this.idatData.set(tmp);
        this.idatData.set(chunk.data, tmp.length);
    }

    private parseIDATData() {
        const data = pako.inflate(this.idatData);

        let pos = 0;
        const scanlineLength: number = this.width * 4 + 1; // 4 bytes per pixel + 1 for the filter

        while (pos < data.length) {
            const line = data.slice(pos, pos + scanlineLength);
            const filter = line[0];
            const pixelsData = [];

            let linePos = 1;
            while (linePos < line.length) {
                pixelsData.push(line.slice(linePos, linePos + 4));
                linePos += 4;
            }

            // We will process the line data here
            pos += scanlineLength;
        }
    }
}
