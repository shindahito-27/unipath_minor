export function validateQuery(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      return response.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      });
    }
    request.validatedQuery = result.data;
    next();
  };
}
