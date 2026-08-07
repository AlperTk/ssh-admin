export function successResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }, null, 2) }],
  };
}

export function errorResponse(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: message }) }],
    isError: true,
  };
}
