export const accountingPoliciesSchema = {
  type: 'object',
  required: ['basisOfPreparation', 'goingConcern'],
  properties: {
    basisOfPreparation: { type: 'string', minLength: 1 },
    goingConcern: {
      type: 'object',
      required: ['isGoingConcern'],
      properties: {
        isGoingConcern: { type: 'boolean' },
        noteText: { type: 'string' },
      },
      additionalProperties: false,
    },
    turnoverPolicyText: { type: 'string' },
    tangibleFixedAssets: {
      type: 'object',
      required: ['hasAssets'],
      properties: {
        hasAssets: { type: 'boolean' },
        depreciationMethod: {
          type: 'string',
          enum: ['STRAIGHT_LINE', 'REDUCING_BALANCE'],
        },
        rates: {
          type: 'array',
          items: {
            type: 'object',
            required: ['category', 'ratePercent'],
            properties: {
              category: { type: 'string', minLength: 1 },
              ratePercent: { type: 'number', minimum: 0, maximum: 100 },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};