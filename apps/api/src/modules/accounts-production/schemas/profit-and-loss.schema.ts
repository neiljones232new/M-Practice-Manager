const profitAndLossLinesSchema = {
  type: 'object',
  required: ['turnover', 'adminExpenses'],
  properties: {
    turnover: { type: 'number', minimum: 0 },
    costOfSales: { type: 'number', minimum: 0, default: 0 },
    otherIncome: { type: 'number', minimum: 0, default: 0 },
    adminExpenses: { type: 'number', minimum: 0 },
    wages: { type: 'number', minimum: 0, default: 0 },
    rent: { type: 'number', minimum: 0, default: 0 },
    motor: { type: 'number', minimum: 0, default: 0 },
    professionalFees: { type: 'number', minimum: 0, default: 0 },
    otherExpenses: { type: 'number', minimum: 0, default: 0 },
    interestPayable: { type: 'number', minimum: 0, default: 0 },
    taxCharge: { type: 'number', minimum: 0, default: 0 },
    dividendsDeclared: { type: 'number', minimum: 0, default: 0 },
  },
  additionalProperties: false,
};

export const profitAndLossSchema = {
  type: 'object',
  required: ['lines'],
  properties: {
    lines: profitAndLossLinesSchema,
    comparatives: {
      type: 'object',
      properties: {
        priorYearLines: profitAndLossLinesSchema,
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};
