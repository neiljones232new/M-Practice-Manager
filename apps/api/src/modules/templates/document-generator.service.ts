import { Injectable, Logger } from '@nestjs/common';
import { Template } from './interfaces';
import { HandlebarsService } from './handlebars.service';
import PdfPrinter = require('pdfmake');
import { TDocumentDefinitions, Content, ContentText } from 'pdfmake/interfaces';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel,
  AlignmentType,
  UnderlineType,
} from 'docx';

interface ConditionalBlock {
  condition: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

interface ListBlock {
  listKey: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

@Injectable()
export class DocumentGeneratorService {
  private readonly logger = new Logger(DocumentGeneratorService.name);

  constructor(private readonly handlebarsService: HandlebarsService) {}

  /**
   * Generate PDF from populated template content
   * Requirements: 2.6, 8.1
   */
  async generatePDF(content: string, template: Template): Promise<Buffer> {
    try {
      // Convert markdown-style content to PDF document definition
      const docDefinition = this.createPdfDocumentDefinition(content, template);

      // Create PDF using pdfmake with built-in fonts
      // Using standard fonts that don't require external font files
      const fonts = {
        Courier: {
          normal: 'Courier',
          bold: 'Courier-Bold',
          italics: 'Courier-Oblique',
          bolditalics: 'Courier-BoldOblique',
        },
        Helvetica: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique',
        },
        Times: {
          normal: 'Times-Roman',
          bold: 'Times-Bold',
          italics: 'Times-Italic',
          bolditalics: 'Times-BoldItalic',
        },
      };

      const printer = new PdfPrinter(fonts);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      // Collect PDF chunks
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
      });
    } catch (error) {
      this.logger.error('Failed to generate PDF:', error);
      throw error;
    }
  }

  /**
   * Generate DOCX from populated template content
   * Requirements: 2.6, 8.1
   */
  async generateDOCX(content: string, template: Template): Promise<Buffer> {
    try {
      // Parse content into DOCX paragraphs
      const paragraphs = this.parseContentForDocx(content, template);

      // Create DOCX document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch = 1440 twips
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },

            children: paragraphs,
          },
        ],
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      this.logger.error('Failed to generate DOCX:', error);
      throw error;
    }
  }

  /**
   * Populate template with values, handling conditionals and lists
   * Supports both Handlebars and legacy syntax for backward compatibility
   * Requirements: 2.3, 2.6, 9.4, 9.5
   */
  populateTemplate(templateContent: string, values: Record<string, any>): string {
    try {
      // Check if template uses Handlebars syntax
      if (this.handlebarsService.isHandlebarsTemplate(templateContent)) {
        this.logger.debug('Using Handlebars template engine');
        return this.handlebarsService.compile(templateContent, values);
      }

      // Fall back to legacy template processing
      this.logger.debug('Using legacy template engine');
      let content = templateContent;

      // Step 1: Process conditional blocks first
      content = this.processConditionals(content, values);

      // Step 2: Process list blocks
      content = this.processLists(content, values);

      // Step 3: Replace simple placeholders
      content = this.replaceSimplePlaceholders(content, values);

      return content;
    } catch (error) {
      this.logger.error('Failed to populate template:', error);
      throw error;
    }
  }

  /**
   * Process conditional content blocks
   * Syntax: {{if:condition}}content{{endif}}
   * Requirements: 9.4
   */
  private processConditionals(content: string, values: Record<string, any>): string {
    const conditionalBlocks = this.extractConditionalBlocks(content);

    // Process blocks in reverse order to maintain correct indices
    for (let i = conditionalBlocks.length - 1; i >= 0; i--) {
      const block = conditionalBlocks[i];
      const shouldInclude = this.evaluateCondition(block.condition, values);

      if (shouldInclude) {
        // Replace the entire block with just the content (remove if/endif tags)
        content = 
          content.substring(0, block.startIndex) +
          block.content +
          content.substring(block.endIndex);
      } else {
        // Remove the entire block
        content = 
          content.substring(0, block.startIndex) +
          content.substring(block.endIndex);
      }
    }

    return content;
  }

  /**
   * Extract conditional blocks from content
   */
  private extractConditionalBlocks(content: string): ConditionalBlock[] {
    const blocks: ConditionalBlock[] = [];
    const ifRegex = /\{\{if:([a-zA-Z0-9_]+)\}\}/g;
    const endifRegex = /\{\{endif\}\}/g;

    let match: RegExpExecArray | null;
    const ifMatches: Array<{ condition: string; index: number }> = [];

    // Find all {{if:condition}} tags
    while ((match = ifRegex.exec(content)) !== null) {
      ifMatches.push({
        condition: match[1],
        index: match.index,
      });
    }

    // Find all {{endif}} tags
    const endifMatches: number[] = [];
    while ((match = endifRegex.exec(content)) !== null) {
      endifMatches.push(match.index);
    }

    // Match if/endif pairs
    for (let i = 0; i < ifMatches.length && i < endifMatches.length; i++) {
      const ifMatch = ifMatches[i];
      const endifIndex = endifMatches[i];
      
      // Calculate the actual content between tags
      const startTagEnd = content.indexOf('}}', ifMatch.index) + 2;
      const contentBetween = content.substring(startTagEnd, endifIndex);

      blocks.push({
        condition: ifMatch.condition,
        content: contentBetween,
        startIndex: ifMatch.index,
        endIndex: endifIndex + '{{endif}}'.length,
      });
    }

    return blocks;
  }

  /**
   * Evaluate a condition based on values
   * Returns true if the value exists and is truthy
   */
  private evaluateCondition(condition: string, values: Record<string, any>): boolean {
    const value = values[condition];
    
    // Check if value exists and is truthy
    if (value === undefined || value === null || value === '') {
      return false;
    }

    // For boolean values
    if (typeof value === 'boolean') {
      return value;
    }

    // For arrays, check if not empty
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // For objects, check if not empty
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    // For numbers, check if not zero
    if (typeof value === 'number') {
      return value !== 0;
    }

    // For strings, check if not empty
    return true;
  }

  /**
   * Process list blocks
   * Syntax: {{list:key}}template{{endlist}}
   * Requirements: 9.5
   */
  private processLists(content: string, values: Record<string, any>): string {
    const listBlocks = this.extractListBlocks(content);

    // Process blocks in reverse order to maintain correct indices
    for (let i = listBlocks.length - 1; i >= 0; i--) {
      const block = listBlocks[i];
      const listData = values[block.listKey];

      let replacement = '';

      if (Array.isArray(listData) && listData.length > 0) {
        // Render the template for each item in the list
        replacement = listData
          .map(item => this.renderListItem(block.content, item))
          .join('\n');
      }

      // Replace the entire list block with the rendered content
      content = 
        content.substring(0, block.startIndex) +
        replacement +
        content.substring(block.endIndex);
    }

    return content;
  }

  /**
   * Extract list blocks from content
   */
  private extractListBlocks(content: string): ListBlock[] {
    const blocks: ListBlock[] = [];
    const listRegex = /\{\{list:([a-zA-Z0-9_]+)\}\}/g;
    const endlistRegex = /\{\{endlist\}\}/g;

    let match: RegExpExecArray | null;
    const listMatches: Array<{ listKey: string; index: number }> = [];

    // Find all {{list:key}} tags
    while ((match = listRegex.exec(content)) !== null) {
      listMatches.push({
        listKey: match[1],
        index: match.index,
      });
    }

    // Find all {{endlist}} tags
    const endlistMatches: number[] = [];
    while ((match = endlistRegex.exec(content)) !== null) {
      endlistMatches.push(match.index);
    }

    // Match list/endlist pairs
    for (let i = 0; i < listMatches.length && i < endlistMatches.length; i++) {
      const listMatch = listMatches[i];
      const endlistIndex = endlistMatches[i];
      
      // Calculate the actual content between tags
      const startTagEnd = content.indexOf('}}', listMatch.index) + 2;
      const contentBetween = content.substring(startTagEnd, endlistIndex);

      blocks.push({
        listKey: listMatch.listKey,
        content: contentBetween,
        startIndex: listMatch.index,
        endIndex: endlistIndex + '{{endlist}}'.length,
      });
    }

    return blocks;
  }

  /**
   * Render a list item by replacing placeholders with item properties
   */
  private renderListItem(template: string, item: any): string {
    let rendered = template;

    if (typeof item === 'object' && item !== null) {
      // Replace placeholders with item properties
      for (const [key, value] of Object.entries(item)) {
        const placeholder = `{{${key}}}`;
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        rendered = rendered.replace(new RegExp(this.escapeRegex(placeholder), 'g'), stringValue);
      }
    } else {
      // If item is a primitive, replace {{item}} placeholder
      const stringValue = item !== null && item !== undefined ? String(item) : '';
      rendered = rendered.replace(/\{\{item\}\}/g, stringValue);
    }

    return rendered;
  }

  /**
   * Replace simple placeholders with values
   * Syntax: {{key}}
   */
  private replaceSimplePlaceholders(content: string, values: Record<string, any>): string {
    let result = content;

    // Replace all {{key}} placeholders
    for (const [key, value] of Object.entries(values)) {
      // Skip arrays and objects (they should be handled by list processing)
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        continue;
      }

      const placeholder = `{{${key}}}`;
      const stringValue = value !== null && value !== undefined ? String(value) : '';
      
      // Use global replace with escaped regex
      result = result.replace(new RegExp(this.escapeRegex(placeholder), 'g'), stringValue);
    }

    return result;
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create PDF document definition with MDJ branding
   * Requirements: 2.6, 8.1
   */
  private createPdfDocumentDefinition(content: string, template: Template): TDocumentDefinitions {
    // Parse content into structured format
    const contentBlocks = this.parseContentForPdf(content);

    return {
      pageSize: 'A4',
      pageMargins: [60, 80, 60, 60],
      header: (currentPage, pageCount) => {
        return {
          columns: [
            {
              text: 'MDJ Consultants',
              style: 'header',
              alignment: 'left',
              margin: [60, 30, 0, 0],
            },
            {
              text: `Page ${currentPage} of ${pageCount}`,
              style: 'pageNumber',
              alignment: 'right',
              margin: [0, 30, 60, 0],
            },
          ],
        };
      },
      footer: (currentPage, pageCount) => {
        return {
          text: `${template.name} - Generated on ${new Date().toLocaleDateString('en-GB')}`,
          style: 'footer',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        };
      },
      content: contentBlocks,
      styles: {
        header: {
          fontSize: 14,
          bold: true,
          color: '#1a1a1a',
        },
        pageNumber: {
          fontSize: 9,
          color: '#666666',
        },
        footer: {
          fontSize: 8,
          color: '#999999',
        },
        title: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        heading: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5],
        },
        body: {
          fontSize: 11,
          lineHeight: 1.5,
          margin: [0, 0, 0, 10],
        },
        date: {
          fontSize: 11,
          margin: [0, 0, 0, 20],
        },
        address: {
          fontSize: 11,
          margin: [0, 0, 0, 20],
        },
        signature: {
          fontSize: 11,
          margin: [0, 30, 0, 0],
        },
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 11,
      },
    };
  }

  /**
   * Parse content into PDF content blocks
   */
  private parseContentForPdf(content: string): Content[] {
    const blocks: Content[] = [];
    const lines = content.split('\n');

    let currentParagraph: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines between paragraphs
      if (trimmedLine === '') {
        if (currentParagraph.length > 0) {
          blocks.push({
            text: currentParagraph.join('\n'),
            style: 'body',
          } as ContentText);
          currentParagraph = [];
        }
        continue;
      }

      // Check for markdown-style headings
      if (trimmedLine.startsWith('# ')) {
        // Flush current paragraph
        if (currentParagraph.length > 0) {
          blocks.push({
            text: currentParagraph.join('\n'),
            style: 'body',
          } as ContentText);
          currentParagraph = [];
        }
        // Add title
        blocks.push({
          text: trimmedLine.substring(2),
          style: 'title',
        } as ContentText);
        continue;
      }

      if (trimmedLine.startsWith('## ')) {
        // Flush current paragraph
        if (currentParagraph.length > 0) {
          blocks.push({
            text: currentParagraph.join('\n'),
            style: 'body',
          } as ContentText);
          currentParagraph = [];
        }
        // Add heading
        blocks.push({
          text: trimmedLine.substring(3),
          style: 'heading',
        } as ContentText);
        continue;
      }

      // Check for date patterns (e.g., "Date: 12/11/2025")
      if (trimmedLine.toLowerCase().startsWith('date:')) {
        // Flush current paragraph
        if (currentParagraph.length > 0) {
          blocks.push({
            text: currentParagraph.join('\n'),
            style: 'body',
          } as ContentText);
          currentParagraph = [];
        }
        blocks.push({
          text: trimmedLine,
          style: 'date',
        } as ContentText);
        continue;
      }

      // Regular line - add to current paragraph
      currentParagraph.push(line);
    }

    // Flush remaining paragraph
    if (currentParagraph.length > 0) {
      blocks.push({
        text: currentParagraph.join('\n'),
        style: 'body',
      } as ContentText);
    }

    return blocks;
  }

  /**
   * Parse content into DOCX paragraphs with formatting
   * Requirements: 2.6, 8.1
   */
  private parseContentForDocx(content: string, template: Template): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Add MDJ branding header
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'MDJ Consultants',
            bold: true,
            size: 28,
          }),
        ],
        spacing: { after: 240 },
      })
    );

    // Add separator line
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '─'.repeat(80),
            color: 'CCCCCC',
          }),
        ],
        spacing: { after: 240 },
      })
    );
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine === '') {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { after: 100 },
        }));
        continue;
      }

      // Check for markdown-style headings
      if (trimmedLine.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );
        continue;
      }

      if (trimmedLine.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
        continue;
      }

      if (trimmedLine.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
          })
        );
        continue;
      }

      // Check for bold text (**text**)
      if (trimmedLine.includes('**')) {
        const children = this.parseInlineFormatting(trimmedLine);
        paragraphs.push(
          new Paragraph({
            children,
            spacing: { after: 120 },
          })
        );
        continue;
      }

      // Check for date patterns
      if (trimmedLine.toLowerCase().startsWith('date:')) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                size: 22,
              }),
            ],
            spacing: { after: 240 },
          })
        );
        continue;
      }

      // Regular paragraph
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line, // Use original line to preserve indentation
              size: 22,
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }

    // Add footer with generation info
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '',
          }),
        ],
        spacing: { before: 480 },
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '─'.repeat(80),
            color: 'CCCCCC',
          }),
        ],
        spacing: { after: 120 },
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${template.name} - Generated on ${new Date().toLocaleDateString('en-GB')}`,
            size: 18,
            color: '999999',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    return paragraphs;
  }

  /**
   * Parse inline formatting like bold, italic, underline
   */
  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        runs.push(
          new TextRun({
            text: part.substring(2, part.length - 2),
            bold: true,
            size: 22,
          })
        );
      } else if (part) {
        // Regular text
        runs.push(
          new TextRun({
            text: part,
            size: 22,
          })
        );
      }
    }

    return runs;
  }

  /**
   * Apply formatting to content (for future use)
   */
  applyFormatting(content: string, format: string): string {
    // This method can be extended in the future to apply
    // additional formatting like markdown to HTML conversion,
    // styling, etc.
    return content;
  }
}
