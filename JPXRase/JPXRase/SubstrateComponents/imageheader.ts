﻿///<reference path="../arrayedstream.ts"/>
///<reference path="pixelformats.ts"/>
///<reference path="datatypes.ts"/>
///<reference path="errorobjectprovider.ts"/>
module JxrPicturase.SubstrateComponents {
    export class ImageHeader {
        isHardTileUsed: Boolean;
        hasMultipleTiles: Boolean;
        isFrequencyMode: Boolean;
        spatialTransformation: TransformationState;
        hasIndexTable: Boolean;

        overlapMode: ImageOverlapMode;

        useLongValues: Boolean;
        hasTrimFlexbits: Boolean;

        isNotBgr: Boolean;
        isAlphaPremultiplied: Boolean;
        hasAlphaImagePlane: Boolean;
        outputColorFormat: ColorFormat;
        outputBitDepth: BitDepth;
        width: number;
        height: number;

        numberOfVerticalTiles = 1;
        numberOfHorizontalTiles = 1;
        tileWidthsInMacroblocks: number[] = [];
        tileHeightsInMacroblocks: number[] = [];
        getTileBoundariesLeft() {
            var tileBoundariesLeft: number[] = [0];
            for (var i = 0; i < this.numberOfVerticalTiles; i++)
                tileBoundariesLeft.push(
                    this.tileWidthsInMacroblocks[i]
                    + tileBoundariesLeft[i]);//actually adding tileBoundariesRight
        }
        getTileBoundariesTop() {
            var tileBoundariesTop: number[] = [0];
            for (var i = 0; i < this.numberOfHorizontalTiles; i++)
                tileBoundariesTop.push(
                    this.tileHeightsInMacroblocks[i]
                    + tileBoundariesTop[i]);
        }
        getMacroblocksInEachTile() {
            var macroblocksInEachTile: number[] = [];
            for (var i = 0; i < this.numberOfHorizontalTiles; i++) {
                for (var i2 = 0; i2 < this.numberOfVerticalTiles; i2++) {
                    macroblocksInEachTile.push(
                        this.tileWidthsInMacroblocks[i] * this.tileHeightsInMacroblocks[i]);
                }
            }
            return macroblocksInEachTile;
        }

        marginTop = 0;
        marginLeft = 0;
        marginBottom: number;
        marginRight: number;

