using Microsoft.AspNetCore.Mvc;
using VSMatch.Domain;

namespace VSMatch.Controllers;

public static class ApiErrors
{
    public static ObjectResult ToActionResult(AppException ex) =>
        ex switch
        {
            NotFoundException => new NotFoundObjectResult(Error(ex)),
            ConflictException => new ConflictObjectResult(Error(ex)),
            ForbiddenException => new ObjectResult(Error(ex)) { StatusCode = StatusCodes.Status403Forbidden },
            ValidationException or InvalidMatchStateException => new UnprocessableEntityObjectResult(Error(ex)),
            _ => new BadRequestObjectResult(Error(ex)),
        };

    public static object Error(Exception ex) => new { error = new { message = ex.Message } };
}
