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
            const pixelsData: Array<Uint8Array> = [];

            let linePos = 1;
            while (linePos < line.length) {
                pixelsData.push(line.slice(linePos, linePos + 4));
                linePos += 4;
            }

            switch (filter) {
                case 0: // None
                    this.content = this.content.concat(pixelsData);
                    break;
                case 1: // Sub
                    this.content = this.content.concat(this.parseSubFilter(pixelsData));
                    break;
                case 2: // Up
                    this.content = this.content.concat(this.parseUpFilter(pixelsData, {
                        pos,
                        scanlineLength,
                    }));
                    break;
                case 3:
                    this.content = this.content.concat(this.parseAverageFilter(pixelsData, {
                        pos,
                        scanlineLength,
                    }));
                    break;
                case 4:
                    this.content = this.content.concat(this.parsePaethFilter(pixelsData, {
                        pos,
                        scanlineLength,
                    }));
                    break;
                default:
                    pixelsData.map(() => {
                        this.content.push(new Uint8Array([0, 0, 0, 255]));
                    });
                    break;
            }
            pos += scanlineLength;
        }
    }

    private parseSubFilter(pixelsData: Array<Uint8Array>): Array<Uint8Array> {
        const content: Array<Uint8Array> = [];
        let previousArray = new Uint8Array([0, 0, 0, 0]);

        pixelsData.map((pixel: any) => {
            let newArray: Uint8Array = new Uint8Array([
                (pixel[0] + previousArray[0]) % 256,
                (pixel[1] + previousArray[1]) % 256,
                (pixel[2] + previousArray[2]) % 256,
                (pixel[3] + previousArray[3]) % 256,
            ]);
            previousArray = newArray;
            content.push(newArray);
        });
        return content;
    }

    private parseUpFilter(pixelsData: Array<Uint8Array>, metadata: any): Array<Uint8Array> {
        const content: Array<Uint8Array> = [];
        const previousLinePixels = this.content.slice((metadata.pos / metadata.scanlineLength - 1) * this.width,  (metadata.pos / metadata.scanlineLength - 1) * this.width + this.width);

        pixelsData.map((pixel: any, i: number) => {
            let previousArray = previousLinePixels[i];
            let newArray: Uint8Array = new Uint8Array([
                (pixel[0] + previousArray[0]) % 256,
                (pixel[1] + previousArray[1]) % 256,
                (pixel[2] + previousArray[2]) % 256,
                (pixel[3] + previousArray[3]) % 256,
            ]);
            content.push(newArray);
        });
        return content;
    }

    private parseAverageFilter(pixelsData: Array<Uint8Array>, metadata: any): Array<Uint8Array> {
        const content: Array<Uint8Array> = [];
        const previousLinePixels = this.content.slice((metadata.pos / metadata.scanlineLength - 1) * this.width,  (metadata.pos / metadata.scanlineLength - 1) * this.width + this.width);
        let previousPixel: any = [0, 0, 0, 0];

        pixelsData.map((pixel: any, i: number) => {
            let left = previousPixel;
            let up = previousLinePixels[i];
            let newArray: Uint8Array = new Uint8Array([
                (pixel[0] + Math.floor((left[0] + up[0]) / 2)) % 256,
                (pixel[1] + Math.floor((left[1] + up[1]) / 2)) % 256,
                (pixel[2] + Math.floor((left[2] + up[2]) / 2)) % 256,
                (pixel[3] + Math.floor((left[3] + up[3]) / 2)) % 256,
            ]);
            previousPixel = newArray;
            content.push(previousPixel);
        });
        return  content;
    }

    private parsePaethFilter(pixelsData: Array<Uint8Array>, metadata: any): Array<Uint8Array> {
        const content: Array<Uint8Array> = [];
        const previousLinePixels = this.content.slice((metadata.pos / metadata.scanlineLength - 1) * this.width,  (metadata.pos / metadata.scanlineLength - 1) * this.width + this.width);
        let previousPixel: any = [0, 0, 0, 0];

        pixelsData.map((pixel: any, i: number) => {
            let left = previousPixel;
            let up = previousLinePixels[i];
            let upperleft = i ? previousLinePixels[i - 1] : [0, 0, 0, 0];

            let bytes = pixel.map((byte: any, byte_index: number) => {
                const p = left[byte_index] + up[byte_index] - upperleft[byte_index];
                const pa = Math.abs(p - left[byte_index]);
                const pb = Math.abs(p - up[byte_index]);
                const pc = Math.abs(p - upperleft[byte_index]);

                if (pa <= pb && pa <= pc) return (byte + left[byte_index]);
                else if (pb <= pc) return (byte + up[byte_index]);
                else return (byte + upperleft[byte_index]);
            });
            previousPixel = bytes;
            content.push(previousPixel);
        });
        return content;
    }
}
