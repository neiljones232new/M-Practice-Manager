export const directorsApprovalSchema = {
  type: 'object',
  required: ['approved'],
  properties: {
    approved: { type: 'boolean' },
    directorName: { type: 'string' },
    approvalDate: { type: 'string', format: 'date' },
    signatureType: {
      type: 'string',
      enum: ['TYPED_NAME', 'UPLOADED_SIGNATURE'],
    },
  },
  additionalProperties: false,
};