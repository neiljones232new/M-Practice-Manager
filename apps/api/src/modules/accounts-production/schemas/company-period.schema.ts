export const companyPeriodSchema = {
  type: 'object',
  required: ['framework', 'company', 'period'],
  properties: {
    framework: {
      type: 'string',
      enum: ['MICRO_FRS105', 'SMALL_FRS102_1A', 'DORMANT'],
    },
    company: {
      type: 'object',
      required: ['name', 'companyNumber', 'registeredOffice', 'directors'],
      properties: {
        name: { type: 'string', minLength: 1 },
        companyNumber: { type: 'string', minLength: 1 },
        registeredOffice: {
          type: 'object',
          required: ['line1', 'postcode', 'country'],
          properties: {
            line1: { type: 'string', minLength: 1 },
            line2: { type: 'string' },
            town: { type: 'string' },
            county: { type: 'string' },
            postcode: { type: 'string', minLength: 1 },
            country: { type: 'string', minLength: 1 },
          },
          additionalProperties: false,
        },
        directors: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 1 },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    period: {
      type: 'object',
      required: ['startDate', 'endDate', 'isFirstYear'],
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        isFirstYear: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};