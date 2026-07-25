export function createMetadataFixture(overrides: Partial<{ fileName: string; absolutePath: string }> = {}) {
  return {
    fileName: "项目方案-v1.docx",
    absolutePath: "C:\\资料\\项目方案-v1.docx",
    ...overrides,
  };
}