        static Parse(imageSubstream: ArrayedStream) {
            var imageHeader = new ImageHeader();

            //signature
            if (imageSubstream.readAsUtf8Text(8) !== 'WMPHOTO\0')
                throw new JxrInvalidSignatureError("GDI_SIGNATURE");

            var bitstream = new ArrayedBitStream(imageSubstream);

            //reserved B
            if (bitstream.readBits(4) != 1)
                throw new JxrUnsupportedEnumError("RESERVED_B");

            imageHeader.isHardTileUsed = (bitstream.readBits(1) == 1);

            //codec version check 2
            if (bitstream.readBits(3) != 1)
                JxrErrorMessage.getMayFailBecauseUnsupportedEnumMessage("RESERVED_C");

            imageHeader.hasMultipleTiles = (bitstream.readBits(1) == 1);
            imageHeader.isFrequencyMode = (bitstream.readBits(1) == 1);
            imageHeader.spatialTransformation
            = new TransformationState(
                (bitstream.readBits(1) == 1),
                (bitstream.readBits(1) == 1),
                (bitstream.readBits(1) == 1));
            imageHeader.hasIndexTable = (bitstream.readBits(1) == 1);

            imageHeader.overlapMode = bitstream.readBits(2);
            if (!ImageOverlapMode[imageHeader.overlapMode])
                throw new JxrUnsupportedEnumError("OVERLAP_MODE");

            var hasShortHeader = (bitstream.readBits(1) == 1);
            imageHeader.useLongValues = (bitstream.readBits(1) == 1);
            var useWindowing = (bitstream.readBits(1) == 1);
            imageHeader.hasTrimFlexbits = (bitstream.readBits(1) == 1);

            //codec version check 3
            if (bitstream.readBits(1) != 0)
                JxrErrorMessage.getMayFailBecauseUnsupportedEnumMessage("RESERVED_D");

            imageHeader.isNotBgr = (bitstream.readBits(1) == 1);
            imageHeader.isAlphaPremultiplied = (bitstream.readBits(1) == 1);
            imageHeader.hasAlphaImagePlane = (bitstream.readBits(1) == 1);
            imageHeader.outputColorFormat = bitstream.readBits(4);
            if (!ColorFormat[imageHeader.outputColorFormat])
                throw new JxrUnsupportedEnumError("OUTPUT_CLR_FMT");
            imageHeader.outputBitDepth = bitstream.readBits(4);
            if (!BitDepth[imageHeader.outputBitDepth])
                throw new JxrUnsupportedEnumError("OUTPUT_BITDEPTH");
            if (hasShortHeader) {
                imageHeader.width = bitstream.readBits(16) + 1;
                imageHeader.height = bitstream.readBits(16) + 1;
            }
            else {
                imageHeader.width = bitstream.readBits(32) + 1;
                imageHeader.height = bitstream.readBits(32) + 1;
            }
            //JPEG XR validity test, 8.3.21 and 8.3.22
            if (imageHeader.width % 2 != 0 && (imageHeader.outputColorFormat == ColorFormat.Yuv420 || imageHeader.outputColorFormat == ColorFormat.Yuv422))
                throw JxrHeaderErrors.WidthError;
            if (imageHeader.height % 2 != 0 && imageHeader.outputColorFormat == ColorFormat.Yuv420)
                throw JxrHeaderErrors.HeightError;

            if (imageHeader.hasMultipleTiles) {
                imageHeader.numberOfVerticalTiles = bitstream.readBits(12) + 1;
                imageHeader.numberOfHorizontalTiles = bitstream.readBits(12) + 1;
            }
            //JPEG XR validity test, 8.3.9
            if ((!imageHeader.hasIndexTable &&
                (imageHeader.isFrequencyMode ||
                imageHeader.numberOfVerticalTiles > 1 ||
                imageHeader.numberOfHorizontalTiles > 1)))
                throw JxrHeaderErrors.IndexTableError;

            for (var i = 0; i < imageHeader.numberOfVerticalTiles - 1; i++)
                imageHeader.tileWidthsInMacroblocks.push(
                    bitstream.readBits(hasShortHeader ? 8 : 16));
            for (var i = 0; i < imageHeader.numberOfHorizontalTiles - 1; i++)
                imageHeader.tileHeightsInMacroblocks.push(
                    bitstream.readBits(hasShortHeader ? 8 : 16));

            if (useWindowing) {
                imageHeader.marginTop = bitstream.readBits(6);
                imageHeader.marginLeft = bitstream.readBits(6);
                imageHeader.marginBottom = bitstream.readBits(6);
                imageHeader.marginRight = bitstream.readBits(6);
            }
            else {
                imageHeader.marginBottom = (16 - (imageHeader.height % 16)) % 16;
                imageHeader.marginRight = (16 - (imageHeader.width % 16)) % 16;
            }
            //JPEG XR validity test, 8.3.27
            if (imageHeader.marginTop % 2 != 0 && imageHeader.outputColorFormat == ColorFormat.Yuv420)
                throw JxrHeaderErrors.TopMarginError;
            //JPEG XR validity test, 8.3.28
            if (imageHeader.marginLeft % 2 != 0 && (imageHeader.outputColorFormat == ColorFormat.Yuv420 || imageHeader.outputColorFormat == ColorFormat.Yuv422))
                throw JxrHeaderErrors.LeftMarginError;
            //JPEG XR validity test, 8.3.29
            if (imageHeader.marginBottom % 2 != 0 && imageHeader.outputColorFormat == ColorFormat.Yuv420)
                throw JxrHeaderErrors.BottomMarginError;
            //JPEG XR validity test, 8.3.30
            if (imageHeader.marginRight % 2 != 0 && (imageHeader.outputColorFormat == ColorFormat.Yuv420 || imageHeader.outputColorFormat == ColorFormat.Yuv422))
                throw JxrHeaderErrors.RightMarginError;

            var extendedWidth = imageHeader.width + imageHeader.marginLeft + imageHeader.marginRight;
            var extendedHeight = imageHeader.height + imageHeader.marginTop + imageHeader.marginBottom;
            //JPEG XR validity test, 8.3.21 and 8.3.22
            if (extendedWidth % 16 != 0)
                throw JxrHeaderErrors.ExtendedWidthError;
            if (extendedHeight % 16 != 0)
                throw JxrHeaderErrors.ExtendedHeightError;
            imageHeader.tileWidthsInMacroblocks.push(extendedWidth / 16 - imageHeader.tileWidthsInMacroblocks.reduce(function (a, b) { return a + b; }, 0));
            imageHeader.tileHeightsInMacroblocks.push(extendedHeight / 16 - imageHeader.tileHeightsInMacroblocks.reduce(function (a, b) { return a + b; }, 0));

            return imageHeader;
        }
    }
}