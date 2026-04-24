using VSMatch.Data.Entities;
using VSMatch.Dtos.Auth;

namespace VSMatch.Services.Auth;

public interface ITokenService
{
    AuthResponse CreateToken(User user);
}
