
import * as pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import { BadRequestException } from '@nestjs/common';

export class FileParser {
    /**
     * Extract text from a file buffer based on mimetype
     */
    static async extractText(buffer: Buffer, mimetype: string): Promise<string> {
        if (mimetype === 'application/pdf') {
            return this.parsePdf(buffer);
        } else if (
            mimetype === 'text/csv' ||
            mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
            mimetype === 'application/vnd.ms-excel' // .xls
        ) {
            return this.parseSpreadsheet(buffer);
        } else {
            throw new BadRequestException('Unsupported file type. Please upload PDF, CSV, or Excel.');
        }
    }

    private static async parsePdf(buffer: Buffer): Promise<string> {
        try {
            const data = await pdf(buffer);
            return data.text;
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw new BadRequestException('Failed to parse PDF file');
        }
    }

    private static parseSpreadsheet(buffer: Buffer): string {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            // Convert to CSV text
            const csvText = XLSX.utils.sheet_to_csv(sheet);
            return csvText;
        } catch (error) {
            console.error('Error parsing Spreadsheet:', error);
            throw new BadRequestException('Failed to parse spreadsheet file');
        }
    }
}
