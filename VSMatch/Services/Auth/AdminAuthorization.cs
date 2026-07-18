using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using VSMatch.Data;

namespace VSMatch.Services.Auth;

/// <summary>Требование «пользователь — админ». Используется как [Authorize(Policy = AdminPolicy.Name)].</summary>
public class AdminRequirement : IAuthorizationRequirement { }

public static class AdminPolicy
{
    public const string Name = "Admin";
}

/// <summary>
/// Live-проверка IsAdmin по БД (а не по claim из JWT): снятие адмнских прав
/// действует сразу, не дожидаясь истечения токена.
/// </summary>
public class AdminAuthorizationHandler : AuthorizationHandler<AdminRequirement>
{
    private readonly ICurrentUser _currentUser;
    private readonly AppDbContext _db;

    public AdminAuthorizationHandler(ICurrentUser currentUser, AppDbContext db)
    {
        _currentUser = currentUser;
        _db = db;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true) return;

        var isAdmin = await _db.Users.AsNoTracking()
            .Where(u => u.Id == _currentUser.Id)
            .Select(u => u.IsAdmin)
            .FirstOrDefaultAsync();

        if (isAdmin) context.Succeed(requirement);
    }
}
