export function validateBody(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return response.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors: result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      });
    }
    request.body = result.data;
    next();
  };
}
