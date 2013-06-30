﻿module JxrPicturase {
	export class ArrayedStream {
        private index: number;
        private filearray: Uint8Array;

        constructor(file: ArrayBuffer, initialIndex: number) {
            this.filearray = new Uint8Array(file);
            this.index = initialIndex;
        }

        readAsByteArray(length: number) {
            var indexbefore = this.index;
            var indexafter = this.index + length;
            if (indexafter <= this.filearray.length) {
                this.index = indexafter;
                return this.filearray.subarray(indexbefore, indexafter);
            }
            else
                throw "File reached to the end.";
        }
        
        readAsSubstream(length: number) {
            var indexbefore = this.index;
            var indexafter = this.index + length;
            if (indexafter <= this.filearray.length) {
                this.index = indexafter;
                return new ArrayedStream(this.filearray.subarray(indexbefore, indexafter), 0);
            }
            else
                throw "File reached to the end.";
        }

        readAsUint8() {
            return this.readAsUintArbitrary(1);
        }

        //little endian
        readAsUint16() {
            return this.readAsUintArbitrary(2);
        }

        //little endian
        readAsUint32() {
            return this.readAsUintArbitrary(4);
        }
        
        private readAsUintArbitrary(bytes: number) {
            if (this.index + bytes <= this.filearray.length) {
                var uint = 0;
                for (var i = 0; i < bytes; i++)
                    uint += (this.filearray[this.index + i] << (i * 8))
                this.index += bytes;
                return uint;
            }
            else
                throw "File reached to the end.";
        }

        readAsFloat() {
            0x80000000; //check sign value
            0x7F800000; //check exponential
            0x007FFFFF; //check fraction
        }

        readAsGuidHexString() {
            var byteToHex = (i: number) => { var hexstring = i.toString(16).toUpperCase(); return hexstring.length == 2 ? hexstring : hexstring = '0' + hexstring; };

            var guid1 = (Array.prototype.map.call(this.readAsByteArray(4), byteToHex)).reverse();
            var guid2 = (Array.prototype.map.call(this.readAsByteArray(2), byteToHex)).reverse();
            var guid3 = (Array.prototype.map.call(this.readAsByteArray(2), byteToHex)).reverse();
            var guid4 = (Array.prototype.map.call(this.readAsByteArray(8), byteToHex));
            var guid = "";
            guid = String.prototype.concat.apply(guid, guid1);
            guid = String.prototype.concat.apply(guid, guid2);
            guid = String.prototype.concat.apply(guid, guid3);
            guid = String.prototype.concat.apply(guid, guid4);
            return guid;
        }

        readAsText(length: number) {
            return String.fromCharCode.apply(null, this.readAsByteArray(length));
        }

        moveBy(length: number) {
            var indexafter = this.index + length;
            if (indexafter >= 0 && indexafter <= this.filearray.length)
                this.index = indexafter;
            else
                throw "The stream couldn't seek that position.";
        }

        seek(position: number) {
            if (position >= 0 && position <= this.filearray.length)
                this.index = position;
            else
                throw "The stream couldn't seek that position.";
        }

        getCurrentPosition() {
            return this.index;
        }

        duplicateStream() {
            return new ArrayedStream(this.filearray, this.index);
        }
    }
}