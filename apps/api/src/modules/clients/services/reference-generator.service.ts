import { Injectable, Logger } from '@nestjs/common';
import { FileStorageService } from '../../file-storage/file-storage.service';

@Injectable()
export class ReferenceGeneratorService {
  private readonly logger = new Logger(ReferenceGeneratorService.name);

  constructor(private fileStorage: FileStorageService) {}

  /**
   * Generate a deterministic client reference using format {PortfolioCode}{Alpha}{NumericIndex}
   * Alpha is derived from the first alphabetic character of the client name.
   * Examples: 3H001 (for "123 Homes" in portfolio 3), 2N001 ("Nova Coin" in portfolio 2).
   */
  async generateClientRef(portfolioCode: number, name: string): Promise<string> {
    // Determine alpha from first significant A-Z in the name
    const alphaIndex = this.getAlphaFromName(name);

    // Get existing clients in the portfolio to determine next reference for this alpha group
    const existingClients = await this.fileStorage.listFiles('clients', portfolioCode);

    const existingRefs = existingClients
      .map((id) => this.extractRefFromId(id))
      .filter((ref): ref is string => Boolean(ref))
      .filter((ref) => ref.startsWith(portfolioCode.toString()))
      .sort();

    const numericIndex = this.getNextNumericForAlpha(existingRefs, portfolioCode, alphaIndex);

    const ref = `${portfolioCode}${alphaIndex}${numericIndex.toString().padStart(3, '0')}`;
    this.logger.debug(`Generated client reference: ${ref} for portfolio ${portfolioCode}`);
    return ref;
  }

  /**
   * Generate a person reference using format P{NumericIndex}
   * Example: P001, P002, P003, etc.
   */
  async generatePersonRef(): Promise<string> {
    const existingPeople = await this.fileStorage.listFiles('people');
    
    // Extract numeric indices from existing person references
    const existingIndices = existingPeople
      .map(id => this.extractPersonRefFromId(id))
      .filter(ref => ref && ref.startsWith('P'))
      .map(ref => parseInt(ref.substring(1)))
      .filter(num => !isNaN(num))
      .sort((a, b) => a - b);

    // Find next available index
    let nextIndex = 1;
    for (const index of existingIndices) {
      if (index === nextIndex) {
        nextIndex++;
      } else {
        break;
      }
    }

    const ref = `P${nextIndex.toString().padStart(3, '0')}`;
    
    this.logger.debug(`Generated person reference: ${ref}`);
    return ref;
  }

  /**
   * Generate suffix letter for client party relationships
   * Returns A, B, C, etc. based on existing parties for the same person-client combination
   */
  async generateSuffixLetter(clientId: string, personId: string): Promise<string> {
    // This would typically check existing client-party relationships
    // For now, we'll start with 'A' and increment as needed
    // In a full implementation, this would query existing ClientParty records
    
    const existingParties = await this.getExistingClientParties(clientId, personId);
    const usedLetters = existingParties.map(party => party.suffixLetter).sort();
    
    // Find next available letter
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alphabet.length; i++) {
      const letter = alphabet[i];
      if (!usedLetters.includes(letter)) {
        return letter;
      }
    }
    
    // If all letters are used, start with AA, AB, etc.
    return 'AA';
  }

  private extractRefFromId(id: string): string | null {
    // Assuming the file ID contains or is the reference
    // This might need adjustment based on actual file naming convention
    return id;
  }

  private extractPersonRefFromId(id: string): string | null {
    // Assuming the file ID contains or is the reference
    return id;
  }

  private getNextNumericForAlpha(existingRefs: string[], portfolioCode: number, alphaIndex: string): number {
    const portfolioPrefix = portfolioCode.toString();
    let maxNumericIndex = 0;

    for (const ref of existingRefs) {
      // Match refs like 3H001, 1M012, etc.
      const match = ref.match(new RegExp(`^${portfolioPrefix}([A-Z])(\\d{3})$`));
      if (match && match[1] === alphaIndex) {
        const n = parseInt(match[2], 10);
        if (!isNaN(n) && n > maxNumericIndex) maxNumericIndex = n;
      }
    }

    return maxNumericIndex + 1;
  }

  private getAlphaFromName(name: string): string {
    if (!name) return 'X';
    const upper = String(name).toUpperCase().trim();
    // Tokenize by spaces and punctuation
    const tokens = upper.split(/[^A-Z0-9]+/).filter(Boolean);
    const stop = new Set(['THE', 'A', 'AN', 'MR', 'MRS', 'MS', 'DR', 'MISS']);
    for (const t of tokens) {
      if (stop.has(t)) continue;
      const m = t.match(/[A-Z]/);
      if (m) return m[0];
    }
    // Fallback: first alphabetic anywhere
    const any = upper.match(/[A-Z]/);
    return any ? any[0] : 'X';
  }

  /**
   * Public helper so services can derive the alpha used in refs without duplicating logic.
   */
  deriveAlphaFromName(name: string): string {
    return this.getAlphaFromName(name);
  }

  private async getExistingClientParties(clientId: string, personId: string): Promise<any[]> {
    // This is a placeholder - in a full implementation, this would query
    // the client-party relationship data to find existing suffix letters
    // For now, return empty array to always start with 'A'
    return [];
  }

  /**
   * Validate if a reference follows the correct format
   */
  validateClientRef(ref: string): boolean {
    // Format: {PortfolioCode}{Alpha}{NumericIndex}
    // Example: 1A001, 2N123, 10M999
    const clientRefPattern = /^\d+[A-Z]\d{3}$/;
    return clientRefPattern.test(ref);
  }

  /**
   * Validate if a person reference follows the correct format
   */
  validatePersonRef(ref: string): boolean {
    // Format: P{NumericIndex}
    // Example: P001, P123, P999
    const personRefPattern = /^P\d{3}$/;
    return personRefPattern.test(ref);
  }

  /**
   * Extract portfolio code from client reference
   */
  extractPortfolioCode(clientRef: string): number | null {
    if (!this.validateClientRef(clientRef)) {
      return null;
    }
    const match = clientRef.match(/^(\d+)[A-Z]\d{3}$/);
    return match ? parseInt(match[1], 10) : null;
  }
}
