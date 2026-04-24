using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using VSMatch.Data.Entities;
using VSMatch.Dtos.Auth;
using VSMatch.Options;

namespace VSMatch.Services.Auth;

public class JwtTokenService : ITokenService
{
    private readonly JwtOptions _jwt;

    public JwtTokenService(IOptions<JwtOptions> jwt) => _jwt = jwt.Value;

    public AuthResponse CreateToken(User user)
    {
        var now = DateTimeOffset.UtcNow;
        var expires = now.AddMinutes(_jwt.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
            new("vk_user_id", user.VkUserId),
        };

        if (!string.IsNullOrWhiteSpace(user.Email))
            claims.Add(new Claim(JwtRegisteredClaimNames.Email, user.Email));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expires.UtcDateTime,
            signingCredentials: creds);

        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
