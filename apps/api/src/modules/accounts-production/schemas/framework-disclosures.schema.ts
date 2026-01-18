export const frameworkDisclosuresSchema = {
  type: 'object',
  required: ['framework', 'auditExemption', 'includePLInClientPack'],
  properties: {
    framework: {
      type: 'string',
      enum: ['MICRO_FRS105', 'SMALL_FRS102_1A', 'DORMANT', 'SOLE_TRADER', 'INDIVIDUAL'],
    },
    auditExemption: {
      type: 'object',
      required: ['isAuditExempt', 'exemptionStatementKey'],
      properties: {
        isAuditExempt: { type: 'boolean' },
        exemptionStatementKey: {
          type: 'string',
          enum: ['CA2006_S477_SMALL', 'MICRO_ENTITY', 'DORMANT', 'NOT_APPLICABLE'],
        },
      },
      additionalProperties: false,
    },
    includePLInClientPack: { type: 'boolean' },
    includeDirectorsReport: { type: 'boolean' },
    includeAccountantsReport: { type: 'boolean' },
  },
  additionalProperties: false,
};
