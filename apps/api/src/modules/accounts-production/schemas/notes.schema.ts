export const notesSchema = {
  type: 'object',
  properties: {
    principalActivity: { type: 'string' },
    countryOfIncorporation: { type: 'string', default: 'England and Wales' },
    employees: {
      type: 'object',
      properties: {
        include: { type: 'boolean', default: false },
        averageEmployees: { type: 'integer', minimum: 0 },
      },
      additionalProperties: false,
    },
    tangibleAssets: {
      type: 'object',
      properties: {
        columns: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
        },
        rows: {
          type: 'array',
          items: {
            type: 'object',
            required: ['label', 'values'],
            properties: {
              label: { type: 'string', minLength: 1 },
              values: {
                type: 'array',
                items: { type: 'number' },
              },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    shareCapital: {
      type: 'object',
      required: ['shareClass', 'numberOfShares', 'nominalValue'],
      properties: {
        shareClass: { type: 'string', minLength: 1 },
        numberOfShares: { type: 'integer', minimum: 0 },
        nominalValue: { type: 'number', minimum: 0 },
        currency: { type: 'string', default: 'GBP' },
      },
      additionalProperties: false,
    },
    directorsLoanNote: {
      type: 'object',
      properties: {
        include: { type: 'boolean', default: false },
        text: { type: 'string' },
      },
      additionalProperties: false,
    },
    commitmentsContingencies: {
      type: 'object',
      properties: {
        include: { type: 'boolean', default: false },
        text: { type: 'string' },
      },
      additionalProperties: false,
    },
    additionalNotes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'text'],
        properties: {
          title: { type: 'string', minLength: 1 },
          text: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};
