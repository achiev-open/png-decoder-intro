export default class PngChunk {
    public totalLength: number;
    public dataLength: number;
    public type: string;
    public data: Uint8Array;
    public crc: Uint8Array;

    constructor(bytes: Uint8Array) {
        this.dataLength = this.getLength(bytes);
        this.type = this.getType(bytes);
        this.data = this.getData(bytes);
        this.crc = this.getCRC(bytes);
        this.totalLength = this.dataLength + 12;
    }

    private getLength(bytes: Uint8Array): number {
        const length_bytes: Uint8Array = bytes.slice(0, 4);
        const buffer = Buffer.from(length_bytes);
        return buffer.readUIntBE(0, length_bytes.length);
    }

    private getType(bytes: Uint8Array): string {
        const type_byte: Uint8Array = bytes.slice(4, 8);
        return (new TextDecoder("ascii")).decode(type_byte);
    }

    private getData(bytes: Uint8Array): Uint8Array {
        return bytes.slice(8, 8 + this.dataLength);
    }

    private getCRC(bytes: Uint8Array): Uint8Array {
        return bytes.slice(8 + this.dataLength, 8 + this.dataLength + 4);
    }
}
