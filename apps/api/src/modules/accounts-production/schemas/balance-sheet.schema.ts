const fixedAssetsSchema = {
  type: 'object',
  properties: {
    tangibleFixedAssets: { type: 'number', minimum: 0, default: 0 },
    intangibleAssets: { type: 'number', minimum: 0, default: 0 },
    investments: { type: 'number', minimum: 0, default: 0 },
  },
  additionalProperties: false,
};

const currentAssetsSchema = {
  type: 'object',
  required: ['cash'],
  properties: {
    stock: { type: 'number', minimum: 0, default: 0 },
    debtors: { type: 'number', minimum: 0, default: 0 },
    cash: { type: 'number', minimum: 0 },
    prepayments: { type: 'number', minimum: 0, default: 0 },
  },
  additionalProperties: false,
};

const creditorsSchema = {
  type: 'object',
  properties: {
    tradeCreditors: { type: 'number', minimum: 0, default: 0 },
    taxes: { type: 'number', minimum: 0, default: 0 },
    accrualsDeferredIncome: { type: 'number', minimum: 0, default: 0 },
    directorsLoan: { type: 'number', minimum: 0, default: 0 },
    otherCreditors: { type: 'number', minimum: 0, default: 0 },
  },
  additionalProperties: false,
};

const creditorsAfterOneYearSchema = {
  type: 'object',
  properties: {
    loans: { type: 'number', minimum: 0, default: 0 },
    other: { type: 'number', minimum: 0, default: 0 },
  },
  additionalProperties: false,
};

const equitySchema = {
  type: 'object',
  required: ['shareCapital', 'retainedEarnings'],
  properties: {
    shareCapital: { type: 'number', minimum: 0 },
    retainedEarnings: { type: 'number' },
    otherReserves: { type: 'number', default: 0 },
  },
  additionalProperties: false,
};

const balanceSheetDataSchema = {
  type: 'object',
  required: ['assets', 'liabilities', 'equity'],
  properties: {
    assets: {
      type: 'object',
      required: ['currentAssets'],
      properties: {
        fixedAssets: fixedAssetsSchema,
        currentAssets: currentAssetsSchema,
      },
      additionalProperties: false,
    },
    liabilities: {
      type: 'object',
      required: ['creditorsWithinOneYear'],
      properties: {
        creditorsWithinOneYear: creditorsSchema,
        creditorsAfterOneYear: creditorsAfterOneYearSchema,
      },
      additionalProperties: false,
    },
    equity: equitySchema,
  },
  additionalProperties: false,
};

export const balanceSheetSchema = {
  type: 'object',
  required: ['assets', 'liabilities', 'equity'],
  properties: {
    assets: {
      type: 'object',
      required: ['currentAssets'],
      properties: {
        fixedAssets: fixedAssetsSchema,
        currentAssets: currentAssetsSchema,
      },
      additionalProperties: false,
    },
    liabilities: {
      type: 'object',
      required: ['creditorsWithinOneYear'],
      properties: {
        creditorsWithinOneYear: creditorsSchema,
        creditorsAfterOneYear: creditorsAfterOneYearSchema,
      },
      additionalProperties: false,
    },
    equity: equitySchema,
    comparatives: {
      type: 'object',
      properties: {
        prior: balanceSheetDataSchema,
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};