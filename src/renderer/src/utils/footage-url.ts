// Converts an absolute file path to a footage:// URL for use in <video src>.
// An explicit 'localhost' host is required: with standard: true, Chromium parses
// footage:///Users/... as having hostname 'Users', stripping it from the path.
// footage://localhost/Users/... correctly lands the full path in pathname.
export function filePathToFootageUrl(filePath: string): string {
  return `footage://localhost${encodeURI(filePath)}`
}
